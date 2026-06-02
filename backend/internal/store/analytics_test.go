package store

import (
	"testing"

	"driverlogs/backend/internal/domain"
)

func TestOilChangeExpensesOnlyIncludesRealOilChanges(t *testing.T) {
	expenses := []domain.Expense{
		{ID: "tires", Category: "Maintenance", ServiceType: "regular_service", Description: "Tires and wheel work", Date: "2026-04-07", Odometer: 201135},
		{ID: "filters", Category: "Maintenance", ServiceType: "filters", Description: "Filters", Date: "2026-04-10", Odometer: 201400},
		{ID: "legacy-oil", Category: "Maintenance", Description: "Oil service", Date: "2026-04-12", Odometer: 201700},
		{ID: "oil", Category: "Maintenance", ServiceType: "oil_change", Description: "Workshop visit", Date: "2026-04-15", Odometer: 202000},
	}

	matches := oilChangeExpenses(expenses)

	if len(matches) != 2 {
		t.Fatalf("expected 2 oil changes, got %d: %#v", len(matches), matches)
	}
	if matches[0].ID != "legacy-oil" || matches[1].ID != "oil" {
		t.Fatalf("unexpected oil changes: %#v", matches)
	}
}
