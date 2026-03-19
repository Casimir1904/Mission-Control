package ws

import (
	"context"
	"encoding/json"
	"log/slog"
	"strings"
	"time"

	"github.com/nats-io/nats.go"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/events"
)

// BridgeMessage is the consistent JSON envelope sent over WebSocket.
type BridgeMessage struct {
	Type      string         `json:"type"`
	Data      map[string]any `json:"data"`
	Timestamp string         `json:"timestamp"`
}

// Bridge connects NATS events to WebSocket topics, broadcasting events
// to the appropriate clients based on subject routing rules.
type Bridge struct {
	hub *Hub
	bus *events.Bus
}

// NewBridge creates a new NATS-to-WebSocket bridge.
func NewBridge(hub *Hub, bus *events.Bus) *Bridge {
	return &Bridge{hub: hub, bus: bus}
}

// Run starts the NATS subscription and bridges events to WebSocket topics.
// It blocks until the context is cancelled.
func (b *Bridge) Run(ctx context.Context) {
	if b.bus == nil || !b.bus.IsConnected() {
		slog.Warn("ws bridge: NATS not connected, bridge disabled")
		return
	}

	conn := b.bus.Conn()
	sub, err := conn.Subscribe("mc.>", func(msg *nats.Msg) {
		b.handleMessage(msg)
	})
	if err != nil {
		slog.Error("ws bridge: failed to subscribe", "error", err)
		return
	}
	defer func() {
		if err := sub.Unsubscribe(); err != nil {
			slog.Error("ws bridge: unsubscribe error", "error", err)
		}
	}()

	slog.Info("ws bridge started", "subject", "mc.>")

	<-ctx.Done()
	slog.Info("ws bridge stopping")
}

func (b *Bridge) handleMessage(msg *nats.Msg) {
	subject := msg.Subject

	// Parse the NATS payload.
	var data map[string]any
	if len(msg.Data) > 0 {
		if err := json.Unmarshal(msg.Data, &data); err != nil {
			slog.Warn("ws bridge: failed to parse event data",
				"subject", subject,
				"error", err,
			)
			data = map[string]any{"raw": string(msg.Data)}
		}
	}
	if data == nil {
		data = make(map[string]any)
	}

	// Build the consistent WebSocket message envelope.
	eventType := subjectToEventType(subject)
	wsMsg := &BridgeMessage{
		Type:      eventType,
		Data:      data,
		Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
	}

	// Determine which WS topics to broadcast to based on the subject.
	topics := b.resolveTopics(subject, data)

	for _, topic := range topics {
		humaMsg := &Message{
			Topic:   topic,
			Type:    wsMsg.Type,
			Payload: map[string]any{"data": wsMsg.Data, "timestamp": wsMsg.Timestamp},
		}
		if err := b.hub.BroadcastToTopic(topic, humaMsg); err != nil {
			slog.Error("ws bridge: broadcast failed",
				"topic", topic,
				"event_type", eventType,
				"error", err,
			)
		}
	}
}

// resolveTopics determines which WebSocket topics a NATS event should be broadcast to.
// Routing rules:
//   - mc.task.*       -> "board:{boardID}"
//   - mc.agent.*      -> "board:{boardID}" AND "dashboard"
//   - mc.approval.*   -> "board:{boardID}" AND "approvals"
//   - mc.agent.status_changed -> "dashboard"
func (b *Bridge) resolveTopics(subject string, data map[string]any) []string {
	var topics []string

	boardID := extractBoardID(data)
	parts := strings.Split(subject, ".")

	if len(parts) < 2 {
		return topics
	}

	entityType := parts[1] // task, agent, approval, etc.

	switch entityType {
	case "task":
		if boardID != "" {
			topics = append(topics, "board:"+boardID)
		}

	case "agent":
		if boardID != "" {
			topics = append(topics, "board:"+boardID)
		}
		topics = append(topics, "dashboard")

	case "approval":
		if boardID != "" {
			topics = append(topics, "board:"+boardID)
		}
		topics = append(topics, "approvals")

	case "gateway":
		// Gateway events (forwarded from OpenClaw) go to the dashboard
		// and optionally to a gateway-specific topic.
		topics = append(topics, "dashboard")
		gatewayID := extractGatewayID(data)
		if gatewayID != "" {
			topics = append(topics, "gateway:"+gatewayID)
		}

	default:
		// For any other event type, broadcast to dashboard.
		topics = append(topics, "dashboard")
	}

	// Special case: agent status changes always go to dashboard.
	if subject == "mc.agent.status_changed" {
		// Already included via the agent case above, but ensure it's there.
		hasDashboard := false
		for _, t := range topics {
			if t == "dashboard" {
				hasDashboard = true
				break
			}
		}
		if !hasDashboard {
			topics = append(topics, "dashboard")
		}
	}

	return topics
}

// subjectToEventType converts a NATS subject to a WebSocket event type.
// Example: "mc.task.uuid.transition" -> "task.transition"
//
//	"mc.approval.reviewed"    -> "approval.reviewed"
func subjectToEventType(subject string) string {
	parts := strings.Split(subject, ".")
	if len(parts) < 3 {
		return subject
	}

	// Skip "mc." prefix.
	entityType := parts[1]

	// If part[2] looks like a UUID (36 chars), skip it.
	if len(parts) >= 4 && len(parts[2]) == 36 {
		return entityType + "." + strings.Join(parts[3:], ".")
	}

	return entityType + "." + strings.Join(parts[2:], ".")
}

// extractBoardID tries to extract a board_id from the event payload.
func extractBoardID(data map[string]any) string {
	if data == nil {
		return ""
	}
	if boardID, ok := data["board_id"].(string); ok {
		return boardID
	}
	return ""
}

// extractGatewayID tries to extract a gateway_id from the event payload.
func extractGatewayID(data map[string]any) string {
	if data == nil {
		return ""
	}
	if gatewayID, ok := data["gateway_id"].(string); ok {
		return gatewayID
	}
	return ""
}
