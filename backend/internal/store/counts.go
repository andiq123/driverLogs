package store

import "driverlogs/backend/internal/domain"

func countVehicleExpenses(expenses []domain.Expense, vehicleID string) int {
	var count int
	for _, expense := range expenses {
		if expense.VehicleID == vehicleID {
			count++
		}
	}
	return count
}
