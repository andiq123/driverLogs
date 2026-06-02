package httpapi

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"driverlogs/backend/internal/auth"
	"driverlogs/backend/internal/domain"
	"driverlogs/backend/internal/exchange"
	"driverlogs/backend/internal/fuelprices"
	filestorage "driverlogs/backend/internal/storage"
	"driverlogs/backend/internal/store"
)

const maxPDFUploadBytes = 10 * 1024 * 1024

type Store interface {
	UserVehicles(userID string) ([]domain.Vehicle, error)
	Vehicle(userID, id string) (domain.Vehicle, error)
	CreateVehicle(userID string, vehicle domain.Vehicle) (domain.Vehicle, error)
	UpdateVehicle(userID, id string, vehicle domain.Vehicle) (domain.Vehicle, error)
	DeleteVehicle(userID, id string) error
	UserExpenses(userID, vehicleID string) ([]domain.Expense, error)
	CreateExpense(userID string, expense domain.Expense) (domain.Expense, error)
	UpdateExpense(userID, id string, expense domain.Expense) (domain.Expense, error)
	DeleteExpense(userID, id string) error
	ExpenseAttachments(userID, expenseID string) ([]domain.ExpenseAttachment, error)
	ExpenseAttachment(userID, expenseID, attachmentID string) (domain.ExpenseAttachment, error)
	CreateExpenseAttachment(userID, expenseID string, attachment domain.ExpenseAttachment) (domain.ExpenseAttachment, error)
	DeleteExpenseAttachment(userID, expenseID, attachmentID string) error
	Documents(userID, ownerType, ownerID, kind string) ([]domain.DocumentAttachment, error)
	Document(userID, ownerType, ownerID, documentID string) (domain.DocumentAttachment, error)
	CreateDocument(userID string, document domain.DocumentAttachment) (domain.DocumentAttachment, error)
	DeleteDocument(userID, ownerType, ownerID, documentID string) error
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
	files      filestorage.Client
	jwtSecret  string
	logger     *slog.Logger
	cors       corsPolicy
}

type healthPinger interface {
	Ping(ctx context.Context) error
}

type contextKey string

const userIDKey contextKey = "user_id"

