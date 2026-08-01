package store

import (
	"context"
	"errors"
	"strings"
	"time"

	"driverlogs/backend/internal/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

const tripSummarySQL = `
SELECT
  t.id, t.user_id, t.vehicle_id, t.name, t.start_odometer, t.end_odometer, t.started_at, t.ended_at,
  GREATEST(0, COALESCE(NULLIF(t.end_odometer, 0), MAX(NULLIF(e.odometer, 0)), t.start_odometer) - t.start_odometer)::int,
  ROUND(COALESCE(SUM(e.amount_mdl), 0), 2),
  ROUND(COALESCE(SUM(e.amount_eur), 0), 2),
  ROUND(COALESCE(SUM(e.amount_usd), 0), 2),
  ROUND(COALESCE(SUM(e.fuel_liters), 0)::numeric, 2),
  COUNT(e.id)::int,
  CASE WHEN COALESCE(SUM(e.fuel_liters), 0) > 0 THEN ROUND((SUM(e.amount_mdl) / SUM(e.fuel_liters))::numeric, 2) ELSE 0 END,
  CASE WHEN COALESCE(NULLIF(t.end_odometer, 0), MAX(NULLIF(e.odometer, 0)), t.start_odometer) > t.start_odometer
    THEN ROUND((COALESCE(SUM(e.amount_mdl), 0) / (COALESCE(NULLIF(t.end_odometer, 0), MAX(NULLIF(e.odometer, 0)), t.start_odometer) - t.start_odometer))::numeric, 2)
    ELSE 0 END
FROM trips t
LEFT JOIN expenses e ON e.user_id=t.user_id AND e.trip_id=t.id AND e.category='Fuel'
`

func (s *PostgresStore) UserTrips(userID, vehicleID string) ([]domain.Trip, error) {
	query := tripSummarySQL + ` WHERE t.user_id=$1`
	args := []any{userID}
	if vehicleID != "" {
		query += ` AND t.vehicle_id=$2`
		args = append(args, vehicleID)
	}
	query += ` GROUP BY t.id ORDER BY (t.ended_at IS NULL) DESC, t.started_at DESC`
	rows, err := s.pool.Query(context.Background(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanRows(rows, scanTrip)
}

func (s *PostgresStore) Trip(userID, id string) (domain.Trip, error) {
	row := s.pool.QueryRow(context.Background(), tripSummarySQL+` WHERE t.user_id=$1 AND t.id=$2 GROUP BY t.id`, userID, id)
	return scanTrip(row)
}

func (s *PostgresStore) CreateTrip(userID string, trip domain.Trip) (domain.Trip, error) {
	vehicle, err := s.Vehicle(userID, trip.VehicleID)
	if err != nil {
		return domain.Trip{}, err
	}
	if trip.StartOdometer <= 0 {
		trip.StartOdometer = vehicle.Odometer
	}
	if vehicle.Odometer > 0 && trip.StartOdometer < vehicle.Odometer {
		return domain.Trip{}, ErrInvalidTripOdometer
	}
	trip.Name = cleanTripName(trip.Name)
	trip.ID, err = newID("trip")
	if err != nil {
		return domain.Trip{}, err
	}
	trip.UserID = userID
	trip.StartedAt = time.Now().UTC()
	_, err = s.pool.Exec(context.Background(), `INSERT INTO trips (id, user_id, vehicle_id, name, start_odometer, started_at) VALUES ($1,$2,$3,$4,$5,$6)`, trip.ID, userID, trip.VehicleID, trip.Name, trip.StartOdometer, trip.StartedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.Trip{}, ErrActiveTrip
		}
		return domain.Trip{}, err
	}
	return s.Trip(userID, trip.ID)
}

func (s *PostgresStore) EndTrip(userID, id string, endOdometer int) (domain.Trip, error) {
	ctx := context.Background()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return domain.Trip{}, err
	}
	defer tx.Rollback(ctx)

	var startOdometer, vehicleOdometer int
	var vehicleID string
	err = tx.QueryRow(ctx, `SELECT t.start_odometer, v.odometer, v.id FROM trips t JOIN vehicles v ON v.user_id=t.user_id AND v.id=t.vehicle_id WHERE t.user_id=$1 AND t.id=$2 AND t.ended_at IS NULL FOR UPDATE OF t`, userID, id).Scan(&startOdometer, &vehicleOdometer, &vehicleID)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Trip{}, ErrNotFound
	}
	if err != nil {
		return domain.Trip{}, err
	}
	if endOdometer <= 0 {
		endOdometer = vehicleOdometer
	}
	if endOdometer < startOdometer {
		return domain.Trip{}, ErrInvalidTripOdometer
	}
	endedAt := time.Now().UTC()
	tag, err := tx.Exec(ctx, `UPDATE trips SET end_odometer=$1, ended_at=$2 WHERE user_id=$3 AND id=$4 AND ended_at IS NULL`, endOdometer, endedAt, userID, id)
	if err != nil {
		return domain.Trip{}, err
	}
	if tag.RowsAffected() == 0 {
		return domain.Trip{}, ErrNotFound
	}
	if _, err := tx.Exec(ctx, `UPDATE vehicles SET odometer_base=GREATEST(odometer_base,$1), odometer=GREATEST(odometer,$1) WHERE user_id=$2 AND id=$3`, endOdometer, userID, vehicleID); err != nil {
		return domain.Trip{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return domain.Trip{}, err
	}
	return s.Trip(userID, id)
}

func (s *PostgresStore) activeTripID(userID, vehicleID string) (string, error) {
	var id string
	err := s.pool.QueryRow(context.Background(), `SELECT id FROM trips WHERE user_id=$1 AND vehicle_id=$2 AND ended_at IS NULL`, userID, vehicleID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return id, err
}

func scanTrip(row rowScanner) (domain.Trip, error) {
	var trip domain.Trip
	err := row.Scan(&trip.ID, &trip.UserID, &trip.VehicleID, &trip.Name, &trip.StartOdometer, &trip.EndOdometer, &trip.StartedAt, &trip.EndedAt, &trip.DistanceKM, &trip.FuelSpendMDL, &trip.FuelSpendEUR, &trip.FuelSpendUSD, &trip.FuelLiters, &trip.FillCount, &trip.AveragePricePerLiterMDL, &trip.CostPerKMMDL)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Trip{}, ErrNotFound
	}
	return trip, err
}

func cleanTripName(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "Trip"
	}
	runes := []rune(value)
	if len(runes) > 80 {
		return string(runes[:80])
	}
	return value
}
