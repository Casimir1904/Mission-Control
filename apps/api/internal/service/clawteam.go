package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/clawteam"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
)

// ClawTeamService manages ClawTeam team operations.
type ClawTeamService interface {
	ListTemplates(ctx context.Context) ([]dto.TeamTemplateOutput, error)
	CreateRun(ctx context.Context, input dto.CreateTeamRunInput) (*dto.TeamRunOutput, error)
	GetRun(ctx context.Context, id string) (*dto.TeamRunOutput, error)
	ListRuns(ctx context.Context, opts dto.ListTeamRunsOptions) ([]dto.TeamRunOutput, error)
	CancelRun(ctx context.Context, id string) error
	SyncRun(ctx context.Context, id string) (*dto.TeamRunOutput, error)
}

type clawTeamService struct {
	client *clawteam.Client
}

// NewClawTeamService creates a new ClawTeamService.
func NewClawTeamService(client *clawteam.Client) ClawTeamService {
	return &clawTeamService{client: client}
}

func (s *clawTeamService) ListTemplates(ctx context.Context) ([]dto.TeamTemplateOutput, error) {
	templates, err := s.client.ListTemplates(ctx)
	if err != nil {
		return nil, fmt.Errorf("clawteam.ListTemplates: %w", err)
	}

	out := make([]dto.TeamTemplateOutput, len(templates))
	for i, t := range templates {
		out[i] = dto.TeamTemplateOutput{
			Name:        t.Name,
			Description: t.Description,
			Roles:       t.Roles,
			AgentCount:  t.AgentCount,
		}
	}
	return out, nil
}

func (s *clawTeamService) CreateRun(ctx context.Context, input dto.CreateTeamRunInput) (*dto.TeamRunOutput, error) {
	run, err := s.client.CreateRun(ctx, clawteam.CreateRunRequest{
		TeamName: input.TeamName,
		Task:     input.Task,
	})
	if err != nil {
		return nil, fmt.Errorf("clawteam.CreateRun: %w", err)
	}

	slog.Info("clawteam: team run created",
		"run_id", run.ID,
		"team", run.TeamName,
		"task", run.Task,
	)

	return toTeamRunOutput(run, input.BoardID), nil
}

func (s *clawTeamService) GetRun(ctx context.Context, id string) (*dto.TeamRunOutput, error) {
	run, err := s.client.GetRun(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("clawteam.GetRun: %w", err)
	}
	return toTeamRunOutput(run, ""), nil
}

func (s *clawTeamService) ListRuns(ctx context.Context, opts dto.ListTeamRunsOptions) ([]dto.TeamRunOutput, error) {
	runs, err := s.client.ListRuns(ctx)
	if err != nil {
		return nil, fmt.Errorf("clawteam.ListRuns: %w", err)
	}

	out := make([]dto.TeamRunOutput, 0, len(runs))
	for _, r := range runs {
		// Apply client-side filtering if ClawTeam API doesn't support it.
		if opts.Status != "" && r.Status != opts.Status {
			continue
		}
		if opts.TeamName != "" && r.TeamName != opts.TeamName {
			continue
		}
		out = append(out, *toTeamRunOutput(&r, ""))
	}
	return out, nil
}

func (s *clawTeamService) CancelRun(ctx context.Context, id string) error {
	if err := s.client.CancelRun(ctx, id); err != nil {
		return fmt.Errorf("clawteam.CancelRun: %w", err)
	}
	slog.Info("clawteam: team run cancelled", "run_id", id)
	return nil
}

func (s *clawTeamService) SyncRun(ctx context.Context, id string) (*dto.TeamRunOutput, error) {
	run, err := s.client.GetRun(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("clawteam.SyncRun: %w", err)
	}
	slog.Info("clawteam: team run synced", "run_id", id, "status", run.Status)
	return toTeamRunOutput(run, ""), nil
}

func toTeamRunOutput(run *clawteam.TeamRun, boardID string) *dto.TeamRunOutput {
	subTasks := make([]dto.SubTaskOutput, len(run.SubTasks))
	for i, st := range run.SubTasks {
		subTasks[i] = dto.SubTaskOutput{
			ID:        st.ID,
			Title:     st.Title,
			Agent:     st.Agent,
			Status:    st.Status,
			DependsOn: st.DependsOn,
			Result:    st.Result,
		}
	}

	return &dto.TeamRunOutput{
		ID:        run.ID,
		TeamName:  run.TeamName,
		Task:      run.Task,
		Status:    run.Status,
		SubTasks:  subTasks,
		Result:    run.Result,
		BoardID:   boardID,
		StartedAt: run.StartedAt,
		EndedAt:   run.EndedAt,
	}
}
