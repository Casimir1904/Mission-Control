package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config holds all configuration values for the API server.
type Config struct {
	// Database connection string.
	DatabaseURL string

	// Redis connection URL.
	RedisURL string

	// NATS connection URL.
	NATSURL string

	// HTTP server port.
	Port int

	// OIDC issuer URL for JWT validation.
	OIDCIssuer string

	// OIDC audience for JWT validation.
	OIDCAudience string

	// Structured log level (debug, info, warn, error).
	LogLevel string

	// Allowed CORS origins.
	AllowedOrigins []string

	// DeviceIdentityDir is the filesystem path where the Ed25519 device
	// identity keypair is stored. This identity is used for authenticating
	// with OpenClaw gateways in device mode (required for non-localhost
	// connections). The directory must be persistent across restarts.
	DeviceIdentityDir string
}

// Load reads configuration from environment variables and returns a Config.
// Required variables will cause an error if missing.
func Load() (*Config, error) {
	cfg := &Config{
		DatabaseURL:  os.Getenv("DATABASE_URL"),
		RedisURL:     os.Getenv("REDIS_URL"),
		NATSURL:      os.Getenv("NATS_URL"),
		OIDCIssuer:   os.Getenv("OIDC_ISSUER"),
		OIDCAudience: os.Getenv("OIDC_AUDIENCE"),
		LogLevel:     envOrDefault("LOG_LEVEL", "info"),
	}

	port, err := strconv.Atoi(envOrDefault("PORT", "8000"))
	if err != nil {
		return nil, fmt.Errorf("parse PORT: %w", err)
	}
	cfg.Port = port

	if origins := os.Getenv("ALLOWED_ORIGINS"); origins != "" {
		cfg.AllowedOrigins = strings.Split(origins, ",")
		for i := range cfg.AllowedOrigins {
			cfg.AllowedOrigins[i] = strings.TrimSpace(cfg.AllowedOrigins[i])
		}
	}

	cfg.DeviceIdentityDir = envOrDefault("DEVICE_IDENTITY_DIR", "/data/device-identity")

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("validate config: DATABASE_URL is required")
	}

	return cfg, nil
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
