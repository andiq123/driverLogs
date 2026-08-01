package domain

import "time"

type Vehicle struct {
	ID                string              `json:"id"`
	UserID            string              `json:"-"`
	PlateNumber       string              `json:"plate_number"`
	Nickname          string              `json:"nickname,omitempty"`
	Make              string              `json:"make,omitempty"`
	Model             string              `json:"model,omitempty"`
	Year              int                 `json:"year,omitempty"`
	EngineType        string              `json:"engine_type,omitempty"`
	VIN               string              `json:"vin,omitempty"`
	PreferredFuelType string              `json:"preferred_fuel_type,omitempty"`
	OilIntervalKM     int                 `json:"oil_interval_km,omitempty"`
	PurchasePrice     float64             `json:"purchase_price,omitempty"`
	PurchaseCurrency  string              `json:"purchase_currency,omitempty"`
	PurchaseDate      string              `json:"purchase_date,omitempty"`
	Odometer          int                 `json:"odometer,omitempty"`
	OdometerBase      int                 `json:"-"`
	ImageURL          string              `json:"image_url,omitempty"`
	DocumentCount     int                 `json:"document_count,omitempty"`
	LatestDocument    *DocumentAttachment `json:"latest_document,omitempty"`
	CreatedAt         time.Time           `json:"created_at"`
}

type Expense struct {
	ID                    string             `json:"id"`
	UserID                string             `json:"-"`
	VehicleID             string             `json:"vehicle_id"`
	TripID                string             `json:"trip_id,omitempty"`
	Category              string             `json:"category"`
	AmountBase            float64            `json:"amount_base,omitempty"`
	BaseCurrency          string             `json:"base_currency,omitempty"`
	AmountMDL             float64            `json:"amount_mdl"`
	AmountEUR             float64            `json:"amount_eur"`
	AmountUSD             float64            `json:"amount_usd"`
	ExchangeRateEUR       float64            `json:"exchange_rate_eur,omitempty"`
	ExchangeRateUSD       float64            `json:"exchange_rate_usd,omitempty"`
	ExchangeRateDate      string             `json:"exchange_rate_date,omitempty"`
	ExchangeRateSource    string             `json:"exchange_rate_source,omitempty"`
	FuelLiters            float64            `json:"fuel_liters,omitempty"`
	FuelPriceCurrency     string             `json:"fuel_price_currency,omitempty"`
	FuelPricePerLiterBase float64            `json:"fuel_price_per_liter_base,omitempty"`
	FuelPricePerLiterMDL  float64            `json:"fuel_price_per_liter_mdl,omitempty"`
	FuelType              string             `json:"fuel_type,omitempty"`
	Odometer              int                `json:"odometer,omitempty"`
	ServiceType           string             `json:"service_type,omitempty"`
	ExpiresDate           string             `json:"expires_date,omitempty"`
	Date                  string             `json:"date"`
	Description           string             `json:"description"`
	ExcludeFromAnalytics  bool               `json:"exclude_from_analytics,omitempty"`
	AttachmentCount       int                `json:"attachment_count,omitempty"`
	LatestAttachment      *ExpenseAttachment `json:"latest_attachment,omitempty"`
	CreatedAt             time.Time          `json:"created_at"`
}

type Trip struct {
	ID                      string     `json:"id"`
	UserID                  string     `json:"-"`
	VehicleID               string     `json:"vehicle_id"`
	Name                    string     `json:"name"`
	StartOdometer           int        `json:"start_odometer"`
	EndOdometer             int        `json:"end_odometer,omitempty"`
	StartedAt               time.Time  `json:"started_at"`
	EndedAt                 *time.Time `json:"ended_at,omitempty"`
	DistanceKM              int        `json:"distance_km"`
	FuelSpendMDL            float64    `json:"fuel_spend_mdl"`
	FuelSpendEUR            float64    `json:"fuel_spend_eur"`
	FuelSpendUSD            float64    `json:"fuel_spend_usd"`
	FuelLiters              float64    `json:"fuel_liters"`
	FillCount               int        `json:"fill_count"`
	AveragePricePerLiterMDL float64    `json:"average_price_per_liter_mdl"`
	CostPerKMMDL            float64    `json:"cost_per_km_mdl"`
}

type ExpenseAttachment struct {
	ID          string    `json:"id"`
	UserID      string    `json:"-"`
	ExpenseID   string    `json:"expense_id"`
	ObjectKey   string    `json:"-"`
	FileName    string    `json:"file_name"`
	ContentType string    `json:"content_type"`
	SizeBytes   int64     `json:"size_bytes"`
	CreatedAt   time.Time `json:"created_at"`
}

type DocumentAttachment struct {
	ID          string    `json:"id"`
	UserID      string    `json:"-"`
	OwnerType   string    `json:"owner_type"`
	OwnerID     string    `json:"owner_id"`
	Kind        string    `json:"kind"`
	ObjectKey   string    `json:"-"`
	FileName    string    `json:"file_name"`
	ContentType string    `json:"content_type"`
	SizeBytes   int64     `json:"size_bytes"`
	CreatedAt   time.Time `json:"created_at"`
}

type User struct {
	ID              string    `json:"id"`
	LoginIDHash     []byte    `json:"-"`
	Name            string    `json:"name,omitempty"`
	DefaultCurrency string    `json:"default_currency"`
	Country         string    `json:"country"`
	CompareCountry  string    `json:"compare_country"`
	CreatedAt       time.Time `json:"created_at"`
	LastActivityAt  time.Time `json:"last_activity_at"`
}

type UserSettings struct {
	Name            string `json:"name,omitempty"`
	DefaultCurrency string `json:"default_currency"`
	Country         string `json:"country"`
	CompareCountry  string `json:"compare_country"`
}

type TimelineEntry struct {
	ID        string  `json:"id"`
	VehicleID string  `json:"vehicle_id"`
	Type      string  `json:"type"`
	Title     string  `json:"title"`
	Category  string  `json:"category"`
	Date      string  `json:"date"`
	AmountMDL float64 `json:"amount_mdl"`
}
