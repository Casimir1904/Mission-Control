package config_test

import (
	"os"
	"testing"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/config"
)

// clearEnv unsets all config-related environment variables to ensure a clean
// test state. Returns a cleanup function that restores original values.
func clearEnv(t *testing.T) func() {
	t.Helper()

	keys := []string{
		"DATABASE_URL", "REDIS_URL", "NATS_URL",
		"OIDC_ISSUER", "OIDC_AUDIENCE",
		"PORT", "LOG_LEVEL", "ALLOWED_ORIGINS",
		"DEVICE_IDENTITY_DIR",
	}

	saved := make(map[string]string)
	for _, k := range keys {
		if v, ok := os.LookupEnv(k); ok {
			saved[k] = v
		}
		os.Unsetenv(k)
	}

	return func() {
		for _, k := range keys {
			if v, ok := saved[k]; ok {
				os.Setenv(k, v)
			} else {
				os.Unsetenv(k)
			}
		}
	}
}

// TestLoad_MissingDatabaseURL verifies that Load returns an error when
// DATABASE_URL is not set.
func TestLoad_MissingDatabaseURL(t *testing.T) {
	restore := clearEnv(t)
	defer restore()

	_, err := config.Load()
	if err == nil {
		t.Fatal("Load() should return error when DATABASE_URL is missing")
	}
}

// TestLoad_DefaultPort verifies that the default port is 8000 when PORT is unset.
func TestLoad_DefaultPort(t *testing.T) {
	restore := clearEnv(t)
	defer restore()

	os.Setenv("DATABASE_URL", "postgres://localhost/test")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.Port != 8000 {
		t.Errorf("Port = %d, want 8000", cfg.Port)
	}
}

// TestLoad_CustomPort verifies PORT env var is parsed correctly.
func TestLoad_CustomPort(t *testing.T) {
	restore := clearEnv(t)
	defer restore()

	os.Setenv("DATABASE_URL", "postgres://localhost/test")
	os.Setenv("PORT", "9090")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.Port != 9090 {
		t.Errorf("Port = %d, want 9090", cfg.Port)
	}
}

// TestLoad_InvalidPort verifies that a non-numeric PORT returns an error.
func TestLoad_InvalidPort(t *testing.T) {
	restore := clearEnv(t)
	defer restore()

	os.Setenv("DATABASE_URL", "postgres://localhost/test")
	os.Setenv("PORT", "not-a-number")

	_, err := config.Load()
	if err == nil {
		t.Fatal("Load() should return error for non-numeric PORT")
	}
}

// TestLoad_DefaultLogLevel verifies the default log level is "info".
func TestLoad_DefaultLogLevel(t *testing.T) {
	restore := clearEnv(t)
	defer restore()

	os.Setenv("DATABASE_URL", "postgres://localhost/test")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.LogLevel != "info" {
		t.Errorf("LogLevel = %q, want %q", cfg.LogLevel, "info")
	}
}

// TestLoad_CustomLogLevel verifies LOG_LEVEL env var overrides the default.
func TestLoad_CustomLogLevel(t *testing.T) {
	restore := clearEnv(t)
	defer restore()

	os.Setenv("DATABASE_URL", "postgres://localhost/test")
	os.Setenv("LOG_LEVEL", "debug")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.LogLevel != "debug" {
		t.Errorf("LogLevel = %q, want %q", cfg.LogLevel, "debug")
	}
}

// TestLoad_DefaultDeviceIdentityDir verifies the default device identity directory.
func TestLoad_DefaultDeviceIdentityDir(t *testing.T) {
	restore := clearEnv(t)
	defer restore()

	os.Setenv("DATABASE_URL", "postgres://localhost/test")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.DeviceIdentityDir != "/data/device-identity" {
		t.Errorf("DeviceIdentityDir = %q, want %q", cfg.DeviceIdentityDir, "/data/device-identity")
	}
}

