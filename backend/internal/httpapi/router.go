package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"driverlogs/backend/internal/auth"
	"driverlogs/backend/internal/domain"
	"driverlogs/backend/internal/exchange"
	"driverlogs/backend/internal/fuelprices"
	"driverlogs/backend/internal/store"
)

type Store interface {
	UserVehicles(userID string) ([]domain.Vehicle, error)
	Vehicle(userID, id string) (domain.Vehicle, error)
	CreateVehicle(userID string, vehicle domain.Vehicle) (domain.Vehicle, error)
	UpdateVehicle(userID, id string, vehicle domain.Vehicle) (domain.Vehicle, error)
	DeleteVehicle(userID, id string) error
	UserExpenses(userID, vehicleID string) ([]domain.Expense, error)
	CreateExpense(userID string, expense domain.Expense) (domain.Expense, error)
	UpdateExpense(userID, id string, expense domain.Expense) (domain.Expense, error)
	Timeline(userID, vehicleID string) ([]domain.TimelineEntry, error)
	Analytics(userID, vehicleID string) (map[string]any, error)
	CreateUser(loginID string) (domain.User, error)
	UserByLoginID(loginID string) (domain.User, error)
	UserSettings(userID string) (domain.UserSettings, error)
	UpdateUserSettings(userID string, settings domain.UserSettings) (domain.UserSettings, error)
	TouchUser(userID string)
}

type Handler struct {
	store      Store
	db         healthPinger
	exchange   exchange.BNMClient
	fuelPrices fuelprices.Service
	jwtSecret  string
	logger     *slog.Logger
	cors       corsPolicy
}

type healthPinger interface {
	Ping(ctx context.Context) error
}

type contextKey string

const userIDKey contextKey = "user_id"

func NewRouter(repo Store, db healthPinger, fuelPrices fuelprices.Service, jwtSecret string, corsAllowedOrigins []string) http.Handler {
	h := Handler{store: repo, db: db, exchange: exchange.NewBNMClient(), fuelPrices: fuelPrices, jwtSecret: jwtSecret, logger: slog.Default(), cors: newCORSPolicy(corsAllowedOrigins)}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", h.health)
	mux.HandleFunc("POST /auth/register", h.register)
	mux.HandleFunc("POST /auth/login", h.login)
	mux.HandleFunc("GET /auth/session", h.requireAuth(h.session))
	mux.HandleFunc("GET /user/settings", h.requireAuth(h.getSettings))
	mux.HandleFunc("PUT /user/settings", h.requireAuth(h.updateSettings))
	mux.HandleFunc("GET /vehicle-options/makes", h.vehicleMakes)
	mux.HandleFunc("GET /vehicle-options/models", h.vehicleModels)
	mux.HandleFunc("GET /vehicle-options/vin/{vin}", h.vehicleVIN)
	mux.HandleFunc("GET /fuel-prices", h.requireAuth(h.fuelPriceSuggestions))
	mux.HandleFunc("GET /fuel-trends", h.requireAuth(h.fuelPriceTrends))
	mux.HandleFunc("GET /fuel-comparison", h.requireAuth(h.fuelPriceComparison))
	mux.HandleFunc("GET /vehicles", h.requireAuth(h.listVehicles))
	mux.HandleFunc("POST /vehicles", h.requireAuth(h.createVehicle))
	mux.HandleFunc("GET /vehicles/{id}", h.requireAuth(h.getVehicle))
	mux.HandleFunc("PUT /vehicles/{id}", h.requireAuth(h.updateVehicle))
	mux.HandleFunc("DELETE /vehicles/{id}", h.requireAuth(h.deleteVehicle))
	mux.HandleFunc("GET /expenses", h.requireAuth(h.listExpenses))
	mux.HandleFunc("POST /expenses", h.requireAuth(h.createExpense))
	mux.HandleFunc("PUT /expenses/{id}", h.requireAuth(h.updateExpense))
	mux.HandleFunc("GET /timeline", h.requireAuth(h.timeline))
	mux.HandleFunc("GET /analytics", h.requireAuth(h.analytics))
	mux.HandleFunc("GET /reports", h.requireAuth(h.reports))
	return withRequestLogging(h.logger, h.withCORS(mux))
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func withRequestLogging(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(recorder, r)
		fields := []any{
			"method", r.Method,
			"path", r.URL.Path,
			"status", recorder.status,
			"duration_ms", time.Since(start).Milliseconds(),
		}
		switch {
		case recorder.status >= http.StatusInternalServerError:
			logger.Error("api request failed", fields...)
		case recorder.status >= http.StatusBadRequest:
			logger.Warn("api request rejected", fields...)
		default:
			logger.Info("api request completed", fields...)
		}
	})
}

