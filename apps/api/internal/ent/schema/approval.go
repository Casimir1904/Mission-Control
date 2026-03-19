package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"

	schemamixin "github.com/Casimir1904/Mission-Control/apps/api/internal/ent/schema/mixin"
)

// Approval holds the schema definition for the Approval entity.
// An approval represents a review decision on a task.
type Approval struct {
	ent.Schema
}

// Mixin of the Approval.
func (Approval) Mixin() []ent.Mixin {
	return []ent.Mixin{
		schemamixin.TimeMixin{},
	}
}

// Fields of the Approval.
func (Approval) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.Enum("status").
			Values("pending", "approved", "rejected").
			Default("pending").
			Comment("Current status of the approval"),
		field.Float("confidence").
			Optional().
			Min(0).
			Max(1).
			Comment("Confidence score between 0 and 1"),
		field.JSON("rubric_scores", map[string]any{}).
			Optional().
			Comment("Structured rubric scoring data"),
		field.String("comment").
			Optional().
			MaxLen(4096).
			Comment("Reviewer comment"),
		field.UUID("task_id", uuid.UUID{}).
			Comment("Foreign key to the task being reviewed"),
		field.UUID("reviewer_id", uuid.UUID{}).
			Optional().
			Nillable().
			Comment("Foreign key to the reviewing user"),
	}
}

// Edges of the Approval.
func (Approval) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("task", Task.Type).
			Ref("approvals").
			Field("task_id").
			Unique().
			Required(),
		edge.From("reviewer", User.Type).
			Ref("approvals").
			Field("reviewer_id").
			Unique(),
	}
}
