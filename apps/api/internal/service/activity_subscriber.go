package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/events"
)

// ActivitySubscriber listens to NATS events and records them as activity events.
type ActivitySubscriber struct {
	bus        *events.Bus
	actSvc     ActivityService
	stopCh     chan struct{}
}

// NewActivitySubscriber creates a new subscriber that records NATS events as activity.
func NewActivitySubscriber(bus *events.Bus, actSvc ActivityService) *ActivitySubscriber {
	return &ActivitySubscriber{
		bus:    bus,
		actSvc: actSvc,
		stopCh: make(chan struct{}),
	}
}

// Run starts subscribing to all mc.> events. It blocks until the context is cancelled.
func (s *ActivitySubscriber) Run(ctx context.Context) {
	if s.bus == nil || !s.bus.IsConnected() {
		slog.Warn("activity subscriber: NATS not connected, subscriber disabled")
		return
	}

	conn := s.bus.Conn()
	sub, err := conn.Subscribe("mc.>", func(msg *nats.Msg) {
		s.handleMessage(ctx, msg)
	})
	if err != nil {
		slog.Error("activity subscriber: failed to subscribe", "error", err)
		return
	}
	defer func() {
		if err := sub.Unsubscribe(); err != nil {
			slog.Error("activity subscriber: unsubscribe error", "error", err)
		}
	}()

	slog.Info("activity subscriber started", "subject", "mc.>")

	// Block until context is done.
	select {
	case <-ctx.Done():
		slog.Info("activity subscriber stopping")
	case <-s.stopCh:
		slog.Info("activity subscriber stopped")
	}
}

func (s *ActivitySubscriber) handleMessage(ctx context.Context, msg *nats.Msg) {
	subject := msg.Subject

	// Parse the event type and entity type from the NATS subject.
	// Subject format: mc.<entity_type>.<entity_id>.<action> or mc.<entity_type>.<action>
	eventType, entityType, entityID := parseSubject(subject)

	// Parse the payload.
	var payload map[string]any
	if len(msg.Data) > 0 {
		if err := json.Unmarshal(msg.Data, &payload); err != nil {
			slog.Warn("activity subscriber: failed to parse payload",
				"subject", subject,
				"error", err,
			)
			payload = map[string]any{"raw": string(msg.Data)}
		}
	}

	// Enrich gateway events with human-readable descriptions.
	if entityType == "gateway" {
		payload = enrichGatewayEvent(subject, payload)
	}

	// Enrich chat events with descriptions.
	if entityType == "chat" {
		payload = enrichChatEvent(subject, payload)
	}

	// Try to extract organization_id from payload for proper association.
	orgID := extractOrgID(payload)

	if err := s.actSvc.Record(ctx, eventType, entityType, entityID, orgID, payload); err != nil {
		slog.Error("activity subscriber: failed to record event",
			"subject", subject,
			"error", err,
		)
	}
}

// enrichGatewayEvent adds human-readable descriptions to gateway events.
func enrichGatewayEvent(subject string, payload map[string]any) map[string]any {
	if payload == nil {
		payload = make(map[string]any)
	}

	eventType, _ := payload["event_type"].(string)
	agentName, _ := payload["agent_name"].(string)
	if agentName == "" {
		agentName = "Unknown Agent"
	}

	var data map[string]any
	if rawData, ok := payload["data"]; ok {
		if d, ok := rawData.(map[string]any); ok {
			data = d
		}
	}

	switch eventType {
	case "chat.message":
		sessionKey := extractString(data, "sessionKey")
		payload["description"] = fmt.Sprintf("Agent %s responded in session %s", agentName, sessionKey)

	case "agent.state":
		state := extractString(data, "state")
		toolName := extractString(data, "toolName")
		switch state {
		case "thinking":
			payload["description"] = fmt.Sprintf("Agent %s started thinking", agentName)
		case "tool_use":
			if toolName != "" {
				payload["description"] = fmt.Sprintf("Agent %s using tool: %s", agentName, toolName)
			} else {
				payload["description"] = fmt.Sprintf("Agent %s using a tool", agentName)
			}
		case "idle":
			payload["description"] = fmt.Sprintf("Agent %s is idle", agentName)
		default:
			payload["description"] = fmt.Sprintf("Agent %s state: %s", agentName, state)
		}

	case "session.created":
		payload["description"] = fmt.Sprintf("Session started for Agent %s", agentName)

	case "session.ended":
		payload["description"] = fmt.Sprintf("Agent %s completed session", agentName)

	case "tool.call":
		toolName := extractString(data, "name")
		args := extractString(data, "args")
		if toolName != "" {
			desc := fmt.Sprintf("Agent %s called %s", agentName, toolName)
			if args != "" && len(args) <= 100 {
				desc += fmt.Sprintf("(%s)", args)
			}
			payload["description"] = desc
		}

	default:
		payload["description"] = fmt.Sprintf("Gateway event: %s", eventType)
	}

	return payload
}

// enrichChatEvent adds human-readable descriptions to chat events.
func enrichChatEvent(_ string, payload map[string]any) map[string]any {
	if payload == nil {
		payload = make(map[string]any)
	}

	role, _ := payload["role"].(string)
	agentName, _ := payload["agent_name"].(string)
	sessionKey, _ := payload["session_key"].(string)

	switch role {
	case "user":
		payload["description"] = fmt.Sprintf("User sent message in session %s", sessionKey)
	case "assistant":
		if agentName != "" {
			payload["description"] = fmt.Sprintf("Agent %s responded in session %s", agentName, sessionKey)
		} else {
			payload["description"] = fmt.Sprintf("Agent responded in session %s", sessionKey)
		}
	}

	return payload
}

// extractString safely extracts a string from a map.
func extractString(data map[string]any, key string) string {
	if data == nil {
		return ""
	}
	if v, ok := data[key].(string); ok {
		return v
	}
	return ""
}

// parseSubject extracts event type, entity type, and entity ID from a NATS subject.
// Examples:
//
//	mc.task.<uuid>.transition -> ("task.transition", "task", <uuid>)
//	mc.approval.submitted    -> ("approval.submitted", "approval", zero-uuid)
//	mc.agent.status_changed  -> ("agent.status_changed", "agent", zero-uuid)
func parseSubject(subject string) (eventType, entityType string, entityID uuid.UUID) {
	parts := strings.Split(subject, ".")
	if len(parts) < 2 {
		return subject, "unknown", uuid.Nil
	}

	// Always skip the "mc." prefix.
	entityType = parts[1]

	if len(parts) >= 4 {
		// mc.entity.uuid.action
		if parsed, err := uuid.Parse(parts[2]); err == nil {
			entityID = parsed
			eventType = entityType + "." + parts[3]
			return
		}
	}

	if len(parts) >= 3 {
		// mc.entity.action (no UUID)
		eventType = entityType + "." + parts[2]
		return
	}

	eventType = entityType
	return
}

// extractOrgID tries to get an organization_id from the event payload.
func extractOrgID(payload map[string]any) uuid.UUID {
	if payload == nil {
		return uuid.Nil
	}
	if orgIDStr, ok := payload["organization_id"].(string); ok {
		if parsed, err := uuid.Parse(orgIDStr); err == nil {
			return parsed
		}
	}
	return uuid.Nil
}
