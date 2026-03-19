package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"

	schemamixin "github.com/Casimir1904/Mission-Control/apps/api/internal/ent/schema/mixin"
)

// Board holds the schema definition for the Board entity.
// A board represents a project workspace where agents collaborate on tasks.
type Board struct {
	ent.Schema
}

// Mixin of the Board.
func (Board) Mixin() []ent.Mixin {
	return []ent.Mixin{
		schemamixin.TimeMixin{},
	}
}

// Fields of the Board.
func (Board) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.String("name").
			NotEmpty().
			MaxLen(255).
			Comment("Name of the board"),
		field.String("description").
			Optional().
			MaxLen(4096).
			Comment("Description of the board's purpose"),
		field.Enum("status").
			Values("active", "archived").
			Default("active").
			Comment("Current status of the board"),
		field.Int("max_agents").
			Default(10).
			Positive().
			Comment("Maximum number of agents allowed on this board"),
		field.UUID("organization_id", uuid.UUID{}).
			Comment("Foreign key to organization"),
		field.UUID("board_group_id", uuid.UUID{}).
			Optional().
			Nillable().
			Comment("Optional foreign key to board group"),
		field.UUID("lead_agent_id", uuid.UUID{}).
			Optional().
			Nillable().
			Comment("Designated lead agent for orchestration on this board"),
		field.Enum("orchestration_mode").
			Values("manual", "lead_agent").
			Default("manual").
			Comment("Orchestration mode: manual or lead_agent"),
	}
}

// Edges of the Board.
func (Board) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("organization", Organization.Type).
			Ref("boards").
			Field("organization_id").
			Unique().
			Required(),
		edge.From("board_group", BoardGroup.Type).
			Ref("boards").
			Field("board_group_id").
			Unique(),
		edge.From("lead_agent", Agent.Type).
			Ref("led_boards").
			Field("lead_agent_id").
			Unique(),
		edge.To("tasks", Task.Type).
			Comment("Tasks on this board"),
		edge.To("agents", Agent.Type).
			Comment("Agents assigned to this board"),
		edge.To("memory", BoardMemory.Type).
			Comment("Memory entries for this board"),
		edge.To("webhooks", Webhook.Type).
			Comment("Webhooks configured for this board"),
		edge.To("chat_messages", ChatMessage.Type).
			Comment("Chat messages associated with this board"),
		edge.To("chat_sessions", ChatSession.Type).
			Comment("Chat sessions on this board"),
	}
}
