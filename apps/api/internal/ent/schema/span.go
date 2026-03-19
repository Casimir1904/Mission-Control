package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"

	schemamixin "github.com/Casimir1904/Mission-Control/apps/api/internal/ent/schema/mixin"
)

// Span holds the schema definition for the Span entity.
// A span represents a single unit of work within a trace.
type Span struct {
	ent.Schema
}

// Mixin of the Span.
func (Span) Mixin() []ent.Mixin {
	return []ent.Mixin{
		schemamixin.TimeMixin{},
	}
}

// Fields of the Span.
func (Span) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.String("span_id").
			NotEmpty().
			Unique().
			Comment("External span identifier"),
		field.String("parent_span_id").
			Optional().
			Comment("Parent span identifier for nested spans"),
		field.String("name").
			NotEmpty().
			MaxLen(255).
			Comment("Name of the span operation"),
		field.String("status").
			Optional().
			MaxLen(64).
			Comment("Status of the span (ok, error)"),
		field.Time("start_time").
			Default(time.Now).
			Comment("When the span started"),
		field.Time("end_time").
			Optional().
			Nillable().
			Comment("When the span ended"),
		field.JSON("attributes", map[string]any{}).
			Optional().
			Comment("Arbitrary key-value attributes on the span"),
		field.UUID("trace_id", uuid.UUID{}).
			Comment("Foreign key to the parent trace"),
	}
}

// Edges of the Span.
func (Span) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("trace", Trace.Type).
			Ref("spans").
			Field("trace_id").
			Unique().
			Required(),
	}
}
