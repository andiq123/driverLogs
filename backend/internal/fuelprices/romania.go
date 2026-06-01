package fuelprices

import (
	"context"
	"fmt"
	"net/http"
)

type RomaniaProvider struct {
	client *http.Client
}

func NewRomaniaProvider() RomaniaProvider {
	return RomaniaProvider{client: newHTTPClient()}
}

func (p RomaniaProvider) Country() string {
	return "RO"
}

func (p RomaniaProvider) Suggestions(ctx context.Context, query Query) (Response, error) {
	price, err := p.referencePrice(ctx, query.FuelType)
	if err != nil {
		return Response{}, err
	}
	suggestion := Suggestion{
		StationName:  "Romania national reference",
		Country:      "RO",
		FuelType:     query.FuelType,
		Price:        price,
		Currency:     "RON",
		Unit:         "liter",
		Source:       "Autotraveler.ru",
		StationLevel: false,
	}
	return Response{Country: "RO", FuelType: query.FuelType, Source: "Autotraveler.ru", Suggestions: []Suggestion{suggestion}}, nil
}

func (p RomaniaProvider) referencePrice(ctx context.Context, fuelType string) (float64, error) {
	body, status, err := getText(ctx, p.client, romaniaAutotravelerEndpoint)
	if err != nil {
		return 0, err
	}
	if status != http.StatusOK {
		return 0, upstreamStatus("autotraveler", status)
	}
	return extractAutotravelerRONPrice(body, fuelType)
}

func extractAutotravelerRONPrice(text string, fuelType string) (float64, error) {
	label := autotravelerFuelLabel(fuelType)
	rows, err := extractRomaniaTrendRows(text)
	if err != nil {
		return 0, err
	}
	for _, row := range rows {
		if row.FuelType == label {
			return row.Now, nil
		}
	}
	return 0, fmt.Errorf("romania fuel price not found: %s", label)
}

func extractRomaniaTrendRows(text string) ([]TrendRow, error) {
	labels := []string{"Super 95", "Premium 98", "Diesel", "LPG"}
	return extractAutotravelerTrendRows(text, "romania", "RON", labels)
}

const romaniaAutotravelerEndpoint = "https://autotraveler.ru/en/romania/trend-price-fuel-romania.html"
