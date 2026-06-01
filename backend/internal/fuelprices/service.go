package fuelprices

import (
	"context"
	"fmt"
	"strings"
)

type Service struct {
	providers map[string]Provider
	cache     *memoryCache
}

func NewService() Service {
	providers := []Provider{
		NewRomaniaProvider(),
		NewMoldovaProvider(),
	}
	byCountry := map[string]Provider{}
	for _, provider := range providers {
		byCountry[provider.Country()] = provider
	}
	return Service{providers: byCountry, cache: newMemoryCache()}
}

func (s Service) Suggestions(ctx context.Context, query Query) (Response, error) {
	query.Country = normalizeCountry(query.Country)
	query.FuelType = normalizeFuelType(query.FuelType)
	if query.Limit <= 0 || query.Limit > 12 {
		query.Limit = 6
	}
	cacheKey := fmt.Sprintf("suggestions:%s:%s:%s:%d", query.Country, strings.ToLower(query.Region), query.FuelType, query.Limit)
	if cached, ok := s.cache.get(cacheKey); ok {
		if failure, ok := cached.(cachedFailure); ok {
			return Response{}, failure
		}
		return cached.(Response), nil
	}
	provider, ok := s.providers[query.Country]
	if !ok {
		return Response{}, fmt.Errorf("fuel prices are not supported for country %s", query.Country)
	}
	response, err := provider.Suggestions(ctx, query)
	if err != nil {
		s.cache.set(cacheKey, cachedFailure{message: err.Error()})
		return Response{}, err
	}
	s.cache.set(cacheKey, response)
	return response, nil
}

func (s Service) Trends(ctx context.Context, country string) (TrendResponse, error) {
	country = normalizeCountry(country)
	if country != "MD" {
		return TrendResponse{}, fmt.Errorf("fuel trends are not supported for country %s", country)
	}
	cacheKey := "trends:" + country
	if cached, ok := s.cache.get(cacheKey); ok {
		if failure, ok := cached.(cachedFailure); ok {
			return TrendResponse{}, failure
		}
		return cached.(TrendResponse), nil
	}
	trends, err := NewMoldovaProvider().Trends(ctx)
	if err != nil {
		s.cache.set(cacheKey, cachedFailure{message: err.Error()})
		return TrendResponse{}, err
	}
	s.cache.set(cacheKey, trends)
	return trends, nil
}

func normalizeCountry(country string) string {
	country = strings.ToUpper(strings.TrimSpace(country))
	if country == "" {
		return "MD"
	}
	return country
}

func normalizeFuelType(fuelType string) string {
	value := strings.ToLower(strings.TrimSpace(fuelType))
	switch value {
	case "diesel", "motorina", "motorină":
		return "Diesel"
	case "lpg", "gpl":
		return "LPG"
	case "petrol", "gasoline", "benzina", "benzină", "95", "sp95", "super 95":
		return "Super 95"
	default:
		return "Super 95"
	}
}
