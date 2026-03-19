package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"

	schemamixin "github.com/Casimir1904/Mission-Control/apps/api/internal/ent/schema/mixin"
)

// ActivityEvent holds the schema definition for the ActivityEvent entity.
// An activity event records a significant action in the system audit trail.
type ActivityEvent struct {
	ent.Schema
}

// Mixin of the ActivityEvent.
func (ActivityEvent) Mixin() []ent.Mixin {
	return []ent.Mixin{
		schemamixin.TimeMixin{},
	}
}

// Fields of the ActivityEvent.
func (ActivityEvent) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.String("event_type").
			NotEmpty().
			MaxLen(128).
			Comment("Type of the event (e.g., task.created, agent.heartbeat)"),
		field.String("entity_type").
			NotEmpty().
			MaxLen(64).
			Comment("Type of the entity the event relates to (e.g., task, agent)"),
		field.UUID("entity_id", uuid.UUID{}).
			Comment("ID of the entity the event relates to"),
		field.JSON("payload", map[string]any{}).
			Optional().
			Comment("Additional event payload data"),
		field.UUID("organization_id", uuid.UUID{}).
			Comment("Foreign key to organization"),
		field.UUID("user_id", uuid.UUID{}).
			Optional().
			Nillable().
			Comment("Foreign key to the user who triggered the event"),
	}
}

// Edges of the ActivityEvent.
func (ActivityEvent) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("organization", Organization.Type).
			Ref("activity_events").
			Field("organization_id").
			Unique().
			Required(),
		edge.From("user", User.Type).
			Ref("activity_events").
			Field("user_id").
			Unique(),
	}
}
