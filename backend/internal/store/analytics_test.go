package store

import (
	"testing"

	"driverlogs/backend/internal/domain"
)

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
