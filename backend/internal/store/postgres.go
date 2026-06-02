package store

import (
	"context"
	"errors"
	"fmt"
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
  purchase_price numeric NOT NULL DEFAULT 0,
  purchase_currency text NOT NULL DEFAULT '',
  purchase_date text NOT NULL DEFAULT '',
  odometer int NOT NULL DEFAULT 0,
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
  fuel_full_tank boolean NOT NULL DEFAULT false,
  odometer int NOT NULL DEFAULT 0,
  service_type text NOT NULL DEFAULT '',
  expires_date text NOT NULL DEFAULT '',
  date text NOT NULL,
  description text NOT NULL DEFAULT '',
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
);`)
	if err != nil {
		return fmt.Errorf("migrate postgres store: %w", err)
	}
	if _, err := s.pool.Exec(ctx, `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS odometer int NOT NULL DEFAULT 0`); err != nil {
		return fmt.Errorf("migrate expense odometer: %w", err)
	}
	for _, statement := range []string{
		`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS fuel_full_tank boolean NOT NULL DEFAULT false`,
		`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT ''`,
		`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expires_date text NOT NULL DEFAULT ''`,
	} {
		if _, err := s.pool.Exec(ctx, statement); err != nil {
			return fmt.Errorf("migrate expense smart fields: %w", err)
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
	if _, err := s.pool.Exec(ctx, `ALTER TABLE users ADD COLUMN IF NOT EXISTS compare_country text NOT NULL DEFAULT 'RO'`); err != nil {
		return fmt.Errorf("migrate user compare country: %w", err)
	}
	return nil
}

func (s *PostgresStore) UserVehicles(userID string) ([]domain.Vehicle, error) {
	rows, err := s.pool.Query(context.Background(), `SELECT id, user_id, plate_number, nickname, make, model, year, engine_type, vin, preferred_fuel_type, purchase_price, purchase_currency, purchase_date, odometer, image_url, created_at FROM vehicles WHERE user_id=$1 ORDER BY created_at`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanVehicles(rows)
}

func (s *PostgresStore) Vehicle(userID, id string) (domain.Vehicle, error) {
	row := s.pool.QueryRow(context.Background(), `SELECT id, user_id, plate_number, nickname, make, model, year, engine_type, vin, preferred_fuel_type, purchase_price, purchase_currency, purchase_date, odometer, image_url, created_at FROM vehicles WHERE user_id=$1 AND id=$2`, userID, id)
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
	_, err = s.pool.Exec(context.Background(), `INSERT INTO vehicles (id, user_id, plate_number, nickname, make, model, year, engine_type, vin, preferred_fuel_type, purchase_price, purchase_currency, purchase_date, odometer, image_url, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
		vehicle.ID, vehicle.UserID, vehicle.PlateNumber, vehicle.Nickname, vehicle.Make, vehicle.Model, vehicle.Year, vehicle.EngineType, vehicle.VIN, vehicle.PreferredFuelType, vehicle.PurchasePrice, vehicle.PurchaseCurrency, vehicle.PurchaseDate, vehicle.Odometer, vehicle.ImageURL, vehicle.CreatedAt)
	if err != nil {
		return domain.Vehicle{}, err
	}
	return vehicle, nil
}

func (s *PostgresStore) UpdateVehicle(userID, id string, vehicle domain.Vehicle) (domain.Vehicle, error) {
	row := s.pool.QueryRow(context.Background(), `
UPDATE vehicles
SET plate_number=$1, nickname=$2, make=$3, model=$4, year=$5, engine_type=$6, vin=$7, preferred_fuel_type=$8, purchase_price=$9, purchase_currency=$10, purchase_date=$11, odometer=$12, image_url=$13
WHERE user_id=$14 AND id=$15
RETURNING id, user_id, plate_number, nickname, make, model, year, engine_type, vin, preferred_fuel_type, purchase_price, purchase_currency, purchase_date, odometer, image_url, created_at`,
		vehicle.PlateNumber, vehicle.Nickname, vehicle.Make, vehicle.Model, vehicle.Year, vehicle.EngineType, vehicle.VIN, preferredFuelType(vehicle.PreferredFuelType), vehicle.PurchasePrice, vehicle.PurchaseCurrency, vehicle.PurchaseDate, vehicle.Odometer, vehicle.ImageURL, userID, id)
	return scanVehicle(row)
}

