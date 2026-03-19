package handler

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/danielgtaylor/huma/v2"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/service"
)

// --- Request / Response types for Huma ---

type ListTeamTemplatesResponse struct {
	Body []dto.TeamTemplateOutput
}

type CreateTeamRunRequest struct {
	Body dto.CreateTeamRunInput
}

type CreateTeamRunResponse struct {
	Body dto.TeamRunOutput
}

type ListTeamRunsRequest struct {
	Status   string `query:"status" required:"false" enum:"pending,running,completed,failed" doc:"Filter by status"`
	TeamName string `query:"team_name" required:"false" doc:"Filter by team name"`
}

type ListTeamRunsResponse struct {
	Body []dto.TeamRunOutput
}

type GetTeamRunRequest struct {
	ID string `path:"id" doc:"Team run ID"`
}

type GetTeamRunResponse struct {
	Body dto.TeamRunOutput
}

type CancelTeamRunRequest struct {
	ID string `path:"id" doc:"Team run ID"`
}

type SyncTeamRunRequest struct {
	ID string `path:"id" doc:"Team run ID"`
}

type SyncTeamRunResponse struct {
	Body dto.TeamRunOutput
}

// registerTeamRoutes registers ClawTeam integration endpoints on the Huma API.
func registerTeamRoutes(api huma.API, svc service.ClawTeamService) {
	huma.Register(api, huma.Operation{
		OperationID: "list-team-templates",
		Method:      http.MethodGet,
		Path:        "/teams/templates",
		Summary:     "List team templates",
		Description: "Lists available ClawTeam team templates.",
		Tags:        []string{"teams"},
	}, func(ctx context.Context, input *struct{}) (*ListTeamTemplatesResponse, error) {
		templates, err := svc.ListTemplates(ctx)
		if err != nil {
			return nil, huma.Error502BadGateway("ClawTeam unavailable", err)
		}
		return &ListTeamTemplatesResponse{Body: templates}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "create-team-run",
		Method:        http.MethodPost,
		Path:          "/teams/runs",
		Summary:       "Start team run",
		Description:   "Starts a new ClawTeam team run with the specified template and task.",
		Tags:          []string{"teams"},
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, input *CreateTeamRunRequest) (*CreateTeamRunResponse, error) {
		slog.Info("starting team run", "team", input.Body.TeamName, "task", input.Body.Task)
		run, err := svc.CreateRun(ctx, input.Body)
		if err != nil {
			return nil, huma.Error502BadGateway("ClawTeam unavailable", err)
		}
		return &CreateTeamRunResponse{Body: *run}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-team-runs",
		Method:      http.MethodGet,
		Path:        "/teams/runs",
		Summary:     "List team runs",
		Description: "Lists all ClawTeam team runs with optional filters.",
		Tags:        []string{"teams"},
	}, func(ctx context.Context, input *ListTeamRunsRequest) (*ListTeamRunsResponse, error) {
		opts := dto.ListTeamRunsOptions{
			Status:   input.Status,
			TeamName: input.TeamName,
		}
		runs, err := svc.ListRuns(ctx, opts)
		if err != nil {
			return nil, huma.Error502BadGateway("ClawTeam unavailable", err)
		}
		return &ListTeamRunsResponse{Body: runs}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-team-run",
		Method:      http.MethodGet,
		Path:        "/teams/runs/{id}",
		Summary:     "Get team run",
		Description: "Retrieves a team run by ID with sub-task details.",
		Tags:        []string{"teams"},
	}, func(ctx context.Context, input *GetTeamRunRequest) (*GetTeamRunResponse, error) {
		run, err := svc.GetRun(ctx, input.ID)
		if err != nil {
			return nil, huma.Error502BadGateway("ClawTeam unavailable", err)
		}
		return &GetTeamRunResponse{Body: *run}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "cancel-team-run",
		Method:        http.MethodDelete,
		Path:          "/teams/runs/{id}",
		Summary:       "Cancel team run",
		Description:   "Cancels a running team execution.",
		Tags:          []string{"teams"},
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, input *CancelTeamRunRequest) (*struct{}, error) {
		slog.Info("cancelling team run", "id", input.ID)
		if err := svc.CancelRun(ctx, input.ID); err != nil {
			return nil, huma.Error502BadGateway("ClawTeam unavailable", err)
		}
		return nil, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "sync-team-run",
		Method:      http.MethodPost,
		Path:        "/teams/runs/{id}/sync",
		Summary:     "Sync team run",
		Description: "Manually syncs the status of a team run from ClawTeam.",
		Tags:        []string{"teams"},
	}, func(ctx context.Context, input *SyncTeamRunRequest) (*SyncTeamRunResponse, error) {
		run, err := svc.SyncRun(ctx, input.ID)
		if err != nil {
			return nil, huma.Error502BadGateway("ClawTeam unavailable", err)
		}
		return &SyncTeamRunResponse{Body: *run}, nil
	})
}
