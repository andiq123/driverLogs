package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"
)

const nhtsaBaseURL = "https://vpic.nhtsa.dot.gov/api/vehicles"

func (h Handler) vehicleMakes(w http.ResponseWriter, r *http.Request) {
	values, err := nhtsaMakes(r.Context())
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "vehicle options unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, values)
}

func (h Handler) vehicleModels(w http.ResponseWriter, r *http.Request) {
	makeName := strings.TrimSpace(r.URL.Query().Get("make"))
	if makeName == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "make is required"})
		return
	}
	values, err := nhtsaModels(r.Context(), makeName)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "vehicle options unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, values)
}

func (h Handler) vehicleVIN(w http.ResponseWriter, r *http.Request) {
	vin := strings.ToUpper(strings.TrimSpace(r.PathValue("vin")))
	if len(vin) != 17 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "vin must be 17 characters"})
		return
	}
	decoded, err := nhtsaVIN(r.Context(), vin)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "vin decode unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, decoded)
}

type vinDecode struct {
	VIN                 string `json:"vin"`
	Make                string `json:"make,omitempty"`
	Model               string `json:"model,omitempty"`
	ModelYear           int    `json:"model_year,omitempty"`
	VehicleType         string `json:"vehicle_type,omitempty"`
	BodyClass           string `json:"body_class,omitempty"`
	EngineCylinders     string `json:"engine_cylinders,omitempty"`
	DisplacementL       string `json:"displacement_l,omitempty"`
	FuelTypePrimary     string `json:"fuel_type_primary,omitempty"`
	PlantCountry        string `json:"plant_country,omitempty"`
	Manufacturer        string `json:"manufacturer,omitempty"`
	ErrorCode           string `json:"error_code,omitempty"`
	ErrorText           string `json:"error_text,omitempty"`
	DecodedClean        bool   `json:"decoded_clean"`
	Source              string `json:"source"`
	LimitationsAccepted bool   `json:"limitations_accepted"`
}

func nhtsaMakes(ctx context.Context) ([]string, error) {
	var response struct {
		Results []struct {
			MakeName string `json:"MakeName"`
		} `json:"Results"`
	}
	if err := nhtsaGet(ctx, "/GetMakesForVehicleType/car?format=json", &response); err != nil {
		return nil, err
	}
	return uniqueSorted(mapValues(response.Results, func(item struct {
		MakeName string `json:"MakeName"`
	}) string {
		return item.MakeName
	})), nil
}

func nhtsaModels(ctx context.Context, makeName string) ([]string, error) {
	var response struct {
		Results []struct {
			ModelName string `json:"Model_Name"`
		} `json:"Results"`
	}
	path := "/GetModelsForMake/" + url.PathEscape(makeName) + "?format=json"
	if err := nhtsaGet(ctx, path, &response); err != nil {
		return nil, err
	}
	return uniqueSorted(mapValues(response.Results, func(item struct {
		ModelName string `json:"Model_Name"`
	}) string {
		return item.ModelName
	})), nil
}

func nhtsaVIN(ctx context.Context, vin string) (vinDecode, error) {
	var response struct {
		Results []struct {
			VIN             string `json:"VIN"`
			Make            string `json:"Make"`
			Model           string `json:"Model"`
			ModelYear       string `json:"ModelYear"`
			VehicleType     string `json:"VehicleType"`
			BodyClass       string `json:"BodyClass"`
			EngineCylinders string `json:"EngineCylinders"`
			DisplacementL   string `json:"DisplacementL"`
			FuelTypePrimary string `json:"FuelTypePrimary"`
			PlantCountry    string `json:"PlantCountry"`
			Manufacturer    string `json:"Manufacturer"`
			ErrorCode       string `json:"ErrorCode"`
			ErrorText       string `json:"ErrorText"`
		} `json:"Results"`
	}
	path := "/DecodeVinValues/" + url.PathEscape(vin) + "?format=json"
	if err := nhtsaGet(ctx, path, &response); err != nil {
		return vinDecode{}, err
	}
	if len(response.Results) == 0 {
		return vinDecode{}, http.ErrAbortHandler
	}
	result := response.Results[0]
	return vinDecode{
		VIN:                 result.VIN,
		Make:                strings.TrimSpace(result.Make),
		Model:               strings.TrimSpace(result.Model),
		ModelYear:           parseYear(result.ModelYear),
		VehicleType:         strings.TrimSpace(result.VehicleType),
		BodyClass:           strings.TrimSpace(result.BodyClass),
		EngineCylinders:     strings.TrimSpace(result.EngineCylinders),
		DisplacementL:       strings.TrimSpace(result.DisplacementL),
		FuelTypePrimary:     strings.TrimSpace(result.FuelTypePrimary),
		PlantCountry:        strings.TrimSpace(result.PlantCountry),
		Manufacturer:        strings.TrimSpace(result.Manufacturer),
		ErrorCode:           strings.TrimSpace(result.ErrorCode),
		ErrorText:           strings.TrimSpace(result.ErrorText),
		DecodedClean:        strings.TrimSpace(result.ErrorCode) == "0",
		Source:              "NHTSA vPIC",
		LimitationsAccepted: false,
	}, nil
}

func nhtsaGet(ctx context.Context, path string, target any) error {
	ctx, cancel := context.WithTimeout(ctx, 6*time.Second)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, nhtsaBaseURL+path, nil)
	if err != nil {
		return err
	}
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return http.ErrAbortHandler
	}
	return json.NewDecoder(response.Body).Decode(target)
}

func mapValues[T any](values []T, pick func(T) string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		if text := strings.TrimSpace(pick(value)); text != "" {
			result = append(result, text)
		}
	}
	return result
}

func uniqueSorted(values []string) []string {
	seen := make(map[string]bool, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		key := strings.ToLower(value)
		if seen[key] {
			continue
		}
		seen[key] = true
		result = append(result, value)
	}
	sort.Strings(result)
	return result
}

func parseYear(value string) int {
	var year int
	if _, err := fmt.Sscanf(strings.TrimSpace(value), "%d", &year); err != nil {
		return 0
	}
	return year
}
