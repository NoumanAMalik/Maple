package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port               string
	AllowedOrigins     []string
	Environment        string
	BaseURL            string
	DatabaseURL        string
	JWTSigningKey      string
	RefreshTokenPepper string
	AccessTokenExpiry  time.Duration
	RefreshTokenExpiry time.Duration
	RefreshCookieName  string
	CookieDomain       string
	CookieSecure       bool
	CookieSameSite     string
	LogLevel           string
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	env := os.Getenv("ENVIRONMENT")
	if env == "" {
		env = "development"
	}

	baseURL := os.Getenv("PUBLIC_BASE_URL")
	if baseURL == "" {
		baseURL = os.Getenv("BASE_URL")
	}
	if baseURL == "" {
		baseURL = "http://localhost:3000"
	}

	origins := buildAllowedOrigins(env)
	if corsOrigins := strings.TrimSpace(os.Getenv("CORS_ORIGINS")); corsOrigins != "" {
		origins = splitAndTrim(corsOrigins)
	}

	accessExpiry := parseDuration(os.Getenv("ACCESS_TOKEN_EXPIRY"), 15*time.Minute)
	refreshExpiry := parseDuration(os.Getenv("REFRESH_TOKEN_EXPIRY"), 720*time.Hour)

	cookieSecure := env == "production"
	if raw := strings.TrimSpace(os.Getenv("COOKIE_SECURE")); raw != "" {
		if parsed, err := strconv.ParseBool(raw); err == nil {
			cookieSecure = parsed
		}
	}

	cookieSameSite := strings.TrimSpace(os.Getenv("COOKIE_SAMESITE"))
	if cookieSameSite == "" {
		cookieSameSite = "lax"
	}

	logLevel := strings.TrimSpace(os.Getenv("LOG_LEVEL"))
	if logLevel == "" {
		logLevel = "info"
	}

	return &Config{
		Port:               port,
		AllowedOrigins:     origins,
		Environment:        env,
		BaseURL:            baseURL,
		DatabaseURL:        strings.TrimSpace(os.Getenv("DATABASE_URL")),
		JWTSigningKey:      strings.TrimSpace(os.Getenv("JWT_SIGNING_KEY")),
		RefreshTokenPepper: strings.TrimSpace(os.Getenv("REFRESH_TOKEN_PEPPER")),
		AccessTokenExpiry:  accessExpiry,
		RefreshTokenExpiry: refreshExpiry,
		RefreshCookieName:  fallbackString(os.Getenv("REFRESH_COOKIE_NAME"), "maple_refresh"),
		CookieDomain:       strings.TrimSpace(os.Getenv("COOKIE_DOMAIN")),
		CookieSecure:       cookieSecure,
		CookieSameSite:     strings.ToLower(cookieSameSite),
		LogLevel:           logLevel,
	}
}

func buildAllowedOrigins(env string) []string {
	origins := []string{"http://localhost:3000"}
	if env == "production" {
		origins = append(origins,
			"https://trymaple.dev",
			"https://www.trymaple.dev",
			"https://maple.dev",
			"https://www.maple.dev",
			"https://*.vercel.app",
			"https://*.railway.app",
		)
	}
	return origins
}

func parseDuration(raw string, fallback time.Duration) time.Duration {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(raw)
	if err != nil {
		return fallback
	}
	return parsed
}

func splitAndTrim(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		out = append(out, trimmed)
	}
	return out
}

func fallbackString(value, fallback string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return fallback
	}
	return trimmed
}
