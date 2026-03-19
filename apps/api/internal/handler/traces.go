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

type IngestTraceRequest struct {
	Body dto.IngestTraceInput
}

type IngestTraceResponse struct {
	Body dto.TraceOutput
}

type GetTraceRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Trace ID"`
}

type GetTraceResponse struct {
	Body dto.TraceOutput
}

type ListTracesRequest struct {
	PaginationParams
	AgentID string `query:"agent_id" required:"false" doc:"Filter by agent (UUID)"`
	Days    int    `query:"days" required:"false" minimum:"1" maximum:"365" doc:"Filter to last N days"`
}

type ListTracesResponse struct {
	Body dto.PaginatedResponse[dto.TraceOutput]
}

// registerTraceRoutes registers all trace endpoints on the Huma API.
func registerTraceRoutes(api huma.API, traceSvc service.TraceService) {
	huma.Register(api, huma.Operation{
		OperationID:   "ingest-trace",
		Method:        http.MethodPost,
		Path:          "/traces",
		Summary:       "Ingest a trace",
		Description:   "Ingests a complete trace with nested spans from an agent execution.",
		Tags:          []string{"traces"},
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, input *IngestTraceRequest) (*IngestTraceResponse, error) {
		slog.Info("ingesting trace", "trace_id", input.Body.TraceID, "agent_id", input.Body.AgentID)
		t, err := traceSvc.IngestTrace(ctx, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &IngestTraceResponse{Body: *t}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-trace",
		Method:      http.MethodGet,
		Path:        "/traces/{id}",
		Summary:     "Get trace detail",
		Description: "Retrieves a trace by ID with all its spans.",
		Tags:        []string{"traces"},
	}, func(ctx context.Context, input *GetTraceRequest) (*GetTraceResponse, error) {
		t, err := traceSvc.Get(ctx, input.ID)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &GetTraceResponse{Body: *t}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-traces",
		Method:      http.MethodGet,
		Path:        "/traces",
		Summary:     "List traces",
		Description: "Lists traces with optional filters and pagination.",
		Tags:        []string{"traces"},
	}, func(ctx context.Context, input *ListTracesRequest) (*ListTracesResponse, error) {
		opts := dto.ListTraceOptions{
			ListOptions: input.PaginationParams.ToListOptions(),
			Days:        input.Days,
		}
		if input.AgentID != "" {
			parsed, err := uuid.Parse(input.AgentID)
			if err != nil {
				return nil, huma.Error400BadRequest("invalid agent_id format")
			}
			opts.AgentID = &parsed
		}

		result, err := traceSvc.List(ctx, opts)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &ListTracesResponse{Body: *result}, nil
	})
}
