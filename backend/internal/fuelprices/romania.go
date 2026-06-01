package fuelprices

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"
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
	fuelCode := romanianFuelCode(query.FuelType)
	endpoint := "https://pretcarburant.ro/api/v1/statii?tip=" + url.QueryEscape(fuelCode)
	payload, status, err := getJSON[romaniaStationsPayload](ctx, p.client, endpoint)
	if err != nil {
		return Response{}, err
	}
	if status == http.StatusTooManyRequests {
		return p.nationalPrices(ctx, query, fuelCode)
	}
	if status != http.StatusOK {
		return Response{}, upstreamStatus("pretcarburant", status)
	}
	stations := filterRomaniaStations(payload.Stations, query.Region)
	sort.Slice(stations, func(i, j int) bool { return stations[i].Price < stations[j].Price })
	if len(stations) > query.Limit {
		stations = stations[:query.Limit]
	}

	suggestions := make([]Suggestion, 0, len(stations))
	for _, station := range stations {
		suggestions = append(suggestions, Suggestion{
			StationName:  strings.TrimSpace(station.Brand + " " + station.City),
			Brand:        station.Brand,
			Address:      station.Address,
			City:         station.City,
			Region:       station.Region,
			Country:      "RO",
			FuelType:     query.FuelType,
			Price:        station.Price,
			Currency:     "RON",
			Unit:         "liter",
			Latitude:     station.Latitude,
			Longitude:    station.Longitude,
			UpdatedAt:    payload.Date,
			Source:       "PretCarburant.ro",
			StationLevel: true,
		})
	}
	return Response{Country: "RO", Region: query.Region, FuelType: query.FuelType, Source: "PretCarburant.ro", UpdatedAt: payload.Date, Suggestions: suggestions}, nil
}

func (p RomaniaProvider) nationalPrices(ctx context.Context, query Query, fuelCode string) (Response, error) {
	payload, status, err := getJSON[romaniaNationalPayload](ctx, p.client, "https://pretcarburant.ro/api/v1/preturi/minime")
	if err != nil {
		return Response{}, err
	}
	if status != http.StatusOK {
		return Response{}, upstreamStatus("pretcarburant", status)
	}
	price, ok := payload.Prices[fuelCode]
	if !ok {
		return Response{}, fmt.Errorf("romanian fuel price not found")
	}
	suggestions := []Suggestion{
		{StationName: "Romania national minimum", Country: "RO", FuelType: query.FuelType, Price: price.Min, Currency: "RON", Unit: "liter", UpdatedAt: payload.Date, Source: "PretCarburant.ro", StationLevel: false},
		{StationName: "Romania national average", Country: "RO", FuelType: query.FuelType, Price: price.Average, Currency: "RON", Unit: "liter", UpdatedAt: payload.Date, Source: "PretCarburant.ro", StationLevel: false},
	}
	return Response{Country: "RO", Region: query.Region, FuelType: query.FuelType, Source: "PretCarburant.ro", UpdatedAt: payload.Date, Suggestions: suggestions}, nil
}

type romaniaStationsPayload struct {
	Date     string           `json:"data"`
	Stations []romaniaStation `json:"statii"`
}

type romaniaNationalPayload struct {
	Date   string                         `json:"data"`
	Prices map[string]romaniaNationalFuel `json:"preturi"`
}

type romaniaNationalFuel struct {
	Min     float64 `json:"min"`
	Average float64 `json:"mediu"`
	Max     float64 `json:"max"`
}

type romaniaStation struct {
	Address   string  `json:"adresa"`
	Brand     string  `json:"brand"`
	Region    string  `json:"judet"`
	Latitude  float64 `json:"lat"`
	Longitude float64 `json:"lng"`
	City      string  `json:"oras"`
	Price     float64 `json:"pret"`
}

func romanianFuelCode(fuelType string) string {
	switch fuelType {
	case "Diesel":
		return "motorina_standard"
	case "LPG":
		return "gpl"
	default:
		return "benzina_standard"
	}
}

func filterRomaniaStations(stations []romaniaStation, region string) []romaniaStation {
	region = normalizeRegion(region)
	if region == "" {
		return stations
	}
	filtered := []romaniaStation{}
	for _, station := range stations {
		if normalizeRegion(station.Region) == region || normalizeRegion(station.City) == region {
			filtered = append(filtered, station)
		}
	}
	return filtered
}

func normalizeRegion(value string) string {
	value = strings.ToUpper(strings.TrimSpace(value))
	replacer := strings.NewReplacer("Ă", "A", "Â", "A", "Î", "I", "Ș", "S", "Ş", "S", "Ț", "T", "Ţ", "T")
	return replacer.Replace(value)
}
