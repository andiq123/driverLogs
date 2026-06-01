package config

import "os"

type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
}

func Load() Config {
	return Config{
		Port:        env("PORT", env("BACKEND_PORT", "18080")),
		DatabaseURL: env("DATABASE_URL", "postgres://driverlogs:driverlogs@localhost:5432/driverlogs?sslmode=disable"),
		JWTSecret:   env("JWT_SECRET", "local-dev-change-this-secret"),
	}
}

func env(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
