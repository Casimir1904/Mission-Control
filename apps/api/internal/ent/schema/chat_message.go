package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"

	schemamixin "github.com/Casimir1904/Mission-Control/apps/api/internal/ent/schema/mixin"
)

// ChatMessage holds the schema definition for the ChatMessage entity.
// A chat message is a single message in a chat session between a user and an agent.
type ChatMessage struct {
	ent.Schema
}

// Mixin of the ChatMessage.
func (ChatMessage) Mixin() []ent.Mixin {
	return []ent.Mixin{
		schemamixin.TimeMixin{},
	}
}

// Fields of the ChatMessage.
func (ChatMessage) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.String("session_key").
			NotEmpty().
			MaxLen(255).
			Comment("Session key from the OpenClaw gateway"),
		field.UUID("board_id", uuid.UUID{}).
			Comment("Foreign key to the board this chat belongs to"),
		field.UUID("agent_id", uuid.UUID{}).
			Optional().
			Nillable().
			Comment("Foreign key to the agent (null for human messages)"),
		field.UUID("task_id", uuid.UUID{}).
			Optional().
			Nillable().
			Comment("Foreign key to the task (null for board-wide chat)"),
		field.Enum("role").
			Values("user", "assistant", "system", "tool").
			Comment("Message sender role"),
		field.Text("content").
			Comment("Message content"),
		field.JSON("metadata", map[string]any{}).
			Optional().
			Comment("Optional metadata (tool calls, thinking, etc.)"),
	}
}

// Edges of the ChatMessage.
func (ChatMessage) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("board", Board.Type).
			Ref("chat_messages").
			Field("board_id").
			Unique().
			Required(),
		edge.From("agent", Agent.Type).
			Ref("chat_messages").
			Field("agent_id").
			Unique(),
		edge.From("task", Task.Type).
			Ref("chat_messages").
			Field("task_id").
			Unique(),
	}
}

// Indexes of the ChatMessage.
func (ChatMessage) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("session_key"),
		index.Fields("board_id", "created_at"),
		index.Fields("session_key", "created_at"),
	}
}
