package events

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go/jetstream"
)

// Envelope wraps an event payload with metadata for publishing.
type Envelope struct {
	ID        string         `json:"id"`
	Type      string         `json:"type"`
	Timestamp time.Time      `json:"timestamp"`
	Payload   map[string]any `json:"payload"`
}

// Publisher publishes events to NATS subjects via JetStream.
type Publisher struct {
	bus *Bus
}

// NewPublisher creates a new event publisher.
func NewPublisher(bus *Bus) *Publisher {
	return &Publisher{bus: bus}
}

// Publish sends an event to the specified NATS subject.
func (p *Publisher) Publish(ctx context.Context, subject string, payload map[string]any) error {
	if p.bus == nil || !p.bus.IsConnected() {
		slog.Debug("nats not connected, skipping publish", "subject", subject)
		return nil
	}

	envelope := Envelope{
		ID:        uuid.New().String(),
		Type:      subject,
		Timestamp: time.Now().UTC(),
		Payload:   payload,
	}

	data, err := json.Marshal(envelope)
	if err != nil {
		return fmt.Errorf("marshal event: %w", err)
	}

	_, err = p.bus.JetStream().Publish(ctx, subject, data,
		jetstream.WithMsgID(envelope.ID),
	)
	if err != nil {
		return fmt.Errorf("publish event: %w", err)
	}

	slog.Debug("event published", "subject", subject, "event_id", envelope.ID)
	return nil
}
