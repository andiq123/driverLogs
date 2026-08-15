package store

import (
	"testing"
	"time"

	"driverlogs/backend/internal/domain"
)

func TestSmartAnomaliesUsesChronologicalBaselinesAndExactExpenseIDs(t *testing.T) {
	expenses := []domain.Expense{
		// Deliberately newest first, matching the repository query order.
		{ID: "duplicate-new", Category: "Parking", AmountMDL: 50, Date: "2026-04-02", CreatedAt: time.Date(2026, 4, 2, 12, 0, 0, 0, time.UTC)},
		{ID: "duplicate-old", Category: "Parking", AmountMDL: 50, Date: "2026-04-02", CreatedAt: time.Date(2026, 4, 2, 10, 0, 0, 0, time.UTC)},
		{ID: "fuel-high", Category: "Fuel", FuelPricePerLiterMDL: 30, Date: "2026-03-01"},
		{ID: "service-high", Category: "Maintenance", AmountMDL: 250, Date: "2026-03-01"},
		{ID: "fuel-mid", Category: "Fuel", FuelPricePerLiterMDL: 21, Date: "2026-02-01"},
		{ID: "service-mid", Category: "Maintenance", AmountMDL: 110, Date: "2026-02-01"},
		{ID: "fuel-old", Category: "Fuel", FuelPricePerLiterMDL: 20, Date: "2026-01-01"},
		{ID: "service-old", Category: "Maintenance", AmountMDL: 100, Date: "2026-01-01"},
	}

	anomalies := smartAnomalies(expenses)
	fuel := assertAnomalyExpenseIDs(t, anomalies, "fuel_price", []string{"fuel-high"})
	service := assertAnomalyExpenseIDs(t, anomalies, "service_cost", []string{"service-high"})
	duplicate := assertAnomalyExpenseIDs(t, anomalies, "duplicate", []string{"duplicate-old", "duplicate-new"})
	if fuel["baseline_value"] != 20.5 || fuel["difference_percent"] != 46.34 || fuel["sample_count"] != 2 {
		t.Fatalf("unexpected fuel explanation metadata: %#v", fuel)
	}
	if service["baseline_value"] != 105.0 || service["difference_percent"] != 138.1 || service["sample_count"] != 2 {
		t.Fatalf("unexpected service explanation metadata: %#v", service)
	}
	if duplicate["reason"] == "" || duplicate["unit"] != "MDL" {
		t.Fatalf("unexpected duplicate explanation metadata: %#v", duplicate)
	}
	for index := 1; index < len(anomalies); index++ {
		previous, _ := anomalies[index-1]["date"].(string)
		current, _ := anomalies[index]["date"].(string)
		if previous < current {
			t.Fatalf("anomalies are not newest first: %#v", anomalies)
		}
	}
}

func assertAnomalyExpenseIDs(t *testing.T, anomalies []map[string]any, kind string, expected []string) map[string]any {
	t.Helper()
	for _, anomaly := range anomalies {
		if anomaly["kind"] != kind {
			continue
		}
		actual, ok := anomaly["expense_ids"].([]string)
		if !ok || len(actual) != len(expected) {
			t.Fatalf("%s expense ids = %#v, want %#v", kind, anomaly["expense_ids"], expected)
		}
		for index := range expected {
			if actual[index] != expected[index] {
				t.Fatalf("%s expense ids = %#v, want %#v", kind, actual, expected)
			}
		}
		return anomaly
	}
	t.Fatalf("missing %s anomaly in %#v", kind, anomalies)
	return nil
}

