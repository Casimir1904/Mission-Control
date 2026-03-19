package dto

import (
	"time"

	"github.com/google/uuid"
)

// IngestTraceInput is the payload for ingesting a trace with spans.
type IngestTraceInput struct {
	TraceID    string      `json:"trace_id" minLength:"1" doc:"External trace identifier" required:"true"`
	Name       string      `json:"name" minLength:"1" maxLength:"255" doc:"Name of the traced operation" required:"true"`
	AgentID    uuid.UUID   `json:"agent_id" format:"uuid" doc:"Agent that produced this trace" required:"true"`
	Status     string      `json:"status,omitempty" maxLength:"64" doc:"Status of the trace (ok, error)"`
	DurationMs *int64      `json:"duration_ms,omitempty" minimum:"0" doc:"Total duration in milliseconds"`
	TokenCount *int        `json:"token_count,omitempty" minimum:"0" doc:"Total tokens consumed"`
	Cost       *float64    `json:"cost,omitempty" minimum:"0" doc:"Monetary cost in USD"`
	Spans      []SpanInput `json:"spans,omitempty" doc:"Spans within this trace"`
}

// SpanInput is the payload for a single span within a trace.
type SpanInput struct {
	SpanID       string         `json:"span_id" minLength:"1" doc:"External span identifier" required:"true"`
	ParentSpanID string         `json:"parent_span_id,omitempty" doc:"Parent span identifier for nesting"`
	Name         string         `json:"name" minLength:"1" maxLength:"255" doc:"Name of the span operation" required:"true"`
	Status       string         `json:"status,omitempty" maxLength:"64" doc:"Status of the span (ok, error)"`
	StartTime    *time.Time     `json:"start_time,omitempty" doc:"When the span started"`
	EndTime      *time.Time     `json:"end_time,omitempty" doc:"When the span ended"`
	Attributes   map[string]any `json:"attributes,omitempty" doc:"Arbitrary key-value attributes"`
}

// TraceOutput is the API response for a trace.
type TraceOutput struct {
	ID         uuid.UUID    `json:"id"`
	TraceID    string       `json:"trace_id"`
	Name       string       `json:"name"`
	Status     string       `json:"status,omitempty"`
	DurationMs *int64       `json:"duration_ms,omitempty"`
	TokenCount *int         `json:"token_count,omitempty"`
	Cost       *float64     `json:"cost,omitempty"`
	AgentID    uuid.UUID    `json:"agent_id"`
	Spans      []SpanOutput `json:"spans,omitempty"`
	CreatedAt  time.Time    `json:"created_at"`
}

// SpanOutput is the API response for a span.
type SpanOutput struct {
	ID           uuid.UUID      `json:"id"`
	SpanID       string         `json:"span_id"`
	ParentSpanID string         `json:"parent_span_id,omitempty"`
	Name         string         `json:"name"`
	Status       string         `json:"status,omitempty"`
	StartTime    time.Time      `json:"start_time"`
	EndTime      *time.Time     `json:"end_time,omitempty"`
	Attributes   map[string]any `json:"attributes,omitempty"`
}

// ListTraceOptions extends ListOptions with trace-specific filters.
type ListTraceOptions struct {
	ListOptions
	AgentID *uuid.UUID `json:"agent_id,omitempty"`
	Days    int        `json:"days,omitempty"`
}
