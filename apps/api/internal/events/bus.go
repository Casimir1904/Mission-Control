package events

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

// Bus wraps a NATS connection and provides JetStream capabilities
// for reliable event publishing and subscribing.
type Bus struct {
	conn *nats.Conn
	js   jetstream.JetStream
}

// NewBus creates a new NATS event bus connection with JetStream enabled.
func NewBus(ctx context.Context, url string) (*Bus, error) {
	if url == "" {
		slog.Warn("nats url not configured, event bus disabled")
		return &Bus{}, nil
	}

	nc, err := nats.Connect(url,
		nats.RetryOnFailedConnect(true),
		nats.MaxReconnects(-1),
		nats.DisconnectErrHandler(func(_ *nats.Conn, err error) {
			slog.Warn("nats disconnected", "error", err)
		}),
		nats.ReconnectHandler(func(_ *nats.Conn) {
			slog.Info("nats reconnected")
		}),
	)
	if err != nil {
		return nil, fmt.Errorf("connect nats: %w", err)
	}

	js, err := jetstream.New(nc)
	if err != nil {
		nc.Close()
		return nil, fmt.Errorf("create jetstream context: %w", err)
	}

	// Ensure the main stream exists.
	_, err = js.CreateOrUpdateStream(ctx, jetstream.StreamConfig{
		Name:        "MISSION_CONTROL",
		Description: "Mission Control event stream",
		Subjects:    []string{"mc.>"},
		Retention:   jetstream.LimitsPolicy,
		MaxAge:      0, // No age limit by default; configure per deployment.
		Storage:     jetstream.FileStorage,
		Replicas:    1,
	})
	if err != nil {
		nc.Close()
		return nil, fmt.Errorf("create jetstream stream: %w", err)
	}

	slog.Info("nats event bus connected", "url", url)
	return &Bus{conn: nc, js: js}, nil
}

// IsConnected returns true if the NATS connection is established.
func (b *Bus) IsConnected() bool {
	return b.conn != nil && b.conn.IsConnected()
}

// JetStream returns the JetStream context for advanced operations.
func (b *Bus) JetStream() jetstream.JetStream {
	return b.js
}

// Conn returns the underlying NATS connection.
func (b *Bus) Conn() *nats.Conn {
	return b.conn
}

// Publish sends a message to the given NATS subject via JetStream.
// It is a no-op if the bus is not connected.
func (b *Bus) Publish(ctx context.Context, subject string, data []byte) error {
	if b.js == nil {
		slog.Debug("event bus not connected, skipping publish", "subject", subject)
		return nil
	}
	_, err := b.js.Publish(ctx, subject, data)
	if err != nil {
		return fmt.Errorf("publish %s: %w", subject, err)
	}
	return nil
}

// Close gracefully shuts down the NATS connection.
func (b *Bus) Close() {
	if b.conn != nil {
		b.conn.Drain()
		slog.Info("nats connection closed")
	}
}
