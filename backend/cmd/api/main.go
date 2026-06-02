package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"

	"driverlogs/backend/internal/config"
	"driverlogs/backend/internal/database"
	"driverlogs/backend/internal/fuelprices"
	"driverlogs/backend/internal/httpapi"
	filestorage "driverlogs/backend/internal/storage"
	"driverlogs/backend/internal/store"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		fields := []any{"error", err.Error()}
		if validationErr, ok := err.(config.ValidationError); ok {
			fields = append(fields, "field", validationErr.Field, "detail", validationErr.Detail)
		}
		logger.Error("invalid configuration", fields...)
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("postgres unavailable", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	repo, err := store.NewPostgresStore(ctx, db.Pool())
	if err != nil {
		logger.Error("postgres store unavailable", "error", err)
		os.Exit(1)
	}
	files, err := filestorage.New(ctx, cfg.Storage)
	if err != nil {
		logger.Error("file storage unavailable", "error", err)
		os.Exit(1)
	}
	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           httpapi.NewRouter(repo, db, fuelprices.NewService(), files, cfg.JWTSecret, cfg.CORSAllowedOrigins),
		ReadHeaderTimeout: 5 * time.Second,
	}

	logger.Info("driverlogs api listening", "port", cfg.Port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Error("api server stopped", "error", err)
		os.Exit(1)
	}
}
