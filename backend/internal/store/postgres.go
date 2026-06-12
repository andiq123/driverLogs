package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"driverlogs/backend/internal/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type PostgresStore struct {
	pool *pgxpool.Pool
}

func NewPostgresStore(ctx context.Context, pool *pgxpool.Pool) (*PostgresStore, error) {
	store := &PostgresStore{pool: pool}
	if err := store.migrate(ctx); err != nil {
		return nil, err
	}
	return store, nil
}

func (s *PostgresStore) migrate(ctx context.Context) error {
	_, err := s.pool.Exec(ctx, `
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  login_id_hash bytea NOT NULL,
  name text NOT NULL DEFAULT '',
  default_currency text NOT NULL DEFAULT 'MDL',
  country text NOT NULL DEFAULT 'MD',
  compare_country text NOT NULL DEFAULT 'RO',
  created_at timestamptz NOT NULL,
  last_activity_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS vehicles (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plate_number text NOT NULL,
  nickname text NOT NULL DEFAULT '',
  make text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  year int NOT NULL DEFAULT 0,
  engine_type text NOT NULL DEFAULT '',
  vin text NOT NULL DEFAULT '',
  preferred_fuel_type text NOT NULL DEFAULT 'Super 95',
  oil_interval_km int NOT NULL DEFAULT 10000,
  purchase_price numeric NOT NULL DEFAULT 0,
  purchase_currency text NOT NULL DEFAULT '',
  purchase_date text NOT NULL DEFAULT '',
  odometer int NOT NULL DEFAULT 0,
  odometer_base int NOT NULL DEFAULT 0,
  image_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS expenses (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id text NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  category text NOT NULL,
  amount_base numeric NOT NULL DEFAULT 0,
  base_currency text NOT NULL DEFAULT '',
  amount_mdl numeric NOT NULL DEFAULT 0,
  amount_eur numeric NOT NULL DEFAULT 0,
  amount_usd numeric NOT NULL DEFAULT 0,
  exchange_rate_eur double precision NOT NULL DEFAULT 0,
  exchange_rate_usd double precision NOT NULL DEFAULT 0,
  exchange_rate_date text NOT NULL DEFAULT '',
  exchange_rate_source text NOT NULL DEFAULT '',
  fuel_liters double precision NOT NULL DEFAULT 0,
  fuel_price_currency text NOT NULL DEFAULT '',
  fuel_price_per_liter_base double precision NOT NULL DEFAULT 0,
  fuel_price_per_liter_mdl double precision NOT NULL DEFAULT 0,
  fuel_type text NOT NULL DEFAULT '',
  odometer int NOT NULL DEFAULT 0,
  service_type text NOT NULL DEFAULT '',
  expires_date text NOT NULL DEFAULT '',
  date text NOT NULL,
  description text NOT NULL DEFAULT '',
  exclude_from_analytics boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS expense_attachments (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expense_id text NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  object_key text NOT NULL,
  file_name text NOT NULL,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS document_attachments (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_type text NOT NULL,
  owner_id text NOT NULL,
  kind text NOT NULL,
  object_key text NOT NULL,
  file_name text NOT NULL,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL
);`)
	if err != nil {
		return fmt.Errorf("migrate postgres store: %w", err)
	}
	if _, err := s.pool.Exec(ctx, `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS odometer int NOT NULL DEFAULT 0`); err != nil {
		return fmt.Errorf("migrate expense odometer: %w", err)
	}
	for _, statement := range []string{
		`ALTER TABLE expenses DROP COLUMN IF EXISTS fuel_full_tank`,
		`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT ''`,
		`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expires_date text NOT NULL DEFAULT ''`,
		`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS exclude_from_analytics boolean NOT NULL DEFAULT false`,
	} {
		if _, err := s.pool.Exec(ctx, statement); err != nil {
			return fmt.Errorf("migrate expense smart fields: %w", err)
		}
	}
	for _, statement := range []string{
		`UPDATE expenses SET expires_date=(date::date + INTERVAL '1 year')::date::text WHERE category IN ('Insurance', 'Inspection') AND expires_date='' AND date ~ '^\d{4}-\d{2}-\d{2}$'`,
		`UPDATE expenses SET service_type='oil_change' WHERE category IN ('Maintenance', 'Repairs') AND service_type='' AND (lower(description) LIKE '%oil%' OR lower(description) LIKE '%ulei%')`,
		`UPDATE expenses SET service_type='filters' WHERE category IN ('Maintenance', 'Repairs') AND service_type='' AND lower(description) LIKE '%filter%'`,
		`UPDATE expenses SET service_type='alignment' WHERE category IN ('Maintenance', 'Repairs') AND service_type='' AND lower(description) LIKE '%alignment%'`,
		`UPDATE expenses SET service_type='regular_service' WHERE category IN ('Maintenance', 'Repairs') AND service_type='' AND description<>''`,
		`UPDATE expenses SET service_type='filters' WHERE category IN ('Maintenance', 'Repairs') AND service_type='oil_change' AND lower(description) NOT LIKE '%oil%' AND lower(description) NOT LIKE '%ulei%' AND lower(description) LIKE '%filter%'`,
		`UPDATE expenses SET service_type='alignment' WHERE category IN ('Maintenance', 'Repairs') AND service_type='oil_change' AND lower(description) NOT LIKE '%oil%' AND lower(description) NOT LIKE '%ulei%' AND lower(description) LIKE '%alignment%'`,
		`UPDATE expenses SET service_type='regular_service' WHERE category IN ('Maintenance', 'Repairs') AND service_type='oil_change' AND lower(description) NOT LIKE '%oil%' AND lower(description) NOT LIKE '%ulei%'`,
	} {
		if _, err := s.pool.Exec(ctx, statement); err != nil {
			return fmt.Errorf("backfill expense smart fields: %w", err)
		}
	}
	for _, statement := range []string{
		`ALTER TABLE vehicles ALTER COLUMN purchase_price TYPE numeric USING purchase_price::numeric`,
		`ALTER TABLE expenses ALTER COLUMN amount_base TYPE numeric USING amount_base::numeric`,
		`ALTER TABLE expenses ALTER COLUMN amount_mdl TYPE numeric USING amount_mdl::numeric`,
		`ALTER TABLE expenses ALTER COLUMN amount_eur TYPE numeric USING amount_eur::numeric`,
		`ALTER TABLE expenses ALTER COLUMN amount_usd TYPE numeric USING amount_usd::numeric`,
	} {
		if _, err := s.pool.Exec(ctx, statement); err != nil {
			return fmt.Errorf("migrate decimal money columns: %w", err)
		}
	}
	if _, err := s.pool.Exec(ctx, `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS preferred_fuel_type text NOT NULL DEFAULT 'Super 95'`); err != nil {
		return fmt.Errorf("migrate vehicle preferred fuel type: %w", err)
	}
	if _, err := s.pool.Exec(ctx, `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS oil_interval_km int NOT NULL DEFAULT 10000`); err != nil {
		return fmt.Errorf("migrate vehicle oil interval: %w", err)
	}
	if _, err := s.pool.Exec(ctx, `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS odometer_base int NOT NULL DEFAULT 0`); err != nil {
		return fmt.Errorf("migrate vehicle base odometer: %w", err)
	}
	if _, err := s.pool.Exec(ctx, `
UPDATE vehicles
SET odometer_base = CASE
  WHEN odometer_base > 0 THEN odometer_base
  WHEN EXISTS (SELECT 1 FROM expenses WHERE expenses.user_id=vehicles.user_id AND expenses.vehicle_id=vehicles.id AND expenses.odometer > 0)
    THEN LEAST(vehicles.odometer, (SELECT MIN(expenses.odometer) FROM expenses WHERE expenses.user_id=vehicles.user_id AND expenses.vehicle_id=vehicles.id AND expenses.odometer > 0))
  ELSE vehicles.odometer
END`); err != nil {
		return fmt.Errorf("backfill vehicle base odometer: %w", err)
	}
	if _, err := s.pool.Exec(ctx, `
UPDATE vehicles
SET odometer = GREATEST(
  odometer_base,
  COALESCE((SELECT MAX(expenses.odometer) FROM expenses WHERE expenses.user_id=vehicles.user_id AND expenses.vehicle_id=vehicles.id AND expenses.odometer > 0), 0)
)`); err != nil {
		return fmt.Errorf("recalculate vehicle odometers: %w", err)
	}
	if _, err := s.pool.Exec(ctx, `ALTER TABLE users ADD COLUMN IF NOT EXISTS compare_country text NOT NULL DEFAULT 'RO'`); err != nil {
		return fmt.Errorf("migrate user compare country: %w", err)
	}
	return nil
}