func preferredFuelType(value string) string {
	if value == "" {
		return "Super 95"
	}
	return value
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
	return scanExpenses(rows)
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
	_, err = s.pool.Exec(context.Background(), `INSERT INTO expenses (id, user_id, vehicle_id, category, amount_base, base_currency, amount_mdl, amount_eur, amount_usd, exchange_rate_eur, exchange_rate_usd, exchange_rate_date, exchange_rate_source, fuel_liters, fuel_price_currency, fuel_price_per_liter_base, fuel_price_per_liter_mdl, fuel_type, fuel_full_tank, odometer, service_type, expires_date, date, description, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
		expense.ID, expense.UserID, expense.VehicleID, expense.Category, expense.AmountBase, expense.BaseCurrency, expense.AmountMDL, expense.AmountEUR, expense.AmountUSD, expense.ExchangeRateEUR, expense.ExchangeRateUSD, expense.ExchangeRateDate, expense.ExchangeRateSource, expense.FuelLiters, expense.FuelPriceCurrency, expense.FuelPricePerLiterBase, expense.FuelPricePerLiterMDL, expense.FuelType, expense.FuelFullTank, expense.Odometer, expense.ServiceType, expense.ExpiresDate, expense.Date, expense.Description, expense.CreatedAt)
	if err != nil {
		return domain.Expense{}, err
	}
	if expense.Odometer > 0 {
		_, _ = s.pool.Exec(context.Background(), `UPDATE vehicles SET odometer=GREATEST(odometer, $1) WHERE user_id=$2 AND id=$3`, expense.Odometer, userID, expense.VehicleID)
	}
	return expense, nil
}

func (s *PostgresStore) UpdateExpense(userID, id string, expense domain.Expense) (domain.Expense, error) {
	if _, err := s.Vehicle(userID, expense.VehicleID); err != nil {
		return domain.Expense{}, err
	}
	row := s.pool.QueryRow(context.Background(), `
UPDATE expenses
SET vehicle_id=$1, category=$2, amount_base=$3, base_currency=$4, amount_mdl=$5, amount_eur=$6, amount_usd=$7, exchange_rate_eur=$8, exchange_rate_usd=$9, exchange_rate_date=$10, exchange_rate_source=$11, fuel_liters=$12, fuel_price_currency=$13, fuel_price_per_liter_base=$14, fuel_price_per_liter_mdl=$15, fuel_type=$16, fuel_full_tank=$17, odometer=$18, service_type=$19, expires_date=$20, date=$21, description=$22
WHERE user_id=$23 AND id=$24
RETURNING id, user_id, vehicle_id, category, amount_base, base_currency, amount_mdl, amount_eur, amount_usd, exchange_rate_eur, exchange_rate_usd, exchange_rate_date, exchange_rate_source, fuel_liters, fuel_price_currency, fuel_price_per_liter_base, fuel_price_per_liter_mdl, fuel_type, fuel_full_tank, odometer, service_type, expires_date, date, description, created_at`,
		expense.VehicleID, expense.Category, expense.AmountBase, expense.BaseCurrency, expense.AmountMDL, expense.AmountEUR, expense.AmountUSD, expense.ExchangeRateEUR, expense.ExchangeRateUSD, expense.ExchangeRateDate, expense.ExchangeRateSource, expense.FuelLiters, expense.FuelPriceCurrency, expense.FuelPricePerLiterBase, expense.FuelPricePerLiterMDL, expense.FuelType, expense.FuelFullTank, expense.Odometer, expense.ServiceType, expense.ExpiresDate, expense.Date, expense.Description, userID, id)
	updated, err := scanExpense(row)
	if err != nil {
		return domain.Expense{}, err
	}
	if updated.Odometer > 0 {
		_, _ = s.pool.Exec(context.Background(), `UPDATE vehicles SET odometer=GREATEST(odometer, $1) WHERE user_id=$2 AND id=$3`, updated.Odometer, userID, updated.VehicleID)
	}
	return updated, nil
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
SET odometer=COALESCE((SELECT MAX(odometer) FROM expenses WHERE user_id=$1 AND vehicle_id=$2 AND odometer > 0), odometer)
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
	return `SELECT id, user_id, vehicle_id, category, amount_base, base_currency, amount_mdl, amount_eur, amount_usd, exchange_rate_eur, exchange_rate_usd, exchange_rate_date, exchange_rate_source, fuel_liters, fuel_price_currency, fuel_price_per_liter_base, fuel_price_per_liter_mdl, fuel_type, fuel_full_tank, odometer, service_type, expires_date, date, description, created_at FROM expenses`
}

func attachmentSelectSQL() string {
	return `SELECT id, user_id, expense_id, object_key, file_name, content_type, size_bytes, created_at FROM expense_attachments`
}

func scanVehicle(row rowScanner) (domain.Vehicle, error) {
	var vehicle domain.Vehicle
	err := row.Scan(&vehicle.ID, &vehicle.UserID, &vehicle.PlateNumber, &vehicle.Nickname, &vehicle.Make, &vehicle.Model, &vehicle.Year, &vehicle.EngineType, &vehicle.VIN, &vehicle.PreferredFuelType, &vehicle.PurchasePrice, &vehicle.PurchaseCurrency, &vehicle.PurchaseDate, &vehicle.Odometer, &vehicle.ImageURL, &vehicle.CreatedAt)
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
	err := row.Scan(&expense.ID, &expense.UserID, &expense.VehicleID, &expense.Category, &expense.AmountBase, &expense.BaseCurrency, &expense.AmountMDL, &expense.AmountEUR, &expense.AmountUSD, &expense.ExchangeRateEUR, &expense.ExchangeRateUSD, &expense.ExchangeRateDate, &expense.ExchangeRateSource, &expense.FuelLiters, &expense.FuelPriceCurrency, &expense.FuelPricePerLiterBase, &expense.FuelPricePerLiterMDL, &expense.FuelType, &expense.FuelFullTank, &expense.Odometer, &expense.ServiceType, &expense.ExpiresDate, &expense.Date, &expense.Description, &expense.CreatedAt)
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
