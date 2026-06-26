package store

import (
	"sort"
	"strconv"
	"strings"
	"time"

	"driverlogs/backend/internal/domain"
)

func analyticsFrom(expenses []domain.Expense, vehicles []domain.Vehicle, vehicleID string) map[string]any {
	expenses = includedAnalyticsExpenses(expenses)
	var total, fuel, maintenance, insurance float64
	var totalEUR, totalUSD, fuelEUR, fuelUSD, maintenanceEUR, maintenanceUSD, insuranceEUR, insuranceUSD float64
	categoryTotals := map[string]float64{}
	categoryTotalsEUR := map[string]float64{}
	categoryTotalsUSD := map[string]float64{}
	vehicleTotals := map[string]float64{}
	vehicleTotalsEUR := map[string]float64{}
	vehicleTotalsUSD := map[string]float64{}
	for _, expense := range expenses {
		total += expense.AmountMDL
		totalEUR += expense.AmountEUR
		totalUSD += expense.AmountUSD
		categoryTotals[expense.Category] += expense.AmountMDL
		categoryTotalsEUR[expense.Category] += expense.AmountEUR
		categoryTotalsUSD[expense.Category] += expense.AmountUSD
		vehicleTotals[expense.VehicleID] += expense.AmountMDL
		vehicleTotalsEUR[expense.VehicleID] += expense.AmountEUR
		vehicleTotalsUSD[expense.VehicleID] += expense.AmountUSD
		switch expense.Category {
		case "Fuel":
			fuel += expense.AmountMDL
			fuelEUR += expense.AmountEUR
			fuelUSD += expense.AmountUSD
		case "Maintenance", "Repairs":
			maintenance += expense.AmountMDL
			maintenanceEUR += expense.AmountEUR
			maintenanceUSD += expense.AmountUSD
		case "Insurance":
			insurance += expense.AmountMDL
			insuranceEUR += expense.AmountEUR
			insuranceUSD += expense.AmountUSD
		}
	}
	return analyticsPayload(expenses, vehicles, vehicleID, total, totalEUR, totalUSD, fuel, fuelEUR, fuelUSD, maintenance, maintenanceEUR, maintenanceUSD, insurance, insuranceEUR, insuranceUSD, categoryTotals, categoryTotalsEUR, categoryTotalsUSD, vehicleTotals, vehicleTotalsEUR, vehicleTotalsUSD)
}

func includedAnalyticsExpenses(expenses []domain.Expense) []domain.Expense {
	included := make([]domain.Expense, 0, len(expenses))
	for _, expense := range expenses {
		if expense.ExcludeFromAnalytics {
			continue
		}
		included = append(included, expense)
	}
	return included
}

func analyticsPayload(expenses []domain.Expense, vehicles []domain.Vehicle, vehicleID string, total, totalEUR, totalUSD, fuel, fuelEUR, fuelUSD, maintenance, maintenanceEUR, maintenanceUSD, insurance, insuranceEUR, insuranceUSD float64, categoryTotals, categoryTotalsEUR, categoryTotalsUSD, vehicleTotals, vehicleTotalsEUR, vehicleTotalsUSD map[string]float64) map[string]any {
	comparison := make([]map[string]any, 0, len(vehicles))
	for _, vehicle := range vehicles {
		if vehicleID != "" && vehicle.ID != vehicleID {
			continue
		}
		name := vehicle.Nickname
		if name == "" {
			name = vehicle.Make + " " + vehicle.Model
		}
		if name == " " {
			name = vehicle.PlateNumber
		}
		comparison = append(comparison, map[string]any{"vehicle_id": vehicle.ID, "name": name, "amount_mdl": vehicleTotals[vehicle.ID], "amount_eur": vehicleTotalsEUR[vehicle.ID], "amount_usd": vehicleTotalsUSD[vehicle.ID], "entry_count": countVehicleExpenses(expenses, vehicle.ID)})
	}
	categoryBreakdown := make([]map[string]any, 0, len(categoryTotals))
	for category, amount := range categoryTotals {
		categoryBreakdown = append(categoryBreakdown, map[string]any{"name": category, "amount_mdl": amount, "amount_eur": categoryTotalsEUR[category], "amount_usd": categoryTotalsUSD[category]})
	}
	vehicle := selectedVehicle(vehicles, vehicleID)
	return map[string]any{"total_expenses_mdl": total, "total_expenses_eur": totalEUR, "total_expenses_usd": totalUSD, "fuel_mdl": fuel, "fuel_eur": fuelEUR, "fuel_usd": fuelUSD, "maintenance_mdl": maintenance, "maintenance_eur": maintenanceEUR, "maintenance_usd": maintenanceUSD, "insurance_mdl": insurance, "insurance_eur": insuranceEUR, "insurance_usd": insuranceUSD, "cost_per_km_mdl": costPerKM(expenses, total), "expense_count": len(expenses), "category_totals": categoryBreakdown, "vehicle_totals": comparison, "trends": trendsFrom(expenses), "insights": insightsFrom(expenses, vehicle.Odometer, vehicle.OilIntervalKM)}
}

