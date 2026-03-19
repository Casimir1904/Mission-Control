package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"

	schemamixin "github.com/Casimir1904/Mission-Control/apps/api/internal/ent/schema/mixin"
)

// Trace holds the schema definition for the Trace entity.
// A trace represents a complete execution trace for an agent action.
type Trace struct {
	ent.Schema
}

// Mixin of the Trace.
func (Trace) Mixin() []ent.Mixin {
	return []ent.Mixin{
		schemamixin.TimeMixin{},
	}
}

// Fields of the Trace.
func (Trace) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.String("trace_id").
			NotEmpty().
			Unique().
			Comment("External trace identifier (e.g., OpenTelemetry trace ID)"),
		field.String("name").
			NotEmpty().
			MaxLen(255).
			Comment("Name of the traced operation"),
		field.String("status").
			Optional().
			MaxLen(64).
			Comment("Status of the trace (ok, error)"),
		field.Int64("duration_ms").
			Optional().
			NonNegative().
			Comment("Total duration in milliseconds"),
		field.Int("token_count").
			Optional().
			NonNegative().
			Comment("Total tokens consumed during this trace"),
		field.Float("cost").
			Optional().
			Min(0).
			Comment("Monetary cost of this trace in USD"),
		field.UUID("agent_id", uuid.UUID{}).
			Comment("Foreign key to the agent that produced this trace"),
	}
}

// Edges of the Trace.
func (Trace) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("agent", Agent.Type).
			Ref("traces").
			Field("agent_id").
			Unique().
			Required(),
		edge.To("spans", Span.Type).
			Comment("Spans within this trace"),
	}
}
