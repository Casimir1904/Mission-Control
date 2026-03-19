package dto

// HeartbeatInput is the payload for an agent heartbeat.
type HeartbeatInput struct {
	Metrics map[string]any `json:"metrics,omitempty" doc:"Optional agent metrics"`
}