func TestOilChangeExpensesOnlyIncludesRealOilChanges(t *testing.T) {
	expenses := []domain.Expense{
		{ID: "tires", Category: "Maintenance", ServiceType: "regular_service", Description: "Tires and wheel work", Date: "2026-04-07", Odometer: 201135},
		// Non-empty service_type without the oil key and an incidental "oil" mention
		// must NOT be treated as an oil change (no false triggers from description).
		{ID: "checked-oil", Category: "Maintenance", ServiceType: "filters", Description: "Checked oil level", Date: "2026-04-08", Odometer: 201200},
		{ID: "filters", Category: "Maintenance", ServiceType: "filters", Description: "Filters", Date: "2026-04-10", Odometer: 201400},
		// Legacy row saved before the structured toggle: empty service_type falls back to text.
		{ID: "legacy-oil", Category: "Maintenance", Description: "Oil service", Date: "2026-04-12", Odometer: 201700},
		// Multi-service entry: the oil key is present in the structured set.
		{ID: "mixed-presets", Category: "Maintenance", ServiceType: "filters,oil_change", Description: "Workshop visit", Date: "2026-04-13", Odometer: 201800},
		{ID: "oil", Category: "Maintenance", ServiceType: "oil_change", Description: "Workshop visit", Date: "2026-04-15", Odometer: 202000},
	}

	matches := oilChangeExpenses(expenses)

	if len(matches) != 3 {
		t.Fatalf("expected 3 oil changes, got %d: %#v", len(matches), matches)
	}
	if matches[0].ID != "legacy-oil" || matches[1].ID != "mixed-presets" || matches[2].ID != "oil" {
		t.Fatalf("unexpected oil changes: %#v", matches)
	}
}

func TestFuelConsumptionUsesFullToFullAndIncludesPartialFills(t *testing.T) {
	expenses := []domain.Expense{
		// Deliberately out of order to verify that calculation order never relies
		// on the repository's presentation order.
		{ID: "partial-after", Category: "Fuel", FuelLiters: 5, Odometer: 1600, Date: "2026-04-01"},
		{ID: "closing-full", Category: "Fuel", FuelLiters: 30, FuelFullTank: true, Odometer: 1500, Date: "2026-03-01", Description: "OMV"},
		{ID: "opening-full", Category: "Fuel", FuelLiters: 40, FuelFullTank: true, Odometer: 1000, Date: "2026-01-01", Description: "Petrom"},
		{ID: "partial", Category: "Fuel", FuelLiters: 10, Odometer: 1200, Date: "2026-02-01"},
	}

	average, samples, breakdown := fuelConsumption(expenses)

	if average != 8 || samples != 1 {
		t.Fatalf("consumption = %v with %d samples, want 8 with 1 sample", average, samples)
	}
	if breakdown["method"] != "full_to_full" || breakdown["total_liters"] != 40.0 || breakdown["total_distance_km"] != 500 {
		t.Fatalf("unexpected full-to-full breakdown: %#v", breakdown)
	}
	intervals, ok := breakdown["intervals"].([]map[string]any)
	if !ok || len(intervals) != 1 {
		t.Fatalf("unexpected intervals: %#v", breakdown["intervals"])
	}
	if intervals[0]["liters"] != 40.0 || intervals[0]["fill_count"] != 2 || intervals[0]["valid"] != true {
		t.Fatalf("partial fill was not included correctly: %#v", intervals[0])
	}
	tracking, ok := breakdown["tracking"].(map[string]any)
	if !ok || tracking["distance_km"] != 100 || tracking["liters"] != 5.0 || tracking["fill_count"] != 1 {
		t.Fatalf("unexpected in-progress tracking: %#v", breakdown["tracking"])
	}
}

func TestFuelConsumptionKeepsImplausibleLegacyEstimateVisibleButExcluded(t *testing.T) {
	expenses := []domain.Expense{
		{ID: "old", Category: "Fuel", FuelLiters: 40, Odometer: 1000, Date: "2026-01-01"},
		{ID: "partial", Category: "Fuel", FuelLiters: 2, Odometer: 1500, Date: "2026-02-01"},
	}

	average, samples, breakdown := fuelConsumption(expenses)

	if average != 0 || samples != 0 || breakdown["method"] != "estimated" {
		t.Fatalf("invalid estimate affected learned result: average=%v samples=%d breakdown=%#v", average, samples, breakdown)
	}
	intervals := breakdown["intervals"].([]map[string]any)
	if len(intervals) != 1 || intervals[0]["valid"] != false || intervals[0]["issue"] == "" {
		t.Fatalf("invalid estimate was not explained: %#v", intervals)
	}
}
