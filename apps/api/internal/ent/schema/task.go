package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"

	schemamixin "github.com/Casimir1904/Mission-Control/apps/api/internal/ent/schema/mixin"
)

// Task holds the schema definition for the Task entity.
// A task represents a unit of work on a board that can be assigned to an agent.
type Task struct {
	ent.Schema
}

// Mixin of the Task.
func (Task) Mixin() []ent.Mixin {
	return []ent.Mixin{
		schemamixin.TimeMixin{},
	}
}

// Fields of the Task.
func (Task) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.String("title").
			NotEmpty().
			MaxLen(512).
			Comment("Title of the task"),
		field.String("description").
			Optional().
			MaxLen(16384).
			Comment("Detailed description of the task"),
		field.Enum("status").
			Values("backlog", "todo", "in_progress", "review", "approved", "rejected", "done", "blocked").
			Default("backlog").
			Comment("Current status of the task"),
		field.Enum("priority").
			Values("low", "medium", "high", "critical").
			Default("medium").
			Comment("Priority level of the task"),
		field.UUID("board_id", uuid.UUID{}).
			Comment("Foreign key to the board this task belongs to"),
		field.UUID("assigned_agent_id", uuid.UUID{}).
			Optional().
			Nillable().
			Comment("Foreign key to the agent assigned to this task"),
	}
}

// Edges of the Task.
func (Task) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("board", Board.Type).
			Ref("tasks").
			Field("board_id").
			Unique().
			Required(),
		edge.From("assigned_agent", Agent.Type).
			Ref("tasks").
			Field("assigned_agent_id").
			Unique(),
		edge.To("approvals", Approval.Type).
			Comment("Approval reviews for this task"),
		// Self-referential M2M for task dependencies.
		edge.To("dependents", Task.Type).
			Comment("Tasks that depend on this task"),
		edge.From("dependencies", Task.Type).
			Ref("dependents").
			Comment("Tasks that this task depends on"),
	}
}
