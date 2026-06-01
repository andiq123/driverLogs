package fuelprices

import (
	"context"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
)

type MoldovaProvider struct {
	client *http.Client
}

func NewMoldovaProvider() MoldovaProvider {
	return MoldovaProvider{client: newHTTPClient()}
}

func (p MoldovaProvider) Country() string {
	return "MD"
}

func (p MoldovaProvider) Suggestions(ctx context.Context, query Query) (Response, error) {
	price, err := p.referencePrice(ctx, query.FuelType)
	if err != nil {
		return Response{}, err
	}
	suggestion := Suggestion{
		StationName:  "Moldova national reference",
		Country:      "MD",
		FuelType:     query.FuelType,
		Price:        price,
		Currency:     "MDL",
		Unit:         "liter",
		Source:       "Autotraveler.ru",
		StationLevel: false,
	}
	return Response{Country: "MD", FuelType: query.FuelType, Source: "Autotraveler.ru", Suggestions: []Suggestion{suggestion}}, nil
}

func (p MoldovaProvider) referencePrice(ctx context.Context, fuelType string) (float64, error) {
	endpoint := "https://autotraveler.ru/en/moldova/trend-price-fuel-moldova.html"
	body, status, err := getText(ctx, p.client, endpoint)
	if err != nil {
		return 0, err
	}
	if status != http.StatusOK {
		return 0, upstreamStatus("autotraveler", status)
	}
	return extractAutotravelerMDLPrice(body, fuelType)
}

func (p MoldovaProvider) Trends(ctx context.Context) (TrendResponse, error) {
	endpoint := "https://autotraveler.ru/en/moldova/trend-price-fuel-moldova.html"
	body, status, err := getText(ctx, p.client, endpoint)
	if err != nil {
		return TrendResponse{}, err
	}
	if status != http.StatusOK {
		return TrendResponse{}, upstreamStatus("autotraveler", status)
	}
	rows, err := extractMoldovaTrendRows(body)
	if err != nil {
		return TrendResponse{}, err
	}
	return TrendResponse{Country: "MD", Currency: "MDL", Unit: "liter", Source: "Autotraveler.ru", Rows: rows}, nil
}

func extractAutotravelerMDLPrice(text string, fuelType string) (float64, error) {
	label := autotravelerFuelLabel(fuelType)
	rows, err := extractMoldovaTrendRows(text)
	if err != nil {
		return 0, err
	}
	for _, row := range rows {
		if row.FuelType == label {
			return row.Now, nil
		}
	}
	return 0, fmt.Errorf("moldova fuel price not found: %s", label)
}

func autotravelerFuelLabel(fuelType string) string {
	switch fuelType {
	case "Diesel":
		return "Diesel"
	case "LPG":
		return "LPG"
	default:
		return "Super 95"
	}
}

func extractMoldovaTrendRows(text string) ([]TrendRow, error) {
	labels := []string{"Super 95", "Premium 95", "Diesel", "LPG"}
	return extractAutotravelerTrendRows(text, "moldova", "MDL", labels)
}

func extractAutotravelerTrendRows(text string, country string, currency string, labels []string) ([]TrendRow, error) {
	localStart := strings.Index(text, `id="local"`)
	if localStart < 0 {
		return nil, fmt.Errorf("%s national currency trend section missing", country)
	}
	text = text[localStart:]
	rows := make([]TrendRow, 0, len(labels))
	for index, label := range labels {
		start := strings.Index(text, label)
		if start < 0 {
			return nil, fmt.Errorf("%s trend row missing: %s", country, label)
		}
		end := len(text)
		for _, nextLabel := range labels[index+1:] {
			if next := strings.Index(text[start+len(label):], nextLabel); next >= 0 {
				end = start + len(label) + next
				break
			}
		}
		row, err := parseTrendRow(label, text[start:end], currency, country)
		if err != nil {
			return nil, err
		}
		rows = append(rows, row)
	}
	return rows, nil
}

func parseTrendRow(label, text string, currency string, country string) (TrendRow, error) {
	pattern := fmt.Sprintf(`[-+]?\s*(?:%s\s*)[0-9]+(?:\.[0-9]+)?|[-+]?\s*[0-9]+(?:\.[0-9]+)?\s*%%`, regexp.QuoteMeta(currency))
	numbers := regexp.MustCompile(pattern).FindAllString(text, -1)
	values := make([]float64, 0, len(numbers))
	for _, token := range numbers {
		value, err := parseSignedNumber(token)
		if err == nil {
			values = append(values, value)
		}
	}
	if len(values) < 7 {
		return TrendRow{}, fmt.Errorf("%s trend row incomplete: %s", country, label)
	}
	return TrendRow{
		FuelType: label,
		Now:      values[0],
		Week:     TrendChange{Amount: values[1], Percent: percentWithAmountSign(values[1], values[2])},
		Month:    TrendChange{Amount: values[3], Percent: percentWithAmountSign(values[3], values[4])},
		Year:     TrendChange{Amount: values[5], Percent: percentWithAmountSign(values[5], values[6])},
	}, nil
}

func percentWithAmountSign(amount, percent float64) float64 {
	if amount < 0 && percent > 0 {
		return -percent
	}
	return percent
}

func parseSignedNumber(value string) (float64, error) {
	sign := 1.0
	trimmed := strings.TrimSpace(value)
	if strings.HasPrefix(trimmed, "-") {
		sign = -1
	}
	trimmed = strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(trimmed, "+"), "-"))
	trimmed = strings.TrimSpace(strings.TrimPrefix(trimmed, "MDL"))
	trimmed = strings.TrimSpace(strings.TrimPrefix(trimmed, "RON"))
	trimmed = strings.TrimSpace(strings.TrimPrefix(trimmed, "€"))
	trimmed = strings.TrimSpace(strings.TrimSuffix(trimmed, "%"))
	parsed, err := strconv.ParseFloat(strings.TrimSpace(trimmed), 64)
	return parsed * sign, err
}
