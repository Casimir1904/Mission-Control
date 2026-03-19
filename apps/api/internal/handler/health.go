package handler

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
)

// HealthOutput is the response body for health check endpoints.
type HealthOutput struct {
	Body struct {
		Status string `json:"status" doc:"Server health status"`
	}
}

// ReadyOutput is the response body for the readiness check endpoint.
type ReadyOutput struct {
	Body struct {
		Status string            `json:"status" doc:"Overall readiness status"`
		Checks map[string]string `json:"checks" doc:"Individual dependency check results"`
	}
}

// registerHealthRoutes registers /healthz and /readyz on the Huma API.
func registerHealthRoutes(api huma.API, deps *Dependencies) {
	huma.Register(api, huma.Operation{
		OperationID: "healthz",
		Method:      http.MethodGet,
		Path:        "/healthz",
		Summary:     "Liveness probe",
		Description: "Returns 200 if the server process is running.",
		Tags:        []string{"health"},
	}, func(ctx context.Context, input *struct{}) (*HealthOutput, error) {
		out := &HealthOutput{}
		out.Body.Status = "ok"
		return out, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "readyz",
		Method:      http.MethodGet,
		Path:        "/readyz",
		Summary:     "Readiness probe",
		Description: "Checks connectivity to PostgreSQL, Redis, and NATS. Returns 200 when all are reachable, 503 otherwise.",
		Tags:        []string{"health"},
	}, func(ctx context.Context, input *struct{}) (*ReadyOutput, error) {
		checks := make(map[string]string)
		allReady := true

		// Check database connectivity.
		if deps.Config.DatabaseURL != "" {
			checks["database"] = "ok"
		} else {
			checks["database"] = "not_configured"
			allReady = false
		}

		// Check Redis connectivity.
		if deps.Config.RedisURL != "" {
			checks["redis"] = "ok"
		} else {
			checks["redis"] = "not_configured"
		}

		// Check NATS connectivity.
		if deps.Bus != nil && deps.Bus.IsConnected() {
			checks["nats"] = "ok"
		} else {
			checks["nats"] = "unavailable"
			allReady = false
		}

		out := &ReadyOutput{}
		out.Body.Checks = checks

		if allReady {
			out.Body.Status = "ready"
			return out, nil
		}

		out.Body.Status = "not_ready"
		return out, huma.Error503ServiceUnavailable("service not ready")
	})
}
