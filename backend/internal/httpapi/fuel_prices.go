package httpapi

import (
	"errors"
	"math"
	"net/http"
	"strconv"
	"time"

	"driverlogs/backend/internal/fuelprices"
	"driverlogs/backend/internal/store"
)

func (h Handler) fuelPriceSuggestions(w http.ResponseWriter, r *http.Request) {
	settings, err := h.store.UserSettings(userID(r))
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "user not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "settings unavailable"})
		return
	}
	country := r.URL.Query().Get("country")
	if country == "" {
		country = settings.Country
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	result, err := h.fuelPrices.Suggestions(r.Context(), fuelprices.Query{
		Country:  country,
		Region:   r.URL.Query().Get("region"),
		FuelType: r.URL.Query().Get("fuel_type"),
		Limit:    limit,
	})
	if err != nil {
		h.logger.Warn("fuel price suggestions unavailable",
			"country", country,
			"region", r.URL.Query().Get("region"),
			"fuel_type", r.URL.Query().Get("fuel_type"),
			"error", err,
		)
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "fuel prices unavailable", "detail": err.Error()})
		return
	}
	h.logger.Info("fuel price suggestions loaded",
		"country", result.Country,
		"fuel_type", result.FuelType,
		"source", result.Source,
		"count", len(result.Suggestions),
	)
	writeJSON(w, http.StatusOK, result)
}

type fuelComparisonResponse struct {
	Country        string              `json:"country"`
	CompareCountry string              `json:"compare_country"`
	Currency       string              `json:"currency"`
	Source         string              `json:"source"`
	Rows           []fuelComparisonRow `json:"rows"`
}

type fuelComparisonRow struct {
	FuelType          string  `json:"fuel_type"`
	LocalPriceMDL     float64 `json:"local_price_mdl"`
	ComparePrice      float64 `json:"compare_price"`
	CompareCurrency   string  `json:"compare_currency"`
	ComparePriceMDL   float64 `json:"compare_price_mdl"`
	DifferenceMDL     float64 `json:"difference_mdl"`
	DifferencePercent float64 `json:"difference_percent"`
}

func (h Handler) fuelPriceComparison(w http.ResponseWriter, r *http.Request) {
	settings, err := h.store.UserSettings(userID(r))
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "user not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "settings unavailable"})
		return
	}
	country := queryDefault(r, "country", settings.Country)
	compareCountry := queryDefault(r, "compare_country", settings.CompareCountry)
	if country != "MD" || compareCountry == "" || compareCountry == country {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "fuel comparison requires a different comparison country"})
		return
	}
	trends, err := h.fuelPrices.Trends(r.Context(), country)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "local fuel prices unavailable", "detail": err.Error()})
		return
	}
	rows := make([]fuelComparisonRow, 0, len(trends.Rows))
	for _, trend := range trends.Rows {
		if trend.FuelType == "Premium 95" {
			continue
		}
		compare, err := h.fuelPrices.Suggestions(r.Context(), fuelprices.Query{Country: compareCountry, FuelType: trend.FuelType, Limit: 1})
		if err != nil || len(compare.Suggestions) == 0 {
			h.logger.Warn("fuel comparison row unavailable", "country", country, "compare_country", compareCountry, "fuel_type", trend.FuelType, "error", err)
			continue
		}
		suggestion := compare.Suggestions[0]
		compareMDL, err := h.exchange.ConvertDecimalToMDL(r.Context(), suggestion.Price, suggestion.Currency, time.Now().Format("2006-01-02"))
		if err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": "comparison exchange rate unavailable", "detail": err.Error()})
			return
		}
		diff := round2(compareMDL - trend.Now)
		percent := 0.0
		if trend.Now > 0 {
			percent = round2(diff / trend.Now * 100)
		}
		rows = append(rows, fuelComparisonRow{
			FuelType:          trend.FuelType,
			LocalPriceMDL:     round2(trend.Now),
			ComparePrice:      suggestion.Price,
			CompareCurrency:   suggestion.Currency,
			ComparePriceMDL:   round2(compareMDL),
			DifferenceMDL:     diff,
			DifferencePercent: percent,
		})
	}
	writeJSON(w, http.StatusOK, fuelComparisonResponse{Country: country, CompareCountry: compareCountry, Currency: "MDL", Source: "Autotraveler.ru + National Bank of Moldova", Rows: rows})
}

func queryDefault(r *http.Request, key string, fallback string) string {
	value := r.URL.Query().Get(key)
	if value == "" {
		return fallback
	}
	return value
}

func round2(value float64) float64 {
	return math.Round(value*100) / 100
}

func (h Handler) fuelPriceTrends(w http.ResponseWriter, r *http.Request) {
	settings, err := h.store.UserSettings(userID(r))
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "user not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "settings unavailable"})
		return
	}
	country := r.URL.Query().Get("country")
	if country == "" {
		country = settings.Country
	}
	result, err := h.fuelPrices.Trends(r.Context(), country)
	if err != nil {
		h.logger.Warn("fuel trends unavailable", "country", country, "error", err)
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "fuel trends unavailable", "detail": err.Error()})
		return
	}
	h.logger.Info("fuel trends loaded", "country", result.Country, "source", result.Source, "rows", len(result.Rows))
	writeJSON(w, http.StatusOK, result)
}
