package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"

	schemamixin "github.com/Casimir1904/Mission-Control/apps/api/internal/ent/schema/mixin"
)

// ChatSession holds the schema definition for the ChatSession entity.
// A chat session represents an active or completed conversation with an agent via a gateway.
type ChatSession struct {
	ent.Schema
}

// Mixin of the ChatSession.
func (ChatSession) Mixin() []ent.Mixin {
	return []ent.Mixin{
		schemamixin.TimeMixin{},
	}
}

// Fields of the ChatSession.
func (ChatSession) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.String("session_key").
			NotEmpty().
			Unique().
			MaxLen(255).
			Comment("Session key from the OpenClaw gateway"),
		field.UUID("board_id", uuid.UUID{}).
			Comment("Foreign key to the board this session belongs to"),
		field.UUID("agent_id", uuid.UUID{}).
			Comment("Foreign key to the agent in this session"),
		field.UUID("task_id", uuid.UUID{}).
			Optional().
			Nillable().
			Comment("Optional foreign key to the task (null for board-wide chat)"),
		field.Enum("status").
			Values("active", "completed", "error").
			Default("active").
			Comment("Current session status"),
		field.String("system_prompt").
			Optional().
			MaxLen(16384).
			Comment("System prompt used when creating the session"),
	}
}

// Edges of the ChatSession.
func (ChatSession) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("board", Board.Type).
			Ref("chat_sessions").
			Field("board_id").
			Unique().
			Required(),
		edge.From("agent", Agent.Type).
			Ref("chat_sessions").
			Field("agent_id").
			Unique().
			Required(),
		edge.From("task", Task.Type).
			Ref("chat_sessions").
			Field("task_id").
			Unique(),
	}
}

// Indexes of the ChatSession.
func (ChatSession) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("board_id", "status"),
	}
}