// monthlyTotals sums stored stamped MDL per calendar month. Single source for
// every month-over-month figure (trends, spending, forecast) so they can never
// disagree.
func monthlyTotals(expenses []domain.Expense) map[string]float64 {
	months := map[string]float64{}
	for _, expense := range expenses {
		month := expenseMonth(expense.Date)
		if month == "" {
			continue
		}
		months[month] += expense.AmountMDL
	}
	return months
}

func trendsFrom(expenses []domain.Expense) []map[string]any {
	months := monthlyTotals(expenses)
	keys := make([]string, 0, len(months))
	for month := range months {
		keys = append(keys, month)
	}
	sort.Strings(keys)
	trends := make([]map[string]any, 0, len(keys))
	for _, month := range keys {
		trends = append(trends, map[string]any{"month": month, "amount_mdl": months[month]})
	}
	return trends
}

func insightsFrom(expenses []domain.Expense, currentOdometer, oilIntervalKM int) map[string]any {
	now := time.Now().UTC()
	insights := map[string]any{
		"fuel":        fuelInsight(expenses),
		"maintenance": maintenanceInsight(expenses, currentOdometer, oilIntervalKM),
		"insurance":   yearlyExpiryInsight(expenses, "Insurance"),
		"inspection":  yearlyExpiryInsight(expenses, "Inspection"),
		"distance":    distanceInsight(expenses, now),
		"spending":    spendingInsight(expenses, now),
	}
	insights["reminders"] = smartReminders(insights)
	insights["anomalies"] = smartAnomalies(expenses)
	insights["forecast"] = smartForecast(expenses, now)
	return insights
}

// distanceInsight estimates kilometers driven per calendar month from odometer
// readings. A month's distance is the odometer at the month's last reading minus
// the most recent reading before the month started, so partial logging still
// yields a fair figure. Reports this month vs last month with a trend and a
// short monthly series for a sparkline.
func distanceInsight(expenses []domain.Expense, now time.Time) map[string]any {
	type reading struct {
		date     time.Time
		odo      int
		label    string
		category string
	}
	readings := make([]reading, 0)
	for _, expense := range expenses {
		if expense.Odometer <= 0 {
			continue
		}
		if date, ok := parseDate(expense.Date); ok {
			label := strings.TrimSpace(expense.Description)
			if label == "" {
				label = expense.Category
			}
			readings = append(readings, reading{date, expense.Odometer, label, expense.Category})
		}
	}
	sort.Slice(readings, func(i, j int) bool {
		if readings[i].date.Equal(readings[j].date) {
			return readings[i].odo < readings[j].odo
		}
		return readings[i].date.Before(readings[j].date)
	})
	emptyMonths := []map[string]any{}
	if len(readings) < 2 {
		return map[string]any{"status": "not_enough_data", "this_month_km": 0, "delta_km": 0, "trend": "first", "monthly_average_km": 0, "has_current": false, "months": emptyMonths}
	}
	odoAsOf := func(t time.Time) (int, bool) {
		value := 0
		found := false
		for _, r := range readings {
			if r.date.After(t) {
				break
			}
			value = r.odo
			found = true
		}
		return value, found
	}
	monthDistance := func(monthStart time.Time) (from int, to int, ok bool) {
		before, okBefore := odoAsOf(monthStart.Add(-time.Nanosecond))
		end, okEnd := odoAsOf(monthStart.AddDate(0, 1, 0).Add(-time.Nanosecond))
		if !okBefore || !okEnd || end < before {
			return 0, 0, false
		}
		return before, end, true
	}
	logsInMonth := func(monthStart time.Time) []map[string]any {
		monthEnd := monthStart.AddDate(0, 1, 0).Add(-time.Nanosecond)
		logs := make([]map[string]any, 0)
		for _, r := range readings {
			if r.date.Before(monthStart) || r.date.After(monthEnd) {
				continue
			}
			logs = append(logs, map[string]any{"label": r.label, "odometer": r.odo, "category": r.category})
		}
		return logs
	}
	monthEntry := func(monthStart time.Time) (map[string]any, int, bool) {
		from, to, ok := monthDistance(monthStart)
		if !ok {
			return nil, 0, false
		}
		distance := to - from
		return map[string]any{"month": monthStart.Format("2006-01"), "km": distance, "from_odometer": from, "to_odometer": to, "logs": logsInMonth(monthStart)}, distance, true
	}
	thisStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	lastStart := thisStart.AddDate(0, -1, 0)
	_, thisKM, okThis := monthEntry(thisStart)
	_, lastKM, okLast := monthEntry(lastStart)
	months := make([]map[string]any, 0, 6)
	var sum, count int
	for offset := 5; offset >= 1; offset-- {
		if entry, km, ok := monthEntry(thisStart.AddDate(0, -offset, 0)); ok {
			months = append(months, entry)
			sum += km
			count++
		}
	}
	if entry, _, ok := monthEntry(thisStart); ok {
		months = append(months, entry)
	}
	average := 0
	if count > 0 {
		average = sum / count
	}
	this := 0
	if okThis {
		this = thisKM
	}
	last := 0
	if okLast {
		last = lastKM
	}
	trend := "first"
	delta := 0
	if okLast {
		delta = this - last
		switch {
		case delta > 0:
			trend = "up"
		case delta < 0:
			trend = "down"
		default:
			trend = "flat"
		}
	}
	return map[string]any{"status": "tracked", "this_month_km": this, "delta_km": delta, "trend": trend, "monthly_average_km": average, "has_current": okThis, "months": months}
}

