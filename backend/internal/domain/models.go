package domain

import "time"

type Vehicle struct {
	ID                string    `json:"id"`
	UserID            string    `json:"-"`
	PlateNumber       string    `json:"plate_number"`
	Nickname          string    `json:"nickname,omitempty"`
	Make              string    `json:"make,omitempty"`
	Model             string    `json:"model,omitempty"`
	Year              int       `json:"year,omitempty"`
	EngineType        string    `json:"engine_type,omitempty"`
	VIN               string    `json:"vin,omitempty"`
	PreferredFuelType string    `json:"preferred_fuel_type,omitempty"`
	PurchasePrice     float64   `json:"purchase_price,omitempty"`
	PurchaseCurrency  string    `json:"purchase_currency,omitempty"`
	PurchaseDate      string    `json:"purchase_date,omitempty"`
	Odometer          int       `json:"odometer,omitempty"`
	ImageURL          string    `json:"image_url,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

type Expense struct {
	ID                    string    `json:"id"`
	UserID                string    `json:"-"`
	VehicleID             string    `json:"vehicle_id"`
	Category              string    `json:"category"`
	AmountBase            float64   `json:"amount_base,omitempty"`
	BaseCurrency          string    `json:"base_currency,omitempty"`
	AmountMDL             float64   `json:"amount_mdl"`
	AmountEUR             float64   `json:"amount_eur"`
	AmountUSD             float64   `json:"amount_usd"`
	ExchangeRateEUR       float64   `json:"exchange_rate_eur,omitempty"`
	ExchangeRateUSD       float64   `json:"exchange_rate_usd,omitempty"`
	ExchangeRateDate      string    `json:"exchange_rate_date,omitempty"`
	ExchangeRateSource    string    `json:"exchange_rate_source,omitempty"`
	FuelLiters            float64   `json:"fuel_liters,omitempty"`
	FuelPriceCurrency     string    `json:"fuel_price_currency,omitempty"`
	FuelPricePerLiterBase float64   `json:"fuel_price_per_liter_base,omitempty"`
	FuelPricePerLiterMDL  float64   `json:"fuel_price_per_liter_mdl,omitempty"`
	FuelType              string    `json:"fuel_type,omitempty"`
	FuelFullTank          bool      `json:"fuel_full_tank,omitempty"`
	Odometer              int       `json:"odometer,omitempty"`
	ServiceType           string    `json:"service_type,omitempty"`
	ExpiresDate           string    `json:"expires_date,omitempty"`
	Date                  string    `json:"date"`
	Description           string    `json:"description"`
	CreatedAt             time.Time `json:"created_at"`
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
