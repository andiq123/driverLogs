package store

import (
	"sort"
	"strings"
	"time"

	"driverlogs/backend/internal/domain"
)

func analyticsFrom(expenses []domain.Expense, vehicles []domain.Vehicle, vehicleID string) map[string]any {
	var total, fuel, maintenance, insurance int
	var totalEUR, totalUSD, fuelEUR, fuelUSD, maintenanceEUR, maintenanceUSD, insuranceEUR, insuranceUSD int
	categoryTotals := map[string]int{}
	categoryTotalsEUR := map[string]int{}
	categoryTotalsUSD := map[string]int{}
	vehicleTotals := map[string]int{}
	vehicleTotalsEUR := map[string]int{}
	vehicleTotalsUSD := map[string]int{}
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

func analyticsPayload(expenses []domain.Expense, vehicles []domain.Vehicle, vehicleID string, total, totalEUR, totalUSD, fuel, fuelEUR, fuelUSD, maintenance, maintenanceEUR, maintenanceUSD, insurance, insuranceEUR, insuranceUSD int, categoryTotals, categoryTotalsEUR, categoryTotalsUSD, vehicleTotals, vehicleTotalsEUR, vehicleTotalsUSD map[string]int) map[string]any {
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
	return map[string]any{"total_expenses_mdl": total, "total_expenses_eur": totalEUR, "total_expenses_usd": totalUSD, "fuel_mdl": fuel, "fuel_eur": fuelEUR, "fuel_usd": fuelUSD, "maintenance_mdl": maintenance, "maintenance_eur": maintenanceEUR, "maintenance_usd": maintenanceUSD, "insurance_mdl": insurance, "insurance_eur": insuranceEUR, "insurance_usd": insuranceUSD, "cost_per_km_mdl": 0, "expense_count": len(expenses), "category_totals": categoryBreakdown, "vehicle_totals": comparison, "trends": trendsFrom(expenses), "insights": insightsFrom(expenses, currentOdometer(vehicles, vehicleID))}
}

func trendsFrom(expenses []domain.Expense) []map[string]any {
	months := map[string]int{}
	for _, expense := range expenses {
		month := expenseMonth(expense.Date)
		if month == "" {
			continue
		}
		months[month] += expense.AmountMDL
	}
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

func insightsFrom(expenses []domain.Expense, currentOdometer int) map[string]any {
	return map[string]any{
		"fuel":        fuelInsight(expenses),
		"maintenance": maintenanceInsight(expenses, currentOdometer),
	}
}

func fuelInsight(expenses []domain.Expense) map[string]any {
	var count, pricedCount, totalAmount int
	var liters, priceTotal float64
	for _, expense := range expenses {
		if expense.Category != "Fuel" {
			continue
		}
		count++
		totalAmount += expense.AmountMDL
		liters += expense.FuelLiters
		if expense.FuelPricePerLiterMDL > 0 {
			pricedCount++
			priceTotal += expense.FuelPricePerLiterMDL
		}
	}
	averageFill := 0
	if count > 0 {
		averageFill = totalAmount / count
	}
	averagePrice := 0.0
	if pricedCount > 0 {
		averagePrice = round2(priceTotal / float64(pricedCount))
	}
	return map[string]any{"entry_count": count, "total_liters": round2(liters), "average_fill_mdl": averageFill, "average_price_per_liter_mdl": averagePrice}
}

func maintenanceInsight(expenses []domain.Expense, currentOdometer int) map[string]any {
	service := serviceInsight(expenses)
	oilChanges := oilChangeExpenses(expenses)
	service["oil_change"] = oilChangeEstimate(oilChanges, currentOdometer)
	return service
}

func serviceInsight(expenses []domain.Expense) map[string]any {
	var count, total int
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
	average := 0
	if count > 0 {
		average = total / count
	}
	return map[string]any{"entry_count": count, "total_mdl": total, "average_mdl": average, "last_date": lastDate}
}

func categoryInsight(expenses []domain.Expense, category string) map[string]any {
	var count, total int
	var lastDate string
	for _, expense := range expenses {
		if expense.Category != category {
			continue
		}
		count++
		total += expense.AmountMDL
		if expense.Date > lastDate {
			lastDate = expense.Date
		}
	}
	average := 0
	if count > 0 {
		average = total / count
	}
	return map[string]any{"entry_count": count, "total_mdl": total, "average_mdl": average, "last_date": lastDate}
}

func oilChangeExpenses(expenses []domain.Expense) []domain.Expense {
	matches := make([]domain.Expense, 0)
	for _, expense := range expenses {
		if expense.Category != "Maintenance" && expense.Category != "Repairs" {
			continue
		}
		description := strings.ToLower(expense.Description)
		if strings.Contains(description, "oil") || strings.Contains(description, "ulei") {
			matches = append(matches, expense)
		}
	}
	sort.Slice(matches, func(i, j int) bool { return matches[i].Date < matches[j].Date })
	return matches
}

func oilChangeEstimate(expenses []domain.Expense, currentOdometer int) map[string]any {
	if len(expenses) == 0 {
		return map[string]any{"status": "not_enough_data", "confidence": "none", "recommended_interval_km": 10000}
	}
	last, ok := parseDate(expenses[len(expenses)-1].Date)
	if !ok {
		return map[string]any{"status": "not_enough_data", "confidence": "none", "recommended_interval_km": 10000}
	}
	intervalDays := 180
	intervalKM := 10000
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

func currentOdometer(vehicles []domain.Vehicle, vehicleID string) int {
	for _, vehicle := range vehicles {
		if vehicle.ID == vehicleID {
			return vehicle.Odometer
		}
	}
	return 0
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