// spendingInsight reports total spend this month vs last, with a trend and a
// short monthly series. Sums stored stamped MDL values only (no recalculation).
func spendingInsight(expenses []domain.Expense, now time.Time) map[string]any {
	thisStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	thisKey := thisStart.Format("2006-01")
	months := map[string]float64{}
	thisCategories := map[string]float64{}
	for _, expense := range expenses {
		month := expenseMonth(expense.Date)
		if month == "" {
			continue
		}
		months[month] += expense.AmountMDL
		if month == thisKey {
			thisCategories[expense.Category] += expense.AmountMDL
		}
	}
	lastKey := thisStart.AddDate(0, -1, 0).Format("2006-01")
	thisMDL := round2(months[thisKey])
	lastMDL := round2(months[lastKey])
	hasPrior := false
	for month := range months {
		if month < thisKey {
			hasPrior = true
			break
		}
	}
	trend := "first"
	delta := 0.0
	if hasPrior {
		delta = round2(thisMDL - lastMDL)
		switch {
		case delta > 0.001:
			trend = "up"
		case delta < -0.001:
			trend = "down"
		default:
			trend = "flat"
		}
	}
	series := make([]map[string]any, 0, 6)
	for offset := 5; offset >= 0; offset-- {
		monthKey := thisStart.AddDate(0, -offset, 0).Format("2006-01")
		if amount, ok := months[monthKey]; ok {
			series = append(series, map[string]any{"month": monthKey, "mdl": round2(amount)})
		}
	}
	categories := make([]map[string]any, 0, len(thisCategories))
	for name, amount := range thisCategories {
		share := 0.0
		if thisMDL > 0 {
			share = round2(amount / thisMDL * 100)
		}
		categories = append(categories, map[string]any{"name": name, "mdl": round2(amount), "share": share})
	}
	sort.Slice(categories, func(i, j int) bool { return numberFromAny(categories[i]["mdl"]) > numberFromAny(categories[j]["mdl"]) })
	return map[string]any{"this_month_mdl": thisMDL, "delta_mdl": delta, "trend": trend, "months": series, "categories": categories}
}