func (h Handler) health(w http.ResponseWriter, r *http.Request) {
	response := map[string]string{
		"status":   "ok",
		"database": "ok",
	}
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := h.db.Ping(ctx); err != nil {
		h.logger.Warn("database health check failed", "error", err)
		response["status"] = "degraded"
		response["database"] = "unavailable"
		writeJSON(w, http.StatusServiceUnavailable, response)
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (h Handler) register(w http.ResponseWriter, r *http.Request) {
	loginID, err := auth.NewLoginID()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not create login id"})
		return
	}
	user, err := h.store.CreateUser(loginID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not create user"})
		return
	}
	token, err := auth.Sign(user.ID, h.jwtSecret, time.Now())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not create token"})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"login_id":     loginID,
		"token":        token,
		"expires_in":   int(auth.TokenTTL.Seconds()),
		"max_vehicles": 4,
	})
}

func (h Handler) login(w http.ResponseWriter, r *http.Request) {
	var request struct {
		LoginID string `json:"login_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.LoginID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "login_id is required"})
		return
	}
	user, err := h.store.UserByLoginID(request.LoginID)
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid login id"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	token, err := auth.Sign(user.ID, h.jwtSecret, time.Now())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not create token"})
		return
	}
	h.store.TouchUser(user.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"token":        token,
		"expires_in":   int(auth.TokenTTL.Seconds()),
		"max_vehicles": 4,
	})
}

func (h Handler) session(w http.ResponseWriter, r *http.Request) {
	settings, _ := h.store.UserSettings(userID(r))
	writeJSON(w, http.StatusOK, map[string]any{
		"user_id":      userID(r),
		"max_vehicles": 4,
		"settings":     settings,
	})
}

func (h Handler) getSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.store.UserSettings(userID(r))
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "user not found"})
		return
	}
	writeJSON(w, http.StatusOK, settings)
}

func (h Handler) updateSettings(w http.ResponseWriter, r *http.Request) {
	var settings domain.UserSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid settings payload"})
		return
	}
	updated, err := h.store.UpdateUserSettings(userID(r), settings)
	if errors.Is(err, store.ErrUnsupportedSetting) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unsupported settings"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (h Handler) listVehicles(w http.ResponseWriter, r *http.Request) {
	vehicles, err := h.store.UserVehicles(userID(r))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "vehicles unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, vehicles)
}

func (h Handler) createVehicle(w http.ResponseWriter, r *http.Request) {
	var vehicle domain.Vehicle
	if err := json.NewDecoder(r.Body).Decode(&vehicle); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid vehicle payload"})
		return
	}
	if vehicle.PlateNumber == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "plate_number is required"})
		return
	}
	created, err := h.store.CreateVehicle(userID(r), vehicle)
	if errors.Is(err, store.ErrVehicleLimit) {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "vehicle limit reached", "detail": "each user can have up to 4 vehicles"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (h Handler) getVehicle(w http.ResponseWriter, r *http.Request) {
	vehicle, err := h.store.Vehicle(userID(r), r.PathValue("id"))
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "vehicle not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	writeJSON(w, http.StatusOK, vehicle)
}

func (h Handler) updateVehicle(w http.ResponseWriter, r *http.Request) {
	var vehicle domain.Vehicle
	if err := json.NewDecoder(r.Body).Decode(&vehicle); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid vehicle payload"})
		return
	}
	if vehicle.PlateNumber == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "plate_number is required"})
		return
	}
	current, err := h.store.Vehicle(userID(r), r.PathValue("id"))
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "vehicle not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	if vehicle.Odometer > 0 && current.Odometer > 0 && vehicle.Odometer < current.Odometer {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "odometer cannot be lower than the current reading"})
		return
	}
	updated, err := h.store.UpdateVehicle(userID(r), r.PathValue("id"), vehicle)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (h Handler) deleteVehicle(w http.ResponseWriter, r *http.Request) {
	if err := h.store.DeleteVehicle(userID(r), r.PathValue("id")); errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "vehicle not found"})
		return
	} else if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h Handler) listExpenses(w http.ResponseWriter, r *http.Request) {
	expenses, err := h.store.UserExpenses(userID(r), r.URL.Query().Get("vehicle_id"))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "expenses unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, expenses)
}

func (h Handler) createExpense(w http.ResponseWriter, r *http.Request) {
	var expense domain.Expense
	if err := json.NewDecoder(r.Body).Decode(&expense); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid expense payload"})
		return
	}
	normalized, status, err := h.normalizeExpense(r, expense)
	if err != nil {
		writeJSON(w, status, map[string]string{"error": err.Error()})
		return
	}
	created, err := h.store.CreateExpense(userID(r), normalized)
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "vehicle not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (h Handler) updateExpense(w http.ResponseWriter, r *http.Request) {
	var expense domain.Expense
	if err := json.NewDecoder(r.Body).Decode(&expense); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid expense payload"})
		return
	}
	normalized, status, err := h.normalizeExpense(r, expense)
	if err != nil {
		writeJSON(w, status, map[string]string{"error": err.Error()})
		return
	}
	updated, err := h.store.UpdateExpense(userID(r), r.PathValue("id"), normalized)
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "expense not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (h Handler) normalizeExpense(r *http.Request, expense domain.Expense) (domain.Expense, int, error) {
	settings, err := h.store.UserSettings(userID(r))
	if err != nil {
		return domain.Expense{}, http.StatusInternalServerError, errors.New("settings unavailable")
	}
	vehicle, err := h.store.Vehicle(userID(r), expense.VehicleID)
	if errors.Is(err, store.ErrNotFound) {
		return domain.Expense{}, http.StatusNotFound, errors.New("vehicle not found")
	}
	if err != nil {
		return domain.Expense{}, http.StatusInternalServerError, errors.New("vehicle unavailable")
	}
	if expense.Odometer > 0 && vehicle.Odometer > 0 && expense.Odometer < vehicle.Odometer {
		return domain.Expense{}, http.StatusBadRequest, errors.New("odometer cannot be lower than the current reading")
	}
	if expense.BaseCurrency == "" {
		expense.BaseCurrency = settings.DefaultCurrency
	}
	if expense.FuelPriceCurrency == "" {
		expense.FuelPriceCurrency = expense.BaseCurrency
	}
	if expense.AmountBase <= 0 {
		expense.AmountBase = expense.AmountMDL
	}
	if expense.Category == "Fuel" && expense.FuelPricePerLiterBase > 0 {
		priceMDL, err := h.exchange.ConvertDecimalToMDL(r.Context(), expense.FuelPricePerLiterBase, expense.FuelPriceCurrency, expense.Date)
		if err != nil {
			return domain.Expense{}, http.StatusBadGateway, errors.New("fuel price exchange rate unavailable")
		}
		expense.FuelPricePerLiterMDL = priceMDL
	}
	if expense.Category == "Fuel" && expense.AmountBase <= 0 && expense.FuelLiters > 0 && expense.FuelPricePerLiterBase > 0 {
		expense.AmountBase = expense.FuelLiters * expense.FuelPricePerLiterBase
	}
	if expense.VehicleID == "" || expense.Category == "" || expense.AmountBase <= 0 || expense.Date == "" {
		return domain.Expense{}, http.StatusBadRequest, errors.New("vehicle_id, category, amount, and date are required")
	}
	if expense.Category == "Fuel" && expense.FuelType == "" {
		return domain.Expense{}, http.StatusBadRequest, errors.New("fuel_type is required for fuel expenses")
	}
	if expense.Category == "Maintenance" && expense.Odometer <= 0 {
		return domain.Expense{}, http.StatusBadRequest, errors.New("odometer is required for service expenses")
	}
	conversion, err := h.exchange.Convert(r.Context(), expense.AmountBase, expense.BaseCurrency, expense.Date)
	if err != nil {
		return domain.Expense{}, http.StatusBadGateway, errors.New("exchange rates unavailable")
	}
	expense.AmountBase = conversion.AmountBase
	expense.BaseCurrency = conversion.BaseCurrency
	expense.AmountMDL = conversion.AmountMDL
	expense.AmountEUR = conversion.AmountEUR
	expense.AmountUSD = conversion.AmountUSD
	expense.ExchangeRateEUR = conversion.RateEUR
	expense.ExchangeRateUSD = conversion.RateUSD
	expense.ExchangeRateDate = conversion.Date
	expense.ExchangeRateSource = conversion.Source
	return expense, http.StatusOK, nil
}

func (h Handler) timeline(w http.ResponseWriter, r *http.Request) {
	entries, err := h.store.Timeline(userID(r), r.URL.Query().Get("vehicle_id"))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "timeline unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, entries)
}

func (h Handler) analytics(w http.ResponseWriter, r *http.Request) {
	summary, err := h.store.Analytics(userID(r), r.URL.Query().Get("vehicle_id"))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "analytics unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, summary)
}

func (h Handler) reports(w http.ResponseWriter, r *http.Request) {
	reportType := r.URL.Query().Get("type")
	if reportType == "" {
		reportType = "monthly"
	}
	summary, err := h.store.Analytics(userID(r), r.URL.Query().Get("vehicle_id"))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "report unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"type":    reportType,
		"ready":   true,
		"source":  "driverlogs_app",
		"summary": summary,
	})
}

func (h Handler) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := auth.Bearer(r.Header.Get("Authorization"))
		claims, err := auth.Verify(token, h.jwtSecret, time.Now())
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "authentication required"})
			return
		}
		refreshed, err := auth.Sign(claims.UserID, h.jwtSecret, time.Now())
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not refresh token"})
			return
		}
		h.store.TouchUser(claims.UserID)
		w.Header().Set("Authorization", "Bearer "+refreshed)
		next(w, r.WithContext(context.WithValue(r.Context(), userIDKey, claims.UserID)))
	}
}

func userID(r *http.Request) string {
	value, _ := r.Context().Value(userIDKey).(string)
	return value
}

type corsPolicy struct {
	allowed  map[string]struct{}
	allowAll bool
}

func newCORSPolicy(origins []string) corsPolicy {
	policy := corsPolicy{allowed: map[string]struct{}{}}
	for _, origin := range origins {
		origin = strings.TrimSpace(origin)
		if origin == "" {
			continue
		}
		if origin == "*" {
			policy.allowAll = true
			continue
		}
		policy.allowed[origin] = struct{}{}
	}
	return policy
}

func (p corsPolicy) allowedOrigin(origin string) string {
	if origin == "" {
		return ""
	}
	if p.allowAll {
		return origin
	}
	if _, ok := p.allowed[origin]; ok {
		return origin
	}
	return ""
}

func (h Handler) withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := h.cors.allowedOrigin(r.Header.Get("Origin"))
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization")
		w.Header().Set("Access-Control-Expose-Headers", "Authorization")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		if r.Method == http.MethodOptions {
			if origin == "" && r.Header.Get("Origin") != "" {
				w.WriteHeader(http.StatusForbidden)
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil && !strings.Contains(err.Error(), "broken pipe") {
		http.Error(w, `{"error":"encode response"}`, http.StatusInternalServerError)
	}
}
