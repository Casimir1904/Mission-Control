package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/apperror"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/agent"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/events"
)

const (
	// degradedThreshold is how long after the last heartbeat before an agent is "degraded".
	degradedThreshold = 5 * time.Minute

	// offlineThreshold is how long after the last heartbeat before an agent is "offline".
	offlineThreshold = 15 * time.Minute

	// staleCheckInterval is how often the stale agent checker runs.
	staleCheckInterval = 60 * time.Second
)

// HeartbeatService defines the interface for agent heartbeat operations.
type HeartbeatService interface {
	// RecordHeartbeat updates the agent's last heartbeat time and optionally sets it online.
	RecordHeartbeat(ctx context.Context, agentID uuid.UUID, metrics map[string]any) error
	// CheckStaleAgents finds agents with stale heartbeats and transitions them.
	CheckStaleAgents(ctx context.Context) error
	// RunStaleChecker runs the background stale agent checker loop.
	RunStaleChecker(ctx context.Context)
}

type heartbeatService struct {
	client *generated.Client
	bus    *events.Bus
}

// NewHeartbeatService creates a new HeartbeatService backed by the Ent client.
func NewHeartbeatService(client *generated.Client, bus *events.Bus) HeartbeatService {
	return &heartbeatService{client: client, bus: bus}
}

func (s *heartbeatService) RecordHeartbeat(ctx context.Context, agentID uuid.UUID, metrics map[string]any) error {
	// Load the agent to check current status.
	a, err := s.client.Agent.Get(ctx, agentID)
	if err != nil {
		if generated.IsNotFound(err) {
			return apperror.NewNotFound("agent not found")
		}
		return fmt.Errorf("service.HeartbeatService.RecordHeartbeat load: %w", err)
	}

	now := time.Now()
	builder := s.client.Agent.UpdateOneID(agentID).
		SetLastHeartbeatAt(now)

	// If agent was offline or degraded, set it back to online.
	if a.Status == agent.StatusOffline || a.Status == agent.StatusDegraded {
		builder.SetStatus(agent.StatusOnline)

		slog.Info("agent came online via heartbeat", "agent_id", agentID, "previous_status", a.Status)

		// Publish status change event.
		s.publishStatusChanged(ctx, agentID, a.BoardID, string(a.Status), "online")
	}

	_, err = builder.Save(ctx)
	if err != nil {
		return fmt.Errorf("service.HeartbeatService.RecordHeartbeat update: %w", err)
	}

	slog.Debug("heartbeat recorded", "agent_id", agentID)
	return nil
}

func (s *heartbeatService) CheckStaleAgents(ctx context.Context) error {
	now := time.Now()
	degradedCutoff := now.Add(-degradedThreshold)
	offlineCutoff := now.Add(-offlineThreshold)

	// Find online agents whose last heartbeat is older than the degraded threshold.
	// These agents should be transitioned to "degraded".
	degradedAgents, err := s.client.Agent.Query().
		Where(
			agent.StatusEQ(agent.StatusOnline),
			agent.LastHeartbeatAtNotNil(),
			agent.LastHeartbeatAtLT(degradedCutoff),
		).
		All(ctx)
	if err != nil {
		return fmt.Errorf("service.HeartbeatService.CheckStaleAgents degraded query: %w", err)
	}

	for _, a := range degradedAgents {
		_, err := s.client.Agent.UpdateOneID(a.ID).
			SetStatus(agent.StatusDegraded).
			Save(ctx)
		if err != nil {
			slog.Error("failed to set agent degraded", "agent_id", a.ID, "error", err)
			continue
		}
		slog.Warn("agent marked degraded due to stale heartbeat", "agent_id", a.ID)
		s.publishStatusChanged(ctx, a.ID, a.BoardID, "online", "degraded")
	}

	// Find degraded agents whose last heartbeat is older than the offline threshold.
	// These agents should be transitioned to "offline".
	offlineAgents, err := s.client.Agent.Query().
		Where(
			agent.StatusEQ(agent.StatusDegraded),
			agent.LastHeartbeatAtNotNil(),
			agent.LastHeartbeatAtLT(offlineCutoff),
		).
		All(ctx)
	if err != nil {
		return fmt.Errorf("service.HeartbeatService.CheckStaleAgents offline query: %w", err)
	}

	for _, a := range offlineAgents {
		_, err := s.client.Agent.UpdateOneID(a.ID).
			SetStatus(agent.StatusOffline).
			Save(ctx)
		if err != nil {
			slog.Error("failed to set agent offline", "agent_id", a.ID, "error", err)
			continue
		}
		slog.Warn("agent marked offline due to stale heartbeat", "agent_id", a.ID)
		s.publishStatusChanged(ctx, a.ID, a.BoardID, "degraded", "offline")
	}

	if len(degradedAgents) > 0 || len(offlineAgents) > 0 {
		slog.Info("stale agent check complete",
			"degraded_count", len(degradedAgents),
			"offline_count", len(offlineAgents),
		)
	}

	return nil
}

func (s *heartbeatService) RunStaleChecker(ctx context.Context) {
	ticker := time.NewTicker(staleCheckInterval)
	defer ticker.Stop()

	slog.Info("stale agent checker started", "interval", staleCheckInterval)

	for {
		select {
		case <-ctx.Done():
			slog.Info("stale agent checker stopping")
			return
		case <-ticker.C:
			if err := s.CheckStaleAgents(ctx); err != nil {
				slog.Error("stale agent check failed", "error", err)
			}
		}
	}
}

func (s *heartbeatService) publishStatusChanged(ctx context.Context, agentID, boardID uuid.UUID, fromStatus, toStatus string) {
	if s.bus == nil || !s.bus.IsConnected() {
		return
	}

	payload := map[string]any{
		"agent_id":    agentID.String(),
		"board_id":    boardID.String(),
		"from_status": fromStatus,
		"to_status":   toStatus,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		slog.Error("failed to marshal agent status change event", "error", err)
		return
	}

	if err := s.bus.Publish(ctx, "mc.agent.status_changed", data); err != nil {
		slog.Error("failed to publish agent status change event", "error", err, "agent_id", agentID)
	}
}
