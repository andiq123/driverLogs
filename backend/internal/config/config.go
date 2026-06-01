package config

import (
	"bufio"
	"fmt"
	"net/url"
	"os"
	"strings"
)

const localJWTSecret = "local-dev-change-this-secret"

type Config struct {
	Port               string
	DatabaseURL        string
	JWTSecret          string
	CORSAllowedOrigins []string
	Production         bool
}

func Load() Config {
	loadDotEnv(".env")
	return Config{
		Port:               env("PORT", env("BACKEND_PORT", "18080")),
		DatabaseURL:        env("DATABASE_URL", "postgres://driverlogs:driverlogs@localhost:5432/driverlogs?sslmode=disable"),
		JWTSecret:          env("JWT_SECRET", localJWTSecret),
		CORSAllowedOrigins: csvEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"),
		Production:         isProductionEnvironment(),
	}
}

func loadDotEnv(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.Trim(strings.TrimSpace(value), `"'`)
		if key == "" {
			continue
		}
		if _, exists := os.LookupEnv(key); !exists {
			_ = os.Setenv(key, value)
		}
	}
}

func (c Config) Validate() error {
	if !c.Production {
		return nil
	}
	if strings.Contains(c.DatabaseURL, "localhost") || c.DatabaseURL == "" {
		return fmt.Errorf("DATABASE_URL must be configured for production")
	}
	if len(c.JWTSecret) < 32 || c.JWTSecret == localJWTSecret || strings.Contains(strings.ToLower(c.JWTSecret), "local") {
		return fmt.Errorf("JWT_SECRET must be a production secret with at least 32 characters")
	}
	for _, origin := range c.CORSAllowedOrigins {
		if !validProductionOrigin(origin) {
			return fmt.Errorf("CORS_ALLOWED_ORIGINS must use deployed HTTPS frontend origins in production")
		}
	}
	return nil
}

func env(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func isProductionEnvironment() bool {
	for _, key := range []string{"APP_ENV", "GO_ENV", "NODE_ENV", "RAILWAY_ENVIRONMENT"} {
		value := strings.ToLower(strings.TrimSpace(os.Getenv(key)))
		if value == "production" || value == "prod" {
			return true
		}
	}
	return os.Getenv("RAILWAY_PROJECT_ID") != "" || os.Getenv("RAILWAY_SERVICE_ID") != ""
}

func csvEnv(key string, fallback string) []string {
	raw := env(key, fallback)
	values := strings.Split(raw, ",")
	clean := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			clean = append(clean, value)
		}
	}
	return clean
}

func validProductionOrigin(origin string) bool {
	if origin == "*" || strings.Contains(origin, "localhost") || strings.Contains(origin, "127.0.0.1") {
		return false
	}
	parsed, err := url.Parse(origin)
	if err != nil {
		return false
	}
	return parsed.Scheme == "https" && parsed.Host != "" && parsed.Path == ""
}