func fuelInsight(expenses []domain.Expense) map[string]any {
	var count, pricedCount int
	var totalAmount float64
	var liters, priceTotal float64
	fuelExpenses := make([]domain.Expense, 0)
	for _, expense := range expenses {
		if expense.Category != "Fuel" {
			continue
		}
		fuelExpenses = append(fuelExpenses, expense)
		count++
		totalAmount += expense.AmountMDL
		liters += expense.FuelLiters
		if expense.FuelPricePerLiterMDL > 0 {
			pricedCount++
			priceTotal += expense.FuelPricePerLiterMDL
		}
	}
	averageFill := 0.0
	if count > 0 {
		averageFill = totalAmount / float64(count)
	}
	averagePrice := 0.0
	if pricedCount > 0 {
		averagePrice = round2(priceTotal / float64(pricedCount))
	}
	consumption, consumptionSamples, breakdown := fuelConsumption(fuelExpenses)
	confidence := "none"
	if consumptionSamples == 1 {
		confidence = "low"
	}
	if consumptionSamples >= 2 {
		confidence = "learned"
	}
	return map[string]any{"entry_count": count, "total_liters": round2(liters), "average_fill_mdl": round2(averageFill), "average_price_per_liter_mdl": averagePrice, "average_consumption_l_per_100km": consumption, "consumption_samples": consumptionSamples, "consumption_confidence": confidence, "consumption_breakdown": breakdown}
}

// fuelConsumption estimates average L/100km from consecutive fuel entries with
// rising odometer readings: total liters refilled divided by total distance.
// Partial fills average out across intervals, so no full-tank flag is needed.
// The returned breakdown lists every interval used so the UI can show the math.
func fuelConsumption(expenses []domain.Expense) (float64, int, map[string]any) {
	sort.Slice(expenses, func(i, j int) bool {
		if expenses[i].Date == expenses[j].Date {
			return expenses[i].CreatedAt.Before(expenses[j].CreatedAt)
		}
		return expenses[i].Date < expenses[j].Date
	})
	intervals := make([]map[string]any, 0)
	var totalLiters float64
	var totalDistance int
	var previous *domain.Expense
	for index := range expenses {
		expense := expenses[index]
		if expense.Odometer <= 0 {
			continue
		}
		if previous != nil && expense.Odometer > previous.Odometer && expense.FuelLiters > 0 {
			distance := expense.Odometer - previous.Odometer
			totalDistance += distance
			totalLiters += expense.FuelLiters
			intervals = append(intervals, map[string]any{
				"from_date":     previous.Date,
				"to_date":       expense.Date,
				"from_odometer": previous.Odometer,
				"to_odometer":   expense.Odometer,
				"distance_km":   distance,
				"liters":             round2(expense.FuelLiters),
				"l_per_100km":        round2(expense.FuelLiters / float64(distance) * 100),
				"price_per_liter_mdl": round2(expense.FuelPricePerLiterMDL),
				"station":            expense.Description,
			})
		}
		previous = &expenses[index]
	}
	if len(intervals) == 0 || totalDistance == 0 {
		return 0, 0, nil
	}
	average := round2(totalLiters / float64(totalDistance) * 100)
	breakdown := map[string]any{
		"intervals":           intervals,
		"total_liters":        round2(totalLiters),
		"total_distance_km":   totalDistance,
		"average_l_per_100km": average,
	}
	return average, len(intervals), breakdown
}

func maintenanceInsight(expenses []domain.Expense, currentOdometer, oilIntervalKM int) map[string]any {
	service := serviceInsight(expenses)
	oilChanges := oilChangeExpenses(expenses)
	service["oil_change"] = oilChangeEstimate(oilChanges, currentOdometer, oilIntervalKM)
	return service
}

func serviceInsight(expenses []domain.Expense) map[string]any {
	var count int
	var total float64
	var lastDate string
	for _, expense := range expenses {
		if expense.Category != "Maintenance" && expense.Category != "Repairs" {
			continue
		}
		count++
		total += expense.AmountMDL
		if expense.Date > lastDate {
			lastDate = expense.Date
		}
	}
	average := 0.0
	if count > 0 {
		average = total / float64(count)
	}
	return map[string]any{"entry_count": count, "total_mdl": total, "average_mdl": average, "last_date": lastDate}
}

func yearlyExpiryInsight(expenses []domain.Expense, category string) map[string]any {
	var lastDate, expiresDate string
	for _, expense := range expenses {
		if expense.Category == category && expense.Date > lastDate {
			lastDate = expense.Date
			expiresDate = expense.ExpiresDate
		}
	}
	if lastDate == "" {
		return map[string]any{"status": "not_logged", "confidence": "none", "interval_days": 365}
	}
	last, ok := parseDate(lastDate)
	if !ok {
		return map[string]any{"status": "not_logged", "confidence": "none", "interval_days": 365}
	}
	expires := last.AddDate(1, 0, 0)
	if parsed, ok := parseDate(expiresDate); ok {
		expires = parsed
	}
	daysLeft := calendarDaysLeft(time.Now().UTC(), expires)
	status := "ok"
	if daysLeft < 0 {
		status = "expired"
	} else if daysLeft <= 30 {
		status = "soon"
	}
	return map[string]any{"status": status, "confidence": "yearly", "last_date": lastDate, "expires_date": expires.Format("2006-01-02"), "days_left": daysLeft, "interval_days": 365}
}

