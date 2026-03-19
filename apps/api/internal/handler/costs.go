package handler

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/service"
)

// --- Request / Response types for Huma ---

type RecordCostRequest struct {
	Body dto.RecordCostInput
}

type RecordCostResponse struct {
	Body dto.CostRecordOutput
}

type GetCostSummaryRequest struct {
	BoardID string `query:"board_id" required:"false" doc:"Filter by board (UUID)"`
	AgentID string `query:"agent_id" required:"false" doc:"Filter by agent (UUID)"`
	Days    int    `query:"days" required:"false" minimum:"1" maximum:"365" default:"7" doc:"Number of days to aggregate (7, 30, or 90)"`
}

type GetCostSummaryResponse struct {
	Body dto.CostSummaryOutput
}

type ListCostRecordsRequest struct {
	PaginationParams
	BoardID string `query:"board_id" required:"false" doc:"Filter by board (UUID)"`
	AgentID string `query:"agent_id" required:"false" doc:"Filter by agent (UUID)"`
	Days    int    `query:"days" required:"false" minimum:"1" maximum:"365" doc:"Filter to last N days"`
}

type ListCostRecordsResponse struct {
	Body dto.PaginatedResponse[dto.CostRecordOutput]
}

// registerCostRoutes registers all cost tracking endpoints on the Huma API.
func registerCostRoutes(api huma.API, costSvc service.CostService) {
	huma.Register(api, huma.Operation{
		OperationID:   "record-cost",
		Method:        http.MethodPost,
		Path:          "/costs",
		Summary:       "Record a cost event",
		Description:   "Records a new cost event for an agent's token usage.",
		Tags:          []string{"costs"},
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, input *RecordCostRequest) (*RecordCostResponse, error) {
		slog.Info("recording cost", "agent_id", input.Body.AgentID, "amount", input.Body.Amount)
		record, err := costSvc.Record(ctx, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &RecordCostResponse{Body: *record}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-cost-summary",
		Method:      http.MethodGet,
		Path:        "/costs/summary",
		Summary:     "Get cost summary",
		Description: "Returns aggregated cost data including totals by agent, model, board, and daily trend.",
		Tags:        []string{"costs"},
	}, func(ctx context.Context, input *GetCostSummaryRequest) (*GetCostSummaryResponse, error) {
		opts := dto.CostSummaryOptions{
			Days: input.Days,
		}
		if input.BoardID != "" {
			parsed, err := uuid.Parse(input.BoardID)
			if err != nil {
				return nil, huma.Error400BadRequest("invalid board_id format")
			}
			opts.BoardID = &parsed
		}
		if input.AgentID != "" {
			parsed, err := uuid.Parse(input.AgentID)
			if err != nil {
				return nil, huma.Error400BadRequest("invalid agent_id format")
			}
			opts.AgentID = &parsed
		}

		summary, err := costSvc.GetSummary(ctx, opts)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &GetCostSummaryResponse{Body: *summary}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-cost-records",
		Method:      http.MethodGet,
		Path:        "/costs",
		Summary:     "List cost records",
		Description: "Lists individual cost records with optional filters and pagination.",
		Tags:        []string{"costs"},
	}, func(ctx context.Context, input *ListCostRecordsRequest) (*ListCostRecordsResponse, error) {
		opts := dto.ListCostRecordOptions{
			ListOptions: input.PaginationParams.ToListOptions(),
			Days:        input.Days,
		}
		if input.BoardID != "" {
			parsed, err := uuid.Parse(input.BoardID)
			if err != nil {
				return nil, huma.Error400BadRequest("invalid board_id format")
			}
			opts.BoardID = &parsed
		}
		if input.AgentID != "" {
			parsed, err := uuid.Parse(input.AgentID)
			if err != nil {
				return nil, huma.Error400BadRequest("invalid agent_id format")
			}
			opts.AgentID = &parsed
		}

		result, err := costSvc.ListRecords(ctx, opts)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &ListCostRecordsResponse{Body: *result}, nil
	})
}
