package config

import "os"

type Config struct {
	Port           string
	AllowedOrigins []string
	Environment    string
	BaseURL        string
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

	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:3000"
	}

	origins := []string{"http://localhost:3000"}
	if env == "production" {
		origins = append(origins, "https://maple.dev", "https://*.railway.app")
	}

	return &Config{
		Port:           port,
		AllowedOrigins: origins,
		Environment:    env,
		BaseURL:        baseURL,
	}
}