func calendarDaysLeft(now time.Time, expires time.Time) int {
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	expiryDay := time.Date(expires.Year(), expires.Month(), expires.Day(), 0, 0, 0, 0, time.UTC)
	return int(expiryDay.Sub(today).Hours() / 24)
}

func oilChangeExpenses(expenses []domain.Expense) []domain.Expense {
	matches := make([]domain.Expense, 0)
	for _, expense := range expenses {
		if expense.Category != "Maintenance" && expense.Category != "Repairs" {
			continue
		}
		// The service_type set is the source of truth. Description text is only a
		// fallback for legacy rows saved before the structured toggle existed.
		if serviceTypeHasOil(expense.ServiceType) || (strings.TrimSpace(expense.ServiceType) == "" && hasOilChangeText(expense.Description)) {
			matches = append(matches, expense)
		}
	}
	sort.Slice(matches, func(i, j int) bool { return matches[i].Date < matches[j].Date })
	return matches
}

func serviceTypeHasOil(serviceType string) bool {
	for key := range strings.SplitSeq(serviceType, ",") {
		if strings.TrimSpace(strings.ToLower(key)) == "oil_change" {
			return true
		}
	}
	return false
}

func hasOilChangeText(description string) bool {
	text := strings.ToLower(description)
	return strings.Contains(text, "oil change") ||
		strings.Contains(text, "oil service") ||
		strings.Contains(text, "schimb ulei")
}

func oilChangeEstimate(expenses []domain.Expense, currentOdometer, configuredIntervalKM int) map[string]any {
	intervalKM := oilIntervalKM(configuredIntervalKM)
	intervalDays := 365
	if len(expenses) == 0 {
		return map[string]any{"status": "not_enough_data", "confidence": "none", "recommended_interval_km": intervalKM, "interval_days": intervalDays}
	}
	last, ok := parseDate(expenses[len(expenses)-1].Date)
	if !ok {
		return map[string]any{"status": "not_enough_data", "confidence": "none", "recommended_interval_km": intervalKM, "interval_days": intervalDays}
	}
	confidence := "low"
	if len(expenses) >= 2 {
		var totalDays, intervals int
		var totalKM, kmIntervals int
		for index := 1; index < len(expenses); index++ {
			previous, previousOK := parseDate(expenses[index-1].Date)
			current, currentOK := parseDate(expenses[index].Date)
			if previousOK && currentOK {
				totalDays += int(current.Sub(previous).Hours() / 24)
				intervals++
			}
			if expenses[index-1].Odometer > 0 && expenses[index].Odometer > expenses[index-1].Odometer {
				totalKM += expenses[index].Odometer - expenses[index-1].Odometer
				kmIntervals++
			}
		}
		if intervals > 0 {
			intervalDays = max(60, totalDays/intervals)
			confidence = "learned"
		}
		if kmIntervals > 0 {
			intervalKM = clamp(totalKM/kmIntervals, 5000, 20000)
			confidence = "learned"
		}
	}
	next := last.AddDate(0, 0, intervalDays)
	lastOdometer := expenses[len(expenses)-1].Odometer
	nextOdometer := 0
	if lastOdometer > 0 {
		nextOdometer = lastOdometer + intervalKM
	}
	remainingKM := 0
	if nextOdometer > 0 && currentOdometer > 0 {
		remainingKM = max(0, nextOdometer-currentOdometer)
	}
	return map[string]any{"status": "estimated", "last_date": expenses[len(expenses)-1].Date, "next_date": next.Format("2006-01-02"), "last_odometer": lastOdometer, "next_odometer": nextOdometer, "remaining_km": remainingKM, "interval_days": intervalDays, "recommended_interval_km": intervalKM, "confidence": confidence}
}

func costPerKM(expenses []domain.Expense, total float64) float64 {
	minOdometer, maxOdometer := 0, 0
	for _, expense := range expenses {
		if expense.Odometer <= 0 {
			continue
		}
		if minOdometer == 0 || expense.Odometer < minOdometer {
			minOdometer = expense.Odometer
		}
		if expense.Odometer > maxOdometer {
			maxOdometer = expense.Odometer
		}
	}
	if minOdometer == 0 || maxOdometer <= minOdometer {
		return 0
	}
	return round2(total / float64(maxOdometer-minOdometer))
}