func NewRouter(repo Store, db healthPinger, fuelPrices fuelprices.Service, files filestorage.Client, jwtSecret string, corsAllowedOrigins []string) http.Handler {
	h := Handler{store: repo, db: db, exchange: exchange.NewBNMClient(), fuelPrices: fuelPrices, files: files, jwtSecret: jwtSecret, logger: slog.Default(), cors: newCORSPolicy(corsAllowedOrigins)}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", h.health)
	mux.HandleFunc("POST /client-errors", h.clientError)
	mux.HandleFunc("POST /auth/register", h.register)
	mux.HandleFunc("POST /auth/login", h.login)
	mux.HandleFunc("GET /auth/session", h.requireAuth(h.session))
	mux.HandleFunc("GET /app-data", h.requireAuth(h.appData))
	mux.HandleFunc("GET /user/settings", h.requireAuth(h.getSettings))
	mux.HandleFunc("PUT /user/settings", h.requireAuth(h.updateSettings))
	mux.HandleFunc("GET /user/documents", h.requireAuth(h.listUserDocuments))
	mux.HandleFunc("POST /user/documents/{kind}", h.requireAuth(h.uploadUserDocument))
	mux.HandleFunc("GET /user/documents/{id}/preview", h.requireAuth(h.previewUserDocument))
	mux.HandleFunc("DELETE /user/documents/{id}", h.requireAuth(h.deleteUserDocument))
	mux.HandleFunc("GET /vehicle-options/makes", h.vehicleMakes)
	mux.HandleFunc("GET /vehicle-options/models", h.vehicleModels)
	mux.HandleFunc("GET /vehicle-options/vin/{vin}", h.vehicleVIN)
	mux.HandleFunc("GET /fuel-prices", h.requireAuth(h.fuelPriceSuggestions))
	mux.HandleFunc("GET /fuel-market", h.requireAuth(h.fuelMarket))
	mux.HandleFunc("GET /fuel-trends", h.requireAuth(h.fuelPriceTrends))
	mux.HandleFunc("GET /fuel-comparison", h.requireAuth(h.fuelPriceComparison))
	mux.HandleFunc("GET /vehicles", h.requireAuth(h.listVehicles))
	mux.HandleFunc("POST /vehicles", h.requireAuth(h.createVehicle))
	mux.HandleFunc("GET /vehicles/{id}", h.requireAuth(h.getVehicle))
	mux.HandleFunc("PUT /vehicles/{id}", h.requireAuth(h.updateVehicle))
	mux.HandleFunc("DELETE /vehicles/{id}", h.requireAuth(h.deleteVehicle))
	mux.HandleFunc("GET /vehicles/{id}/documents", h.requireAuth(h.listVehicleDocuments))
	mux.HandleFunc("POST /vehicles/{id}/documents/{kind}", h.requireAuth(h.uploadVehicleDocument))
	mux.HandleFunc("GET /vehicles/{id}/documents/{document_id}/preview", h.requireAuth(h.previewVehicleDocument))
	mux.HandleFunc("DELETE /vehicles/{id}/documents/{document_id}", h.requireAuth(h.deleteVehicleDocument))
	mux.HandleFunc("GET /expenses", h.requireAuth(h.listExpenses))
	mux.HandleFunc("POST /expenses", h.requireAuth(h.createExpense))
	mux.HandleFunc("PUT /expenses/{id}", h.requireAuth(h.updateExpense))
	mux.HandleFunc("DELETE /expenses/{id}", h.requireAuth(h.deleteExpense))
	mux.HandleFunc("GET /expenses/{id}/attachments", h.requireAuth(h.listExpenseAttachments))
	mux.HandleFunc("POST /expenses/{id}/attachments", h.requireAuth(h.uploadExpenseAttachment))
	mux.HandleFunc("GET /expenses/{id}/attachments/{attachment_id}/preview", h.requireAuth(h.previewExpenseAttachment))
	mux.HandleFunc("DELETE /expenses/{id}/attachments/{attachment_id}", h.requireAuth(h.deleteExpenseAttachment))
	mux.HandleFunc("GET /timeline", h.requireAuth(h.timeline))
	mux.HandleFunc("GET /analytics", h.requireAuth(h.analytics))
	mux.HandleFunc("GET /reports", h.requireAuth(h.reports))
	return withRequestLogging(h.logger, h.withCORS(mux))
}