// TestLoad_CustomDeviceIdentityDir verifies the env var override.
func TestLoad_CustomDeviceIdentityDir(t *testing.T) {
	restore := clearEnv(t)
	defer restore()

	os.Setenv("DATABASE_URL", "postgres://localhost/test")
	os.Setenv("DEVICE_IDENTITY_DIR", "/custom/path")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.DeviceIdentityDir != "/custom/path" {
		t.Errorf("DeviceIdentityDir = %q, want %q", cfg.DeviceIdentityDir, "/custom/path")
	}
}

// TestLoad_AllowedOrigins_Parsing verifies comma-separated ALLOWED_ORIGINS
// are split and trimmed correctly.
func TestLoad_AllowedOrigins_Parsing(t *testing.T) {
	restore := clearEnv(t)
	defer restore()

	os.Setenv("DATABASE_URL", "postgres://localhost/test")
	os.Setenv("ALLOWED_ORIGINS", "http://localhost:3000 , https://app.example.com , https://admin.example.com")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	want := []string{
		"http://localhost:3000",
		"https://app.example.com",
		"https://admin.example.com",
	}
	if len(cfg.AllowedOrigins) != len(want) {
		t.Fatalf("AllowedOrigins length = %d, want %d", len(cfg.AllowedOrigins), len(want))
	}
	for i, got := range cfg.AllowedOrigins {
		if got != want[i] {
			t.Errorf("AllowedOrigins[%d] = %q, want %q", i, got, want[i])
		}
	}
}

// TestLoad_AllowedOrigins_Empty verifies that when ALLOWED_ORIGINS is unset,
// the slice is nil.
func TestLoad_AllowedOrigins_Empty(t *testing.T) {
	restore := clearEnv(t)
	defer restore()

	os.Setenv("DATABASE_URL", "postgres://localhost/test")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.AllowedOrigins != nil {
		t.Errorf("AllowedOrigins = %v, want nil", cfg.AllowedOrigins)
	}
}

// TestLoad_FullConfig verifies all fields are populated when all env vars are set.
func TestLoad_FullConfig(t *testing.T) {
	restore := clearEnv(t)
	defer restore()

	os.Setenv("DATABASE_URL", "postgres://user:pass@db:5432/mc")
	os.Setenv("REDIS_URL", "redis://redis:6379")
	os.Setenv("NATS_URL", "nats://nats:4222")
	os.Setenv("PORT", "3000")
	os.Setenv("OIDC_ISSUER", "https://auth.example.com")
	os.Setenv("OIDC_AUDIENCE", "mission-control-api")
	os.Setenv("LOG_LEVEL", "warn")
	os.Setenv("ALLOWED_ORIGINS", "https://app.example.com")
	os.Setenv("DEVICE_IDENTITY_DIR", "/vol/identity")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.DatabaseURL != "postgres://user:pass@db:5432/mc" {
		t.Errorf("DatabaseURL = %q", cfg.DatabaseURL)
	}
	if cfg.RedisURL != "redis://redis:6379" {
		t.Errorf("RedisURL = %q", cfg.RedisURL)
	}
	if cfg.NATSURL != "nats://nats:4222" {
		t.Errorf("NATSURL = %q", cfg.NATSURL)
	}
	if cfg.Port != 3000 {
		t.Errorf("Port = %d", cfg.Port)
	}
	if cfg.OIDCIssuer != "https://auth.example.com" {
		t.Errorf("OIDCIssuer = %q", cfg.OIDCIssuer)
	}
	if cfg.OIDCAudience != "mission-control-api" {
		t.Errorf("OIDCAudience = %q", cfg.OIDCAudience)
	}
	if cfg.LogLevel != "warn" {
		t.Errorf("LogLevel = %q", cfg.LogLevel)
	}
	if cfg.DeviceIdentityDir != "/vol/identity" {
		t.Errorf("DeviceIdentityDir = %q", cfg.DeviceIdentityDir)
	}
}
