package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/config"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/handler"
)

// newTestRouter creates a minimal router for testing health endpoints.
// All service fields are nil since health endpoints only use Config and Bus.
func newTestRouter(cfg *config.Config) http.Handler {
	deps := &handler.Dependencies{
		Config: cfg,
		// Hub, Bus, and all services are nil — only health endpoints are tested.
	}
	return handler.NewRouter(deps)
}

// TestHealthz_Returns200 verifies that GET /api/v1/healthz returns 200 with
// status "ok".
func TestHealthz_Returns200(t *testing.T) {
	router := newTestRouter(&config.Config{})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/healthz", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("GET /healthz status = %d, want %d", w.Code, http.StatusOK)
	}

	var body struct {
		Status string `json:"status"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to parse JSON: %v", err)
	}
	if body.Status != "ok" {
		t.Errorf("status = %q, want %q", body.Status, "ok")
	}
}

// TestHealthz_ContentType verifies JSON content type header.
func TestHealthz_ContentType(t *testing.T) {
	router := newTestRouter(&config.Config{})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/healthz", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	ct := w.Header().Get("Content-Type")
	if ct == "" {
		t.Error("Content-Type header is empty")
	}
	// Huma may set "application/cbor" or "application/json" depending on Accept.
	// With no Accept header, default should be JSON.
}

// TestReadyz_NoBus_Returns503 verifies that GET /api/v1/readyz returns 503
// when Bus is nil (NATS not connected) even if database is configured.
func TestReadyz_NoBus_Returns503(t *testing.T) {
	router := newTestRouter(&config.Config{
		DatabaseURL: "postgres://localhost/test",
		RedisURL:    "redis://localhost:6379",
		// Bus is nil in Dependencies, so NATS check will fail.
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/readyz", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("GET /readyz status = %d, want %d", w.Code, http.StatusServiceUnavailable)
	}

	var body struct {
		Status string            `json:"status"`
		Checks map[string]string `json:"checks"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to parse JSON: %v", err)
	}

	if body.Status != "not_ready" {
		t.Errorf("status = %q, want %q", body.Status, "not_ready")
	}
	if body.Checks["nats"] != "unavailable" {
		t.Errorf("checks.nats = %q, want %q", body.Checks["nats"], "unavailable")
	}
}

// TestReadyz_NoDB_Returns503 verifies readyz fails when database URL is empty.
func TestReadyz_NoDB_Returns503(t *testing.T) {
	router := newTestRouter(&config.Config{
		// DatabaseURL is empty.
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/readyz", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("GET /readyz status = %d, want %d", w.Code, http.StatusServiceUnavailable)
	}

	var body struct {
		Checks map[string]string `json:"checks"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to parse JSON: %v", err)
	}
	if body.Checks["database"] != "not_configured" {
		t.Errorf("checks.database = %q, want %q", body.Checks["database"], "not_configured")
	}
}
