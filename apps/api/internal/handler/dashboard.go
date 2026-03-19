package handler

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/service"
)

// --- Request / Response types for Huma ---

type GetDashboardResponse struct {
	Body dto.DashboardOverview
}

// registerDashboardRoutes registers dashboard endpoints on the Huma API.
func registerDashboardRoutes(api huma.API, dashboardSvc service.DashboardService) {
	huma.Register(api, huma.Operation{
		OperationID: "get-dashboard",
		Method:      http.MethodGet,
		Path:        "/dashboard",
		Summary:     "Get dashboard overview",
		Description: "Returns aggregated statistics for the dashboard including agent/task counts, pending approvals, and recent activity.",
		Tags:        []string{"dashboard"},
	}, func(ctx context.Context, input *struct{}) (*GetDashboardResponse, error) {
		overview, err := dashboardSvc.GetOverview(ctx)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &GetDashboardResponse{Body: *overview}, nil
	})
}