func (s *PostgresStore) UserVehicles(userID string) ([]domain.Vehicle, error) {
	rows, err := s.pool.Query(context.Background(), vehicleSelectSQL()+` WHERE user_id=$1 ORDER BY created_at`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	vehicles, err := scanVehicles(rows)
	if err != nil {
		return nil, err
	}
	return s.withVehicleDocumentSummaries(userID, vehicles)
}

func (s *PostgresStore) withVehicleDocumentSummaries(userID string, vehicles []domain.Vehicle) ([]domain.Vehicle, error) {
	if len(vehicles) == 0 {
		return vehicles, nil
	}
	args := []any{userID, "vehicle"}
	placeholders := make([]string, 0, len(vehicles))
	indexByVehicleID := make(map[string]int, len(vehicles))
	for index, vehicle := range vehicles {
		args = append(args, vehicle.ID)
		placeholders = append(placeholders, fmt.Sprintf("$%d", len(args)))
		indexByVehicleID[vehicle.ID] = index
	}
	rows, err := s.pool.Query(context.Background(), documentSelectSQL()+` WHERE user_id=$1 AND owner_type=$2 AND owner_id IN (`+strings.Join(placeholders, ",")+`) ORDER BY owner_id, created_at DESC`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		document, err := scanDocument(rows)
		if err != nil {
			return nil, err
		}
		index, ok := indexByVehicleID[document.OwnerID]
		if !ok {
			continue
		}
		vehicles[index].DocumentCount++
		if vehicles[index].LatestDocument == nil {
			latest := document
			vehicles[index].LatestDocument = &latest
		}
	}
	return vehicles, rows.Err()
}

func (s *PostgresStore) Vehicle(userID, id string) (domain.Vehicle, error) {
	row := s.pool.QueryRow(context.Background(), vehicleSelectSQL()+` WHERE user_id=$1 AND id=$2`, userID, id)
	return scanVehicle(row)
}

func (s *PostgresStore) CreateVehicle(userID string, vehicle domain.Vehicle) (domain.Vehicle, error) {
	vehicles, err := s.UserVehicles(userID)
	if err != nil {
		return domain.Vehicle{}, err
	}
	if len(vehicles) >= 4 {
		return domain.Vehicle{}, ErrVehicleLimit
	}
	id, err := newID("veh")
	if err != nil {
		return domain.Vehicle{}, err
	}
	vehicle.ID = id
	vehicle.UserID = userID
	vehicle.CreatedAt = time.Now().UTC()
	if vehicle.PreferredFuelType == "" {
		vehicle.PreferredFuelType = "Super 95"
	}
	vehicle.OilIntervalKM = vehicleOilIntervalKM(vehicle)
	vehicle.OdometerBase = vehicle.Odometer
	_, err = s.pool.Exec(context.Background(), `INSERT INTO vehicles (id, user_id, plate_number, nickname, make, model, year, engine_type, vin, preferred_fuel_type, oil_interval_km, purchase_price, purchase_currency, purchase_date, odometer, odometer_base, image_url, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
		vehicle.ID, vehicle.UserID, vehicle.PlateNumber, vehicle.Nickname, vehicle.Make, vehicle.Model, vehicle.Year, vehicle.EngineType, vehicle.VIN, vehicle.PreferredFuelType, vehicle.OilIntervalKM, vehicle.PurchasePrice, vehicle.PurchaseCurrency, vehicle.PurchaseDate, vehicle.Odometer, vehicle.OdometerBase, vehicle.ImageURL, vehicle.CreatedAt)
	if err != nil {
		return domain.Vehicle{}, err
	}
	return vehicle, nil
}

func (s *PostgresStore) UpdateVehicle(userID, id string, vehicle domain.Vehicle) (domain.Vehicle, error) {
	row := s.pool.QueryRow(context.Background(), `
UPDATE vehicles
SET plate_number=$1, nickname=$2, make=$3, model=$4, year=$5, engine_type=$6, vin=$7, preferred_fuel_type=$8, oil_interval_km=$9, purchase_price=$10, purchase_currency=$11, purchase_date=$12, odometer_base=$13, odometer=GREATEST($13, COALESCE((SELECT MAX(odometer) FROM expenses WHERE user_id=$15 AND vehicle_id=$16 AND odometer > 0), 0)), image_url=$14
WHERE user_id=$15 AND id=$16
RETURNING id, user_id, plate_number, nickname, make, model, year, engine_type, vin, preferred_fuel_type, oil_interval_km, purchase_price, purchase_currency, purchase_date, odometer, odometer_base, image_url, created_at`,
		vehicle.PlateNumber, vehicle.Nickname, vehicle.Make, vehicle.Model, vehicle.Year, vehicle.EngineType, vehicle.VIN, preferredFuelType(vehicle.PreferredFuelType), vehicleOilIntervalKM(vehicle), vehicle.PurchasePrice, vehicle.PurchaseCurrency, vehicle.PurchaseDate, vehicle.Odometer, vehicle.ImageURL, userID, id)
	return scanVehicle(row)
}

func preferredFuelType(value string) string {
	if value == "" {
		return "Super 95"
	}
	return value
}

func vehicleOilIntervalKM(vehicle domain.Vehicle) int {
	if vehicle.OilIntervalKM <= 0 {
		return inferredOilIntervalKM(vehicle.PreferredFuelType, vehicle.EngineType)
	}
	return oilIntervalKM(vehicle.OilIntervalKM)
}

func oilIntervalKM(value int) int {
	if value <= 0 {
		return 10000
	}
	return clamp(value, 5000, 30000)
}

func inferredOilIntervalKM(fuelType, engineType string) int {
	combined := strings.ToLower(strings.TrimSpace(fuelType + " " + engineType))
	switch {
	case strings.Contains(combined, "diesel"):
		return 10000
	case strings.Contains(combined, "lpg"), strings.Contains(combined, "gpl"):
		return 10000
	case strings.Contains(combined, "hybrid"):
		return 12000
	case strings.Contains(combined, "petrol"), strings.Contains(combined, "gasoline"), strings.Contains(combined, "super 95"):
		return 12000
	default:
		return 10000
	}
}

func (s *PostgresStore) DeleteVehicle(userID, id string) error {
	tag, err := s.pool.Exec(context.Background(), `DELETE FROM vehicles WHERE user_id=$1 AND id=$2`, userID, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) UserExpenses(userID, vehicleID string) ([]domain.Expense, error) {
	query := expenseSelectSQL() + ` WHERE user_id=$1`
	args := []any{userID}
	if vehicleID != "" {
		query += ` AND vehicle_id=$2`
		args = append(args, vehicleID)
	}
	query += ` ORDER BY date DESC, created_at DESC`
	rows, err := s.pool.Query(context.Background(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	expenses, err := scanExpenses(rows)
	if err != nil {
		return nil, err
	}
	return s.withAttachmentSummaries(userID, expenses)
}

func (s *PostgresStore) Expense(userID, id string) (domain.Expense, error) {
	row := s.pool.QueryRow(context.Background(), expenseSelectSQL()+` WHERE user_id=$1 AND id=$2`, userID, id)
	expense, err := scanExpense(row)
	if err != nil {
		return domain.Expense{}, err
	}
	expenses, err := s.withAttachmentSummaries(userID, []domain.Expense{expense})
	if err != nil {
		return domain.Expense{}, err
	}
	return expenses[0], nil
}

func (s *PostgresStore) withAttachmentSummaries(userID string, expenses []domain.Expense) ([]domain.Expense, error) {
	if len(expenses) == 0 {
		return expenses, nil
	}
	args := []any{userID}
	placeholders := make([]string, 0, len(expenses))
	indexByExpenseID := make(map[string]int, len(expenses))
	for index, expense := range expenses {
		args = append(args, expense.ID)
		placeholders = append(placeholders, fmt.Sprintf("$%d", len(args)))
		indexByExpenseID[expense.ID] = index
	}
	rows, err := s.pool.Query(context.Background(), attachmentSelectSQL()+` WHERE user_id=$1 AND expense_id IN (`+strings.Join(placeholders, ",")+`) ORDER BY expense_id, created_at DESC`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		attachment, err := scanAttachment(rows)
		if err != nil {
			return nil, err
		}
		index, ok := indexByExpenseID[attachment.ExpenseID]
		if !ok {
			continue
		}
		expenses[index].AttachmentCount++
		if expenses[index].LatestAttachment == nil {
			latest := attachment
			expenses[index].LatestAttachment = &latest
		}
	}
	return expenses, rows.Err()
}

func (s *PostgresStore) CreateExpense(userID string, expense domain.Expense) (domain.Expense, error) {
	if _, err := s.Vehicle(userID, expense.VehicleID); err != nil {
		return domain.Expense{}, err
	}
	id, err := newID("exp")
	if err != nil {
		return domain.Expense{}, err
	}
	expense.ID = id
	expense.UserID = userID
	expense.CreatedAt = time.Now().UTC()
	_, err = s.pool.Exec(context.Background(), `INSERT INTO expenses (id, user_id, vehicle_id, category, amount_base, base_currency, amount_mdl, amount_eur, amount_usd, exchange_rate_eur, exchange_rate_usd, exchange_rate_date, exchange_rate_source, fuel_liters, fuel_price_currency, fuel_price_per_liter_base, fuel_price_per_liter_mdl, fuel_type, odometer, service_type, expires_date, date, description, exclude_from_analytics, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
		expense.ID, expense.UserID, expense.VehicleID, expense.Category, expense.AmountBase, expense.BaseCurrency, expense.AmountMDL, expense.AmountEUR, expense.AmountUSD, expense.ExchangeRateEUR, expense.ExchangeRateUSD, expense.ExchangeRateDate, expense.ExchangeRateSource, expense.FuelLiters, expense.FuelPriceCurrency, expense.FuelPricePerLiterBase, expense.FuelPricePerLiterMDL, expense.FuelType, expense.Odometer, expense.ServiceType, expense.ExpiresDate, expense.Date, expense.Description, expense.ExcludeFromAnalytics, expense.CreatedAt)
	if err != nil {
		return domain.Expense{}, err
	}
	_ = s.refreshVehicleOdometer(userID, expense.VehicleID)
	return expense, nil
}

func (s *PostgresStore) UpdateExpense(userID, id string, expense domain.Expense) (domain.Expense, error) {
	if _, err := s.Vehicle(userID, expense.VehicleID); err != nil {
		return domain.Expense{}, err
	}
	var previousVehicleID string
	if err := s.pool.QueryRow(context.Background(), `SELECT vehicle_id FROM expenses WHERE user_id=$1 AND id=$2`, userID, id).Scan(&previousVehicleID); errors.Is(err, pgx.ErrNoRows) {
		return domain.Expense{}, ErrNotFound
	} else if err != nil {
		return domain.Expense{}, err
	}
	row := s.pool.QueryRow(context.Background(), `
UPDATE expenses
SET vehicle_id=$1, category=$2, amount_base=$3, base_currency=$4, amount_mdl=$5, amount_eur=$6, amount_usd=$7, exchange_rate_eur=$8, exchange_rate_usd=$9, exchange_rate_date=$10, exchange_rate_source=$11, fuel_liters=$12, fuel_price_currency=$13, fuel_price_per_liter_base=$14, fuel_price_per_liter_mdl=$15, fuel_type=$16, odometer=$17, service_type=$18, expires_date=$19, date=$20, description=$21, exclude_from_analytics=$22
WHERE user_id=$23 AND id=$24
`+expenseReturningSQL(),
		expense.VehicleID, expense.Category, expense.AmountBase, expense.BaseCurrency, expense.AmountMDL, expense.AmountEUR, expense.AmountUSD, expense.ExchangeRateEUR, expense.ExchangeRateUSD, expense.ExchangeRateDate, expense.ExchangeRateSource, expense.FuelLiters, expense.FuelPriceCurrency, expense.FuelPricePerLiterBase, expense.FuelPricePerLiterMDL, expense.FuelType, expense.Odometer, expense.ServiceType, expense.ExpiresDate, expense.Date, expense.Description, expense.ExcludeFromAnalytics, userID, id)
	updated, err := scanExpense(row)
	if err != nil {
		return domain.Expense{}, err
	}
	_ = s.refreshVehicleOdometer(userID, updated.VehicleID)
	if previousVehicleID != updated.VehicleID {
		_ = s.refreshVehicleOdometer(userID, previousVehicleID)
	}
	return updated, nil
}

func (s *PostgresStore) UpdateExpenseAnalytics(userID, id string, excludeFromAnalytics bool) (domain.Expense, error) {
	row := s.pool.QueryRow(context.Background(), `
UPDATE expenses
SET exclude_from_analytics=$1
WHERE user_id=$2 AND id=$3
`+expenseReturningSQL(), excludeFromAnalytics, userID, id)
	updated, err := scanExpense(row)
	if err != nil {
		return domain.Expense{}, err
	}
	expenses, err := s.withAttachmentSummaries(userID, []domain.Expense{updated})
	if err != nil {
		return domain.Expense{}, err
	}
	return expenses[0], nil
}

func (s *PostgresStore) DeleteExpense(userID, id string) error {
	var vehicleID string
	row := s.pool.QueryRow(context.Background(), `DELETE FROM expenses WHERE user_id=$1 AND id=$2 RETURNING vehicle_id`, userID, id)
	if err := row.Scan(&vehicleID); errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	} else if err != nil {
		return err
	}
	return s.refreshVehicleOdometer(userID, vehicleID)
}

func (s *PostgresStore) ExpenseAttachments(userID, expenseID string) ([]domain.ExpenseAttachment, error) {
	if err := s.requireExpense(userID, expenseID); err != nil {
		return nil, err
	}
	rows, err := s.pool.Query(context.Background(), attachmentSelectSQL()+` WHERE user_id=$1 AND expense_id=$2 ORDER BY created_at DESC`, userID, expenseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanAttachments(rows)
}

func (s *PostgresStore) ExpenseAttachment(userID, expenseID, attachmentID string) (domain.ExpenseAttachment, error) {
	row := s.pool.QueryRow(context.Background(), attachmentSelectSQL()+` WHERE user_id=$1 AND expense_id=$2 AND id=$3`, userID, expenseID, attachmentID)
	return scanAttachment(row)
}

func (s *PostgresStore) CreateExpenseAttachment(userID, expenseID string, attachment domain.ExpenseAttachment) (domain.ExpenseAttachment, error) {
	if err := s.requireExpense(userID, expenseID); err != nil {
		return domain.ExpenseAttachment{}, err
	}
	if attachment.ID == "" {
		id, err := newID("att")
		if err != nil {
			return domain.ExpenseAttachment{}, err
		}
		attachment.ID = id
	}
	attachment.UserID = userID
	attachment.ExpenseID = expenseID
	attachment.CreatedAt = time.Now().UTC()
	_, err := s.pool.Exec(context.Background(), `INSERT INTO expense_attachments (id, user_id, expense_id, object_key, file_name, content_type, size_bytes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		attachment.ID, attachment.UserID, attachment.ExpenseID, attachment.ObjectKey, attachment.FileName, attachment.ContentType, attachment.SizeBytes, attachment.CreatedAt)
	if err != nil {
		return domain.ExpenseAttachment{}, err
	}
	return attachment, nil
}

func (s *PostgresStore) DeleteExpenseAttachment(userID, expenseID, attachmentID string) error {
	tag, err := s.pool.Exec(context.Background(), `DELETE FROM expense_attachments WHERE user_id=$1 AND expense_id=$2 AND id=$3`, userID, expenseID, attachmentID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) Documents(userID, ownerType, ownerID, kind string) ([]domain.DocumentAttachment, error) {
	if err := s.requireDocumentOwner(userID, ownerType, ownerID); err != nil {
		return nil, err
	}
	query := documentSelectSQL() + ` WHERE user_id=$1 AND owner_type=$2 AND owner_id=$3`
	args := []any{userID, ownerType, ownerID}
	if kind != "" {
		query += ` AND kind=$4`
		args = append(args, kind)
	}
	query += ` ORDER BY created_at DESC`
	rows, err := s.pool.Query(context.Background(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanDocuments(rows)
}

func (s *PostgresStore) Document(userID, ownerType, ownerID, documentID string) (domain.DocumentAttachment, error) {
	row := s.pool.QueryRow(context.Background(), documentSelectSQL()+` WHERE user_id=$1 AND owner_type=$2 AND owner_id=$3 AND id=$4`, userID, ownerType, ownerID, documentID)
	return scanDocument(row)
}

func (s *PostgresStore) CreateDocument(userID string, document domain.DocumentAttachment) (domain.DocumentAttachment, error) {
	if err := s.requireDocumentOwner(userID, document.OwnerType, document.OwnerID); err != nil {
		return domain.DocumentAttachment{}, err
	}
	if document.ID == "" {
		id, err := newID("doc")
		if err != nil {
			return domain.DocumentAttachment{}, err
		}
		document.ID = id
	}
	document.UserID = userID
	document.CreatedAt = time.Now().UTC()
	_, err := s.pool.Exec(context.Background(), `INSERT INTO document_attachments (id, user_id, owner_type, owner_id, kind, object_key, file_name, content_type, size_bytes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		document.ID, document.UserID, document.OwnerType, document.OwnerID, document.Kind, document.ObjectKey, document.FileName, document.ContentType, document.SizeBytes, document.CreatedAt)
	if err != nil {
		return domain.DocumentAttachment{}, err
	}
	return document, nil
}

func (s *PostgresStore) DeleteDocument(userID, ownerType, ownerID, documentID string) error {
	tag, err := s.pool.Exec(context.Background(), `DELETE FROM document_attachments WHERE user_id=$1 AND owner_type=$2 AND owner_id=$3 AND id=$4`, userID, ownerType, ownerID, documentID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) requireDocumentOwner(userID, ownerType, ownerID string) error {
	switch ownerType {
	case "user":
		if ownerID == userID {
			return nil
		}
	case "vehicle":
		if _, err := s.Vehicle(userID, ownerID); err != nil {
			return err
		}
		return nil
	}
	return ErrNotFound
}

func (s *PostgresStore) requireExpense(userID, expenseID string) error {
	var exists bool
	err := s.pool.QueryRow(context.Background(), `SELECT EXISTS(SELECT 1 FROM expenses WHERE user_id=$1 AND id=$2)`, userID, expenseID).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) refreshVehicleOdometer(userID, vehicleID string) error {
	_, err := s.pool.Exec(context.Background(), `
UPDATE vehicles
SET odometer=GREATEST(odometer_base, COALESCE((SELECT MAX(odometer) FROM expenses WHERE user_id=$1 AND vehicle_id=$2 AND odometer > 0), 0))
WHERE user_id=$1 AND id=$2`, userID, vehicleID)
	return err
}

func (s *PostgresStore) Timeline(userID, vehicleID string) ([]domain.TimelineEntry, error) {
	expenses, err := s.UserExpenses(userID, vehicleID)
	if err != nil {
		return nil, err
	}
	entries := make([]domain.TimelineEntry, 0, len(expenses))
	for _, expense := range expenses {
		title := expense.Description
		if title == "" {
			title = expense.Category
		}
		entries = append(entries, domain.TimelineEntry{ID: expense.ID, VehicleID: expense.VehicleID, Type: "expense", Title: title, Category: expense.Category, Date: expense.Date, AmountMDL: expense.AmountMDL})
	}
	return entries, nil
}

func (s *PostgresStore) Analytics(userID, vehicleID string) (map[string]any, error) {
	expenses, err := s.UserExpenses(userID, vehicleID)
	if err != nil {
		return nil, err
	}
	vehicles, err := s.UserVehicles(userID)
	if err != nil {
		return nil, err
	}
	return analyticsFrom(expenses, vehicles, vehicleID), nil
}

func (s *PostgresStore) CreateUser(loginID string) (domain.User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(loginID), bcrypt.DefaultCost)
	if err != nil {
		return domain.User{}, fmt.Errorf("hash login id: %w", err)
	}
	id, err := newID("usr")
	if err != nil {
		return domain.User{}, err
	}
	now := time.Now().UTC()
	user := domain.User{ID: id, LoginIDHash: hash, DefaultCurrency: "MDL", Country: "MD", CompareCountry: "RO", CreatedAt: now, LastActivityAt: now}
	_, err = s.pool.Exec(context.Background(), `INSERT INTO users (id, login_id_hash, name, default_currency, country, compare_country, created_at, last_activity_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		user.ID, user.LoginIDHash, user.Name, user.DefaultCurrency, user.Country, user.CompareCountry, user.CreatedAt, user.LastActivityAt)
	return user, err
}

func (s *PostgresStore) UserByLoginID(loginID string) (domain.User, error) {
	rows, err := s.pool.Query(context.Background(), userSelectSQL())
	if err != nil {
		return domain.User{}, err
	}
	defer rows.Close()
	for rows.Next() {
		user, err := scanUser(rows)
		if err != nil {
			return domain.User{}, err
		}
		if bcrypt.CompareHashAndPassword(user.LoginIDHash, []byte(loginID)) == nil {
			return user, nil
		}
	}
	return domain.User{}, ErrNotFound
}

func (s *PostgresStore) UserSettings(userID string) (domain.UserSettings, error) {
	row := s.pool.QueryRow(context.Background(), userSelectSQL()+` WHERE id=$1`, userID)
	user, err := scanUser(row)
	if err != nil {
		return domain.UserSettings{}, err
	}
	return settingsFromUser(user), nil
}

func (s *PostgresStore) UpdateUserSettings(userID string, settings domain.UserSettings) (domain.UserSettings, error) {
	if !supportedCurrency(settings.DefaultCurrency) || !supportedCountry(settings.Country) || !supportedCountry(settings.CompareCountry) {
		return domain.UserSettings{}, ErrUnsupportedSetting
	}
	row := s.pool.QueryRow(context.Background(), `UPDATE users SET name=$1, default_currency=$2, country=$3, compare_country=$4 WHERE id=$5 RETURNING id, login_id_hash, name, default_currency, country, compare_country, created_at, last_activity_at`, cleanName(settings.Name), settings.DefaultCurrency, settings.Country, settings.CompareCountry, userID)
	user, err := scanUser(row)
	if err != nil {
		return domain.UserSettings{}, err
	}
	return settingsFromUser(user), nil
}

func (s *PostgresStore) TouchUser(userID string) {
	_, _ = s.pool.Exec(context.Background(), `UPDATE users SET last_activity_at=$1 WHERE id=$2`, time.Now().UTC(), userID)
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanUser(row rowScanner) (domain.User, error) {
	var user domain.User
	err := row.Scan(&user.ID, &user.LoginIDHash, &user.Name, &user.DefaultCurrency, &user.Country, &user.CompareCountry, &user.CreatedAt, &user.LastActivityAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.User{}, ErrNotFound
	}
	return user, err
}

func userSelectSQL() string {
	return `SELECT id, login_id_hash, name, default_currency, country, compare_country, created_at, last_activity_at FROM users`
}

func expenseSelectSQL() string {
	return `SELECT id, user_id, vehicle_id, category, amount_base, base_currency, amount_mdl, amount_eur, amount_usd, exchange_rate_eur, exchange_rate_usd, exchange_rate_date, exchange_rate_source, fuel_liters, fuel_price_currency, fuel_price_per_liter_base, fuel_price_per_liter_mdl, fuel_type, odometer, service_type, expires_date, date, description, exclude_from_analytics, created_at FROM expenses`
}

func expenseReturningSQL() string {
	return `RETURNING id, user_id, vehicle_id, category, amount_base, base_currency, amount_mdl, amount_eur, amount_usd, exchange_rate_eur, exchange_rate_usd, exchange_rate_date, exchange_rate_source, fuel_liters, fuel_price_currency, fuel_price_per_liter_base, fuel_price_per_liter_mdl, fuel_type, odometer, service_type, expires_date, date, description, exclude_from_analytics, created_at`
}

func attachmentSelectSQL() string {
	return `SELECT id, user_id, expense_id, object_key, file_name, content_type, size_bytes, created_at FROM expense_attachments`
}

func vehicleSelectSQL() string {
	return `SELECT id, user_id, plate_number, nickname, make, model, year, engine_type, vin, preferred_fuel_type, oil_interval_km, purchase_price, purchase_currency, purchase_date, odometer, odometer_base, image_url, created_at FROM vehicles`
}

func documentSelectSQL() string {
	return `SELECT id, user_id, owner_type, owner_id, kind, object_key, file_name, content_type, size_bytes, created_at FROM document_attachments`
}

func scanVehicle(row rowScanner) (domain.Vehicle, error) {
	var vehicle domain.Vehicle
	err := row.Scan(&vehicle.ID, &vehicle.UserID, &vehicle.PlateNumber, &vehicle.Nickname, &vehicle.Make, &vehicle.Model, &vehicle.Year, &vehicle.EngineType, &vehicle.VIN, &vehicle.PreferredFuelType, &vehicle.OilIntervalKM, &vehicle.PurchasePrice, &vehicle.PurchaseCurrency, &vehicle.PurchaseDate, &vehicle.Odometer, &vehicle.OdometerBase, &vehicle.ImageURL, &vehicle.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Vehicle{}, ErrNotFound
	}
	return vehicle, err
}

func scanVehicles(rows pgx.Rows) ([]domain.Vehicle, error) {
	vehicles := []domain.Vehicle{}
	for rows.Next() {
		vehicle, err := scanVehicle(rows)
		if err != nil {
			return nil, err
		}
		vehicles = append(vehicles, vehicle)
	}
	return vehicles, rows.Err()
}

func scanExpenses(rows pgx.Rows) ([]domain.Expense, error) {
	expenses := []domain.Expense{}
	for rows.Next() {
		expense, err := scanExpense(rows)
		if err != nil {
			return nil, err
		}
		expenses = append(expenses, expense)
	}
	return expenses, rows.Err()
}

func scanExpense(row rowScanner) (domain.Expense, error) {
	var expense domain.Expense
	err := row.Scan(&expense.ID, &expense.UserID, &expense.VehicleID, &expense.Category, &expense.AmountBase, &expense.BaseCurrency, &expense.AmountMDL, &expense.AmountEUR, &expense.AmountUSD, &expense.ExchangeRateEUR, &expense.ExchangeRateUSD, &expense.ExchangeRateDate, &expense.ExchangeRateSource, &expense.FuelLiters, &expense.FuelPriceCurrency, &expense.FuelPricePerLiterBase, &expense.FuelPricePerLiterMDL, &expense.FuelType, &expense.Odometer, &expense.ServiceType, &expense.ExpiresDate, &expense.Date, &expense.Description, &expense.ExcludeFromAnalytics, &expense.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Expense{}, ErrNotFound
	}
	return expense, err
}

func scanAttachments(rows pgx.Rows) ([]domain.ExpenseAttachment, error) {
	attachments := []domain.ExpenseAttachment{}
	for rows.Next() {
		attachment, err := scanAttachment(rows)
		if err != nil {
			return nil, err
		}
		attachments = append(attachments, attachment)
	}
	return attachments, rows.Err()
}

func scanAttachment(row rowScanner) (domain.ExpenseAttachment, error) {
	var attachment domain.ExpenseAttachment
	err := row.Scan(&attachment.ID, &attachment.UserID, &attachment.ExpenseID, &attachment.ObjectKey, &attachment.FileName, &attachment.ContentType, &attachment.SizeBytes, &attachment.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ExpenseAttachment{}, ErrNotFound
	}
	return attachment, err
}

func scanDocuments(rows pgx.Rows) ([]domain.DocumentAttachment, error) {
	documents := []domain.DocumentAttachment{}
	for rows.Next() {
		document, err := scanDocument(rows)
		if err != nil {
			return nil, err
		}
		documents = append(documents, document)
	}
	return documents, rows.Err()
}

func scanDocument(row rowScanner) (domain.DocumentAttachment, error) {
	var document domain.DocumentAttachment
	err := row.Scan(&document.ID, &document.UserID, &document.OwnerType, &document.OwnerID, &document.Kind, &document.ObjectKey, &document.FileName, &document.ContentType, &document.SizeBytes, &document.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.DocumentAttachment{}, ErrNotFound
	}
	return document, err
}
