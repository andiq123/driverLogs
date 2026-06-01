package fuelprices

import "context"

type Query struct {
	Country  string
	Region   string
	FuelType string
	Limit    int
}

type Suggestion struct {
	StationName  string  `json:"station_name,omitempty"`
	Brand        string  `json:"brand,omitempty"`
	Address      string  `json:"address,omitempty"`
	City         string  `json:"city,omitempty"`
	Region       string  `json:"region,omitempty"`
	Country      string  `json:"country"`
	FuelType     string  `json:"fuel_type"`
	Price        float64 `json:"price"`
	Currency     string  `json:"currency"`
	Unit         string  `json:"unit"`
	Latitude     float64 `json:"lat,omitempty"`
	Longitude    float64 `json:"lng,omitempty"`
	UpdatedAt    string  `json:"updated_at,omitempty"`
	Source       string  `json:"source"`
	StationLevel bool    `json:"station_level"`
}

type Response struct {
	Country     string       `json:"country"`
	Region      string       `json:"region,omitempty"`
	FuelType    string       `json:"fuel_type"`
	Source      string       `json:"source"`
	UpdatedAt   string       `json:"updated_at,omitempty"`
	Suggestions []Suggestion `json:"suggestions"`
}

type TrendChange struct {
	Amount  float64 `json:"amount"`
	Percent float64 `json:"percent"`
}

type TrendRow struct {
	FuelType string      `json:"fuel_type"`
	Now      float64     `json:"now"`
	Week     TrendChange `json:"week"`
	Month    TrendChange `json:"month"`
	Year     TrendChange `json:"year"`
}

type TrendResponse struct {
	Country  string     `json:"country"`
	Currency string     `json:"currency"`
	Unit     string     `json:"unit"`
	Source   string     `json:"source"`
	Rows     []TrendRow `json:"rows"`
}

type Provider interface {
	Country() string
	Suggestions(ctx context.Context, query Query) (Response, error)
}
