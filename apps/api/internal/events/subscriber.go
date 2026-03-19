package events

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/nats-io/nats.go/jetstream"
)

// Handler is a function that processes an event envelope.
type Handler func(ctx context.Context, envelope Envelope) error

// Subscriber subscribes to NATS subjects and invokes handlers for incoming events.
type Subscriber struct {
	bus *Bus
}

// NewSubscriber creates a new event subscriber.
func NewSubscriber(bus *Bus) *Subscriber {
	return &Subscriber{bus: bus}
}

// Subscribe creates a durable consumer on the given subject and invokes the handler
// for each received message. The consumer name is used for durable subscription
// tracking so that messages are not redelivered after acknowledgment.
func (s *Subscriber) Subscribe(ctx context.Context, consumerName, subject string, handler Handler) error {
	if s.bus == nil || !s.bus.IsConnected() {
		slog.Warn("nats not connected, skipping subscription", "subject", subject)
		return nil
	}

	consumer, err := s.bus.JetStream().CreateOrUpdateConsumer(ctx, "MISSION_CONTROL", jetstream.ConsumerConfig{
		Name:          consumerName,
		Durable:       consumerName,
		FilterSubject: subject,
		AckPolicy:     jetstream.AckExplicitPolicy,
		DeliverPolicy: jetstream.DeliverNewPolicy,
		MaxDeliver:    5,
	})
	if err != nil {
		return fmt.Errorf("create consumer %s: %w", consumerName, err)
	}

	_, err = consumer.Consume(func(msg jetstream.Msg) {
		var envelope Envelope
		if err := json.Unmarshal(msg.Data(), &envelope); err != nil {
			slog.Error("unmarshal event", "error", err, "subject", subject)
			_ = msg.Term()
			return
		}

		if err := handler(ctx, envelope); err != nil {
			slog.Error("handle event",
				"error", err,
				"subject", subject,
				"event_id", envelope.ID,
			)
			_ = msg.Nak()
			return
		}

		_ = msg.Ack()
	})
	if err != nil {
		return fmt.Errorf("consume subject %s: %w", subject, err)
	}

	slog.Info("subscribed to events", "subject", subject, "consumer", consumerName)
	return nil
}
