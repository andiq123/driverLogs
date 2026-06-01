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

type ValidationError struct {
	Field  string
	Detail string
}

func (e ValidationError) Error() string {
	return e.Field + ": " + e.Detail
}

func Load() Config {
	loadDotEnv(".env")
	return Config{
		Port:               env("PORT", env("BACKEND_PORT", "18080")),
		DatabaseURL:        databaseURL(),
		JWTSecret:          env("JWT_SECRET", localJWTSecret),
		CORSAllowedOrigins: allowedOrigins(),
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
		return ValidationError{Field: "DATABASE_URL", Detail: "set DATABASE_URL or Railway POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, and POSTGRES_DB"}
	}
	if len(c.JWTSecret) < 32 || c.JWTSecret == localJWTSecret || strings.Contains(strings.ToLower(c.JWTSecret), "local") {
		return ValidationError{Field: "JWT_SECRET", Detail: "must be a production secret with at least 32 characters"}
	}
	if len(c.CORSAllowedOrigins) == 0 {
		return ValidationError{Field: "CORS_ALLOWED_ORIGINS", Detail: "set the deployed frontend origin, for example https://driver-logs-two.vercel.app"}
	}
	for _, origin := range c.CORSAllowedOrigins {
		if !validProductionOrigin(origin) {
			return ValidationError{Field: "CORS_ALLOWED_ORIGINS", Detail: fmt.Sprintf("%q is not a deployed HTTPS origin", origin)}
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

func databaseURL() string {
	if value := os.Getenv("DATABASE_URL"); value != "" {
		return value
	}
	host := os.Getenv("POSTGRES_HOST")
	port := env("POSTGRES_PORT", "5432")
	user := os.Getenv("POSTGRES_USER")
	password := os.Getenv("POSTGRES_PASSWORD")
	database := os.Getenv("POSTGRES_DB")
	if host != "" && user != "" && password != "" && database != "" {
		values := url.Values{}
		values.Set("sslmode", "disable")
		return (&url.URL{
			Scheme:   "postgres",
			User:     url.UserPassword(user, password),
			Host:     host + ":" + port,
			Path:     database,
			RawQuery: values.Encode(),
		}).String()
	}
	return "postgres://driverlogs:driverlogs@localhost:5432/driverlogs?sslmode=disable"
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

func allowedOrigins() []string {
	origins := csvEnv("CORS_ALLOWED_ORIGINS", "")
	origins = append(origins, csvEnv("ALLOWED_ORIGINS", "")...)
	for _, key := range []string{"FRONTEND_URL", "NEXT_PUBLIC_APP_URL"} {
		if value := strings.TrimSpace(os.Getenv(key)); value != "" {
			origins = append(origins, value)
		}
	}
	if value := strings.TrimSpace(os.Getenv("VERCEL_URL")); value != "" {
		origins = append(origins, "https://"+strings.TrimPrefix(value, "https://"))
	}
	if len(origins) == 0 && !isProductionEnvironment() {
		return []string{"http://localhost:3000", "http://127.0.0.1:3000"}
	}
	return uniqueStrings(origins)
}

func uniqueStrings(values []string) []string {
	seen := map[string]struct{}{}
	unique := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimRight(strings.TrimSpace(value), "/")
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		unique = append(unique, value)
	}
	return unique
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