func smartReminders(insights map[string]any) []map[string]any {
	reminders := make([]map[string]any, 0)
	addExpiryReminder := func(key, title, category string) {
		insight, _ := insights[key].(map[string]any)
		status, _ := insight["status"].(string)
		if status != "soon" && status != "expired" {
			return
		}
		expires, _ := insight["expires_date"].(string)
		reminders = append(reminders, map[string]any{"kind": status, "title": title, "category": category, "date": expires})
	}
	addExpiryReminder("insurance", "Insurance renewal", "Insurance")
	addExpiryReminder("inspection", "ITP renewal", "Inspection")
	maintenance, _ := insights["maintenance"].(map[string]any)
	oil, _ := maintenance["oil_change"].(map[string]any)
	if oil != nil {
		remaining, _ := oil["remaining_km"].(int)
		next, _ := oil["next_odometer"].(int)
		if next > 0 && remaining <= 1000 {
			kind := "soon"
			if remaining <= 0 {
				kind = "expired"
			}
			reminders = append(reminders, map[string]any{"kind": kind, "title": "Oil change", "category": "Maintenance", "odometer": next})
		}
	}
	return reminders
}

func smartAnomalies(expenses []domain.Expense) []map[string]any {
	anomalies := make([]map[string]any, 0)
	fuelPrices := make([]float64, 0)
	serviceCosts := make([]float64, 0)
	seen := map[string]bool{}
	for _, expense := range expenses {
		key := expense.Category + "|" + expense.Date + "|" + strconv.FormatFloat(round2(expense.AmountMDL), 'f', 2, 64)
		if seen[key] {
			anomalies = append(anomalies, map[string]any{"kind": "duplicate", "title": "Possible duplicate expense", "category": expense.Category, "date": expense.Date})
		}
		seen[key] = true
		if expense.Category == "Fuel" && expense.FuelPricePerLiterMDL > 0 {
			if baseline := average(fuelPrices); baseline > 0 && expense.FuelPricePerLiterMDL > baseline*1.18 {
				anomalies = append(anomalies, map[string]any{"kind": "fuel_price", "title": "Fuel price looks high", "value": round2(expense.FuelPricePerLiterMDL), "date": expense.Date})
			}
			fuelPrices = append(fuelPrices, expense.FuelPricePerLiterMDL)
		}
		if expense.Category == "Maintenance" {
			if baseline := average(serviceCosts); baseline > 0 && expense.AmountMDL > baseline*1.75 {
				anomalies = append(anomalies, map[string]any{"kind": "service_cost", "title": "Service cost is above usual", "value": round2(expense.AmountMDL), "date": expense.Date})
			}
			serviceCosts = append(serviceCosts, expense.AmountMDL)
		}
	}
	return anomalies
}

// smartForecast projects upcoming spend from the average of completed months.
// The current month is excluded because it is still partial and would drag the
// estimate down — same rule the distance and spending averages follow.
func smartForecast(expenses []domain.Expense, now time.Time) map[string]any {
	thisKey := now.Format("2006-01")
	var total float64
	var count int
	for month, amount := range monthlyTotals(expenses) {
		if month == thisKey {
			continue
		}
		total += amount
		count++
	}
	monthly := 0.0
	if count > 0 {
		monthly = total / float64(count)
	}
	return map[string]any{"next_30_days_mdl": round2(monthly), "next_90_days_mdl": round2(monthly * 3)}
}

func average(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	var total float64
	for _, value := range values {
		total += value
	}
	return total / float64(len(values))
}

func numberFromAny(value any) float64 {
	switch typed := value.(type) {
	case float64:
		return typed
	case int:
		return float64(typed)
	default:
		return 0
	}
}

func selectedVehicle(vehicles []domain.Vehicle, vehicleID string) domain.Vehicle {
	for _, vehicle := range vehicles {
		if vehicle.ID == vehicleID {
			return vehicle
		}
	}
	return domain.Vehicle{}
}

func expenseMonth(date string) string {
	if len(date) < 7 {
		return ""
	}
	return date[:7]
}

func parseDate(value string) (time.Time, bool) {
	date, err := time.Parse("2006-01-02", value)
	return date, err == nil
}

func round2(value float64) float64 {
	return float64(int(value*100+0.5)) / 100
}

func clamp(value, minimum, maximum int) int {
	return min(max(value, minimum), maximum)
}
