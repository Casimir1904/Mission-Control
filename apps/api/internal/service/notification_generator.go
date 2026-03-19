package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/events"
)

// NotificationGenerator listens to NATS events and auto-generates
// notifications for relevant system events.
type NotificationGenerator struct {
	bus     *events.Bus
	notifSvc NotificationService
}

// NewNotificationGenerator creates a new notification generator.
func NewNotificationGenerator(bus *events.Bus, notifSvc NotificationService) *NotificationGenerator {
	return &NotificationGenerator{
		bus:      bus,
		notifSvc: notifSvc,
	}
}

// Run starts subscribing to relevant NATS events and generating notifications.
// It blocks until the context is cancelled.
func (g *NotificationGenerator) Run(ctx context.Context) {
	if g.bus == nil || !g.bus.IsConnected() {
		slog.Warn("notification generator: NATS not connected, generator disabled")
		return
	}

	conn := g.bus.Conn()

	// Subscribe to agent status changes.
	agentSub, err := conn.Subscribe("mc.agent.status_changed", func(msg *nats.Msg) {
		g.handleAgentStatusChanged(ctx, msg)
	})
	if err != nil {
		slog.Error("notification generator: failed to subscribe to agent status", "error", err)
		return
	}

	// Subscribe to approval submissions.
	approvalSub, err := conn.Subscribe("mc.approval.submitted", func(msg *nats.Msg) {
		g.handleApprovalSubmitted(ctx, msg)
	})
	if err != nil {
		slog.Error("notification generator: failed to subscribe to approvals", "error", err)
		_ = agentSub.Unsubscribe()
		return
	}

	// Subscribe to task transitions (specifically to done).
	taskSub, err := conn.Subscribe("mc.task.transitioned", func(msg *nats.Msg) {
		g.handleTaskTransitioned(ctx, msg)
	})
	if err != nil {
		slog.Error("notification generator: failed to subscribe to task transitions", "error", err)
		_ = agentSub.Unsubscribe()
		_ = approvalSub.Unsubscribe()
		return
	}

	slog.Info("notification generator started",
		"subjects", []string{"mc.agent.status_changed", "mc.approval.submitted", "mc.task.transitioned"},
	)

	// Block until context is done.
	<-ctx.Done()

	slog.Info("notification generator stopping")
	_ = agentSub.Unsubscribe()
	_ = approvalSub.Unsubscribe()
	_ = taskSub.Unsubscribe()
}

func (g *NotificationGenerator) handleAgentStatusChanged(ctx context.Context, msg *nats.Msg) {
	var payload map[string]any
	if err := json.Unmarshal(msg.Data, &payload); err != nil {
		slog.Warn("notification generator: failed to parse agent status event", "error", err)
		return
	}

	status, _ := payload["status"].(string)
	if status != "offline" {
		return // Only generate notifications for offline events.
	}

	agentName, _ := payload["agent_name"].(string)
	if agentName == "" {
		agentName = "Unknown Agent"
	}

	title := fmt.Sprintf("Agent %s went offline", agentName)
	body := fmt.Sprintf("Agent %s has gone offline and is no longer responding.", agentName)

	// Use a placeholder user ID since auth is not yet wired.
	userID := placeholderUserID()

	if _, err := g.notifSvc.Create(ctx, userID, title, body, "in_app"); err != nil {
		slog.Error("notification generator: failed to create agent offline notification",
			"error", err,
			"agent_name", agentName,
		)
	}
}

func (g *NotificationGenerator) handleApprovalSubmitted(ctx context.Context, msg *nats.Msg) {
	var payload map[string]any
	if err := json.Unmarshal(msg.Data, &payload); err != nil {
		slog.Warn("notification generator: failed to parse approval event", "error", err)
		return
	}

	taskID, _ := payload["task_id"].(string)
	title := "Approval needed"
	body := fmt.Sprintf("A new approval has been submitted for task %s.", taskID)

	userID := placeholderUserID()

	if _, err := g.notifSvc.Create(ctx, userID, title, body, "in_app"); err != nil {
		slog.Error("notification generator: failed to create approval notification",
			"error", err,
			"task_id", taskID,
		)
	}
}

func (g *NotificationGenerator) handleTaskTransitioned(ctx context.Context, msg *nats.Msg) {
	var payload map[string]any
	if err := json.Unmarshal(msg.Data, &payload); err != nil {
		slog.Warn("notification generator: failed to parse task transition event", "error", err)
		return
	}

	newStatus, _ := payload["new_status"].(string)
	if newStatus != "done" {
		return // Only generate notifications for task completion.
	}

	taskTitle, _ := payload["task_title"].(string)
	if taskTitle == "" {
		taskTitle = "Unknown Task"
	}

	title := fmt.Sprintf("Task completed: %s", taskTitle)
	body := fmt.Sprintf("Task \"%s\" has been marked as done.", taskTitle)

	userID := placeholderUserID()

	if _, err := g.notifSvc.Create(ctx, userID, title, body, "in_app"); err != nil {
		slog.Error("notification generator: failed to create task completion notification",
			"error", err,
			"task_title", taskTitle,
		)
	}
}

// placeholderUserID returns a deterministic placeholder user ID.
// This will be replaced with real user resolution once auth is wired.
func placeholderUserID() uuid.UUID {
	return uuid.MustParse("00000000-0000-0000-0000-000000000001")
}