type statusRecorder struct {
	http.ResponseWriter
	status   int
	body     []byte
	bodyDone bool
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func (r *statusRecorder) Write(data []byte) (int, error) {
	if r.status >= http.StatusBadRequest && !r.bodyDone {
		remaining := 2048 - len(r.body)
		if remaining > 0 {
			if len(data) > remaining {
				r.body = append(r.body, data[:remaining]...)
				r.bodyDone = true
			} else {
				r.body = append(r.body, data...)
			}
		}
	}
	return r.ResponseWriter.Write(data)
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
		fields = append(fields, responseErrorFields(recorder.body)...)
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

func responseErrorFields(body []byte) []any {
	if len(body) == 0 {
		return nil
	}
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return []any{"response_error", safeLogValue(string(body), 240)}
	}
	fields := []any{}
	for _, key := range []string{"error", "detail"} {
		if value, ok := payload[key]; ok {
			fields = append(fields, "response_"+key, safeLogValue(fmt.Sprint(value), 240))
		}
	}
	return fields
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

func (h Handler) clientError(w http.ResponseWriter, r *http.Request) {
	var event struct {
		Level      string         `json:"level"`
		Area       string         `json:"area"`
		Message    string         `json:"message"`
		Detail     string         `json:"detail"`
		Path       string         `json:"path"`
		Standalone bool           `json:"standalone"`
		Context    map[string]any `json:"context"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&event); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid client log"})
		return
	}
	fields := []any{
		"area", safeLogValue(event.Area, 80),
		"message", safeLogValue(event.Message, 180),
		"detail", safeLogValue(event.Detail, 240),
		"path", safeLogValue(event.Path, 160),
		"standalone", event.Standalone,
		"user_agent", safeLogValue(r.UserAgent(), 220),
	}
	for key, value := range event.Context {
		fields = append(fields, "ctx_"+safeLogValue(key, 40), value)
	}
	if strings.EqualFold(event.Level, "error") {
		h.logger.Error("client error", fields...)
	} else {
		h.logger.Warn("client warning", fields...)
	}
	w.WriteHeader(http.StatusNoContent)
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

func (h Handler) appData(w http.ResponseWriter, r *http.Request) {
	userID := userID(r)
	vehicles, err := h.store.UserVehicles(userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "vehicles unavailable"})
		return
	}
	expenses, err := h.store.UserExpenses(userID, "")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "expenses unavailable"})
		return
	}
	settings, err := h.store.UserSettings(userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "settings unavailable"})
		return
	}
	userDocuments, err := h.store.Documents(userID, "user", userID, "")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "documents unavailable"})
		return
	}
	totals := make(map[string]any, len(vehicles))
	for _, vehicle := range vehicles {
		summary, err := h.store.Analytics(userID, vehicle.ID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "analytics unavailable"})
			return
		}
		totals[vehicle.ID] = summary
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"vehicles":       vehicles,
		"expenses":       expenses,
		"settings":       settings,
		"user_documents": userDocuments,
		"vehicle_totals": totals,
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
	updated, err := h.store.UpdateVehicle(userID(r), r.PathValue("id"), vehicle)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (h Handler) deleteVehicle(w http.ResponseWriter, r *http.Request) {
	documents, err := h.store.Documents(userID(r), "vehicle", r.PathValue("id"), "")
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		h.logger.Error("list vehicle documents before delete failed", "error", err, "vehicle_id", r.PathValue("id"))
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	if err := h.store.DeleteVehicle(userID(r), r.PathValue("id")); errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "vehicle not found"})
		return
	} else if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	for _, document := range documents {
		if h.files != nil && h.files.Enabled() {
			if err := h.files.Delete(context.Background(), document.ObjectKey); err != nil {
				h.logger.Warn("document object delete failed after vehicle removal", "error", err, "document_id", document.ID)
			}
		}
		if err := h.store.DeleteDocument(userID(r), "vehicle", r.PathValue("id"), document.ID); err != nil && !errors.Is(err, store.ErrNotFound) {
			h.logger.Warn("document metadata delete failed after vehicle removal", "error", err, "document_id", document.ID)
		}
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

func (h Handler) deleteExpense(w http.ResponseWriter, r *http.Request) {
	attachments, err := h.store.ExpenseAttachments(userID(r), r.PathValue("id"))
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		h.logger.Error("list attachments before expense delete failed", "error", err, "expense_id", r.PathValue("id"))
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	if err := h.store.DeleteExpense(userID(r), r.PathValue("id")); errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "expense not found"})
		return
	} else if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	for _, attachment := range attachments {
		if h.files != nil && h.files.Enabled() {
			if err := h.files.Delete(context.Background(), attachment.ObjectKey); err != nil {
				h.logger.Warn("attachment object delete failed after expense removal", "error", err, "attachment_id", attachment.ID)
			}
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h Handler) listExpenseAttachments(w http.ResponseWriter, r *http.Request) {
	attachments, err := h.store.ExpenseAttachments(userID(r), r.PathValue("id"))
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "expense not found"})
		return
	}
	if err != nil {
		h.logger.Error("list expense attachments failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	writeJSON(w, http.StatusOK, attachments)
}

func (h Handler) uploadExpenseAttachment(w http.ResponseWriter, r *http.Request) {
	if h.files == nil || !h.files.Enabled() {
		h.logStorageUnavailable("expense attachment upload", "expense_id", r.PathValue("id"))
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "PDF storage is not configured on the backend"})
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxPDFUploadBytes+1024)
	if err := r.ParseMultipartForm(maxPDFUploadBytes); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "pdf must be 10 MB or smaller"})
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "pdf file is required"})
		return
	}
	defer file.Close()
	if header.Size <= 0 || header.Size > maxPDFUploadBytes {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "pdf must be 10 MB or smaller"})
		return
	}
	data, err := io.ReadAll(io.LimitReader(file, maxPDFUploadBytes+1))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not read pdf"})
		return
	}
	if int64(len(data)) > maxPDFUploadBytes {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "pdf must be 10 MB or smaller"})
		return
	}
	if !isPDF(data, header.Header.Get("Content-Type")) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "only PDF files are supported"})
		return
	}
	attachmentID, err := randomAttachmentID()
	if err != nil {
		h.logger.Error("attachment id generation failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	expenseID := r.PathValue("id")
	objectKey := fmt.Sprintf("expenses/%s/%s/%s.pdf", userID(r), expenseID, attachmentID)
	if err := h.files.Put(r.Context(), objectKey, bytes.NewReader(data), "application/pdf", int64(len(data))); err != nil {
		h.logger.Error("attachment upload failed", "error", err, "expense_id", expenseID)
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "could not upload pdf"})
		return
	}
	attachment := domain.ExpenseAttachment{
		ID:          attachmentID,
		ObjectKey:   objectKey,
		FileName:    cleanPDFName(header.Filename),
		ContentType: "application/pdf",
		SizeBytes:   int64(len(data)),
	}
	saved, err := h.store.CreateExpenseAttachment(userID(r), expenseID, attachment)
	if errors.Is(err, store.ErrNotFound) {
		_ = h.files.Delete(context.Background(), objectKey)
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "expense not found"})
		return
	}
	if err != nil {
		_ = h.files.Delete(context.Background(), objectKey)
		h.logger.Error("attachment metadata save failed", "error", err, "expense_id", expenseID)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not save pdf metadata"})
		return
	}
	writeJSON(w, http.StatusCreated, saved)
}

func (h Handler) previewExpenseAttachment(w http.ResponseWriter, r *http.Request) {
	attachment, err := h.store.ExpenseAttachment(userID(r), r.PathValue("id"), r.PathValue("attachment_id"))
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "pdf not found"})
		return
	}
	if err != nil {
		h.logger.Error("attachment metadata lookup failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	h.streamPDF(w, r, attachment.ObjectKey, attachment.FileName, attachment.ID)
}

func (h Handler) deleteExpenseAttachment(w http.ResponseWriter, r *http.Request) {
	attachment, err := h.store.ExpenseAttachment(userID(r), r.PathValue("id"), r.PathValue("attachment_id"))
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "pdf not found"})
		return
	}
	if err != nil {
		h.logger.Error("attachment metadata lookup failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	if err := h.files.Delete(r.Context(), attachment.ObjectKey); err != nil {
		h.logger.Warn("attachment object delete failed", "error", err, "attachment_id", attachment.ID)
	}
	if err := h.store.DeleteExpenseAttachment(userID(r), r.PathValue("id"), attachment.ID); err != nil {
		h.logger.Error("attachment metadata delete failed", "error", err, "attachment_id", attachment.ID)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not remove pdf"})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h Handler) listUserDocuments(w http.ResponseWriter, r *http.Request) {
	h.listDocuments(w, r, "user", userID(r), r.URL.Query().Get("kind"))
}

func (h Handler) uploadUserDocument(w http.ResponseWriter, r *http.Request) {
	h.uploadDocument(w, r, "user", userID(r), r.PathValue("kind"))
}

func (h Handler) previewUserDocument(w http.ResponseWriter, r *http.Request) {
	h.previewDocument(w, r, "user", userID(r), r.PathValue("id"))
}

func (h Handler) deleteUserDocument(w http.ResponseWriter, r *http.Request) {
	h.deleteDocument(w, r, "user", userID(r), r.PathValue("id"))
}

func (h Handler) listVehicleDocuments(w http.ResponseWriter, r *http.Request) {
	h.listDocuments(w, r, "vehicle", r.PathValue("id"), r.URL.Query().Get("kind"))
}

func (h Handler) uploadVehicleDocument(w http.ResponseWriter, r *http.Request) {
	h.uploadDocument(w, r, "vehicle", r.PathValue("id"), r.PathValue("kind"))
}

func (h Handler) previewVehicleDocument(w http.ResponseWriter, r *http.Request) {
	h.previewDocument(w, r, "vehicle", r.PathValue("id"), r.PathValue("document_id"))
}

func (h Handler) deleteVehicleDocument(w http.ResponseWriter, r *http.Request) {
	h.deleteDocument(w, r, "vehicle", r.PathValue("id"), r.PathValue("document_id"))
}

func (h Handler) listDocuments(w http.ResponseWriter, r *http.Request, ownerType, ownerID, kind string) {
	documents, err := h.store.Documents(userID(r), ownerType, ownerID, kind)
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "document owner not found"})
		return
	}
	if err != nil {
		h.logger.Error("list documents failed", "error", err, "owner_type", ownerType, "owner_id", ownerID)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	writeJSON(w, http.StatusOK, documents)
}

func (h Handler) uploadDocument(w http.ResponseWriter, r *http.Request, ownerType, ownerID, kind string) {
	if h.files == nil || !h.files.Enabled() {
		h.logStorageUnavailable("document upload", "owner_type", ownerType, "owner_id", ownerID, "kind", kind)
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "PDF storage is not configured on the backend"})
		return
	}
	if !validDocumentKind(ownerType, kind) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unsupported document type"})
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxPDFUploadBytes+1024)
	if err := r.ParseMultipartForm(maxPDFUploadBytes); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "pdf must be 10 MB or smaller"})
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "pdf file is required"})
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, maxPDFUploadBytes+1))
	if err != nil || int64(len(data)) > maxPDFUploadBytes {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "pdf must be 10 MB or smaller"})
		return
	}
	if !isPDF(data, header.Header.Get("Content-Type")) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "only PDF files are supported"})
		return
	}
	documentID, err := randomAttachmentID()
	if err != nil {
		h.logger.Error("document id generation failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	objectKey := fmt.Sprintf("documents/%s/%s/%s/%s/%s.pdf", userID(r), ownerType, ownerID, kind, documentID)
	if err := h.files.Put(r.Context(), objectKey, bytes.NewReader(data), "application/pdf", int64(len(data))); err != nil {
		h.logger.Error("document upload failed", "error", err, "owner_type", ownerType, "owner_id", ownerID, "kind", kind)
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "could not upload pdf"})
		return
	}
	saved, err := h.store.CreateDocument(userID(r), domain.DocumentAttachment{ID: documentID, OwnerType: ownerType, OwnerID: ownerID, Kind: kind, ObjectKey: objectKey, FileName: cleanPDFName(header.Filename), ContentType: "application/pdf", SizeBytes: int64(len(data))})
	if errors.Is(err, store.ErrNotFound) {
		_ = h.files.Delete(context.Background(), objectKey)
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "document owner not found"})
		return
	}
	if err != nil {
		_ = h.files.Delete(context.Background(), objectKey)
		h.logger.Error("document metadata save failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not save pdf metadata"})
		return
	}
	writeJSON(w, http.StatusCreated, saved)
}

func (h Handler) previewDocument(w http.ResponseWriter, r *http.Request, ownerType, ownerID, documentID string) {
	document, err := h.store.Document(userID(r), ownerType, ownerID, documentID)
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "pdf not found"})
		return
	}
	if err != nil {
		h.logger.Error("document metadata lookup failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	h.streamPDF(w, r, document.ObjectKey, document.FileName, document.ID)
}

func (h Handler) deleteDocument(w http.ResponseWriter, r *http.Request, ownerType, ownerID, documentID string) {
	document, err := h.store.Document(userID(r), ownerType, ownerID, documentID)
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "pdf not found"})
		return
	}
	if err != nil {
		h.logger.Error("document metadata lookup failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	if err := h.files.Delete(r.Context(), document.ObjectKey); err != nil {
		h.logger.Warn("document object delete failed", "error", err, "document_id", document.ID)
	}
	if err := h.store.DeleteDocument(userID(r), ownerType, ownerID, document.ID); err != nil {
		h.logger.Error("document metadata delete failed", "error", err, "document_id", document.ID)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not remove pdf"})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func validDocumentKind(ownerType, kind string) bool {
	return (ownerType == "user" && kind == "driver_license") || (ownerType == "vehicle" && kind == "car_passport")
}

func (h Handler) streamPDF(w http.ResponseWriter, r *http.Request, objectKey, fileName, documentID string) {
	if h.files == nil || !h.files.Enabled() {
		h.logStorageUnavailable("pdf preview", "document_id", documentID)
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "PDF storage is not configured on the backend"})
		return
	}
	object, err := h.files.Get(r.Context(), objectKey)
	if err != nil {
		h.logger.Error("pdf preview failed", "error", err, "document_id", documentID)
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "could not load pdf"})
		return
	}
	defer object.Body.Close()
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", mime.FormatMediaType("inline", map[string]string{"filename": fileName}))
	if object.Size > 0 {
		w.Header().Set("Content-Length", fmt.Sprintf("%d", object.Size))
	}
	if _, err := io.Copy(w, object.Body); err != nil {
		h.logger.Warn("pdf stream interrupted", "error", err, "document_id", documentID)
	}
}

func (h Handler) logStorageUnavailable(operation string, fields ...any) {
	values := []any{"operation", operation, "storage_client_present", h.files != nil}
	if h.files != nil {
		values = append(values, "storage_enabled", h.files.Enabled())
	}
	values = append(values, fields...)
	h.logger.Error("file storage unavailable", values...)
}

func isPDF(data []byte, contentType string) bool {
	if len(data) < 4 || string(data[:4]) != "%PDF" {
		return false
	}
	mediaType, _, err := mime.ParseMediaType(contentType)
	return err != nil || mediaType == "" || mediaType == "application/pdf" || mediaType == "application/octet-stream"
}

func cleanPDFName(name string) string {
	clean := filepath.Base(strings.TrimSpace(name))
	if clean == "." || clean == "" {
		return "receipt.pdf"
	}
	if !strings.HasSuffix(strings.ToLower(clean), ".pdf") {
		clean += ".pdf"
	}
	return clean
}

func randomAttachmentID() (string, error) {
	var data [12]byte
	if _, err := rand.Read(data[:]); err != nil {
		return "", err
	}
	return "att_" + hex.EncodeToString(data[:]), nil
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
		expense.BaseCurrency = expense.FuelPriceCurrency
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
	if expense.Category != "Fuel" {
		expense.FuelLiters = 0
		expense.FuelPricePerLiterBase = 0
		expense.FuelPricePerLiterMDL = 0
		expense.FuelType = ""
		expense.FuelFullTank = false
	}
	if expense.Category != "Maintenance" {
		expense.ServiceType = ""
	}
	if expense.Category != "Insurance" && expense.Category != "Inspection" {
		expense.ExpiresDate = ""
	}
	if (expense.Category == "Insurance" || expense.Category == "Inspection") && expense.ExpiresDate == "" {
		if date, ok := parseAPIDate(expense.Date); ok {
			expense.ExpiresDate = date.AddDate(1, 0, 0).Format("2006-01-02")
		}
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

func parseAPIDate(value string) (time.Time, bool) {
	date, err := time.Parse("2006-01-02", value)
	return date, err == nil
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

func safeLogValue(value string, limit int) string {
	value = strings.TrimSpace(value)
	value = strings.ReplaceAll(value, "\n", " ")
	value = strings.ReplaceAll(value, "\r", " ")
	if len(value) <= limit {
		return value
	}
	return value[:limit]
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
