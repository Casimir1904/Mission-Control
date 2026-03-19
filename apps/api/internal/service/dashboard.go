package service

import (
	"context"
	"fmt"
	"time"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/agent"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/task"
)

// DashboardService defines the interface for dashboard aggregation operations.
type DashboardService interface {
	GetOverview(ctx context.Context) (*dto.DashboardOverview, error)
}

type dashboardService struct {
	client      *generated.Client
	approvalSvc ApprovalService
	activitySvc ActivityService
}

// NewDashboardService creates a new DashboardService backed by the Ent client.
func NewDashboardService(client *generated.Client, approvalSvc ApprovalService, activitySvc ActivityService) DashboardService {
	return &dashboardService{
		client:      client,
		approvalSvc: approvalSvc,
		activitySvc: activitySvc,
	}
}

func (s *dashboardService) GetOverview(ctx context.Context) (*dto.DashboardOverview, error) {
	overview := &dto.DashboardOverview{
		AgentsByStatus: make(map[string]int),
		TasksByStatus:  make(map[string]int),
	}

	// Aggregate agents by status.
	agentStatuses := []agent.Status{
		agent.StatusOnline,
		agent.StatusOffline,
		agent.StatusDegraded,
		agent.StatusProvisioning,
	}
	for _, status := range agentStatuses {
		count, err := s.client.Agent.Query().
			Where(agent.StatusEQ(status)).
			Count(ctx)
		if err != nil {
			return nil, fmt.Errorf("service.DashboardService.GetOverview agent count (%s): %w", status, err)
		}
		overview.AgentsByStatus[string(status)] = count
	}

	// Aggregate tasks by status.
	taskStatuses := []task.Status{
		task.StatusBacklog,
		task.StatusTodo,
		task.StatusInProgress,
		task.StatusReview,
		task.StatusApproved,
		task.StatusRejected,
		task.StatusDone,
		task.StatusBlocked,
	}
	for _, status := range taskStatuses {
		count, err := s.client.Task.Query().
			Where(task.StatusEQ(status)).
			Count(ctx)
		if err != nil {
			return nil, fmt.Errorf("service.DashboardService.GetOverview task count (%s): %w", status, err)
		}
		overview.TasksByStatus[string(status)] = count
	}

	// Count pending approvals.
	pendingCount, err := s.approvalSvc.CountPending(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.DashboardService.GetOverview pending approvals: %w", err)
	}
	overview.PendingApprovals = pendingCount

	// Count tasks completed today (transitioned to "done" today).
	todayStart := time.Now().Truncate(24 * time.Hour)
	completedToday, err := s.client.Task.Query().
		Where(
			task.StatusEQ(task.StatusDone),
			task.UpdatedAtGTE(todayStart),
		).
		Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.DashboardService.GetOverview completed today: %w", err)
	}
	overview.TasksCompletedToday = completedToday

	// Get recent activity events.
	recentActivity, err := s.activitySvc.ListRecent(ctx, 20)
	if err != nil {
		return nil, fmt.Errorf("service.DashboardService.GetOverview recent activity: %w", err)
	}
	overview.RecentActivity = recentActivity

	return overview, nil
}
