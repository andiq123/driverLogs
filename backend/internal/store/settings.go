package store

import (
	"slices"

	"driverlogs/backend/internal/domain"
)

func settingsFromUser(user domain.User) domain.UserSettings {
	currency := user.DefaultCurrency
	if currency == "" {
		currency = "MDL"
	}
	country := user.Country
	if country == "" {
		country = "MD"
	}
	compareCountry := user.CompareCountry
	if compareCountry == "" {
		compareCountry = "RO"
	}
	return domain.UserSettings{Name: user.Name, DefaultCurrency: currency, Country: country, CompareCountry: compareCountry}
}

func cleanName(name string) string {
	if len(name) > 80 {
		return name[:80]
	}
	return name
}

func supportedCurrency(currency string) bool {
	return slices.Contains([]string{"MDL", "EUR", "USD", "RON"}, currency)
}

func supportedCountry(country string) bool {
	return slices.Contains([]string{"MD", "RO", "UA", "US", "DE"}, country)
}
