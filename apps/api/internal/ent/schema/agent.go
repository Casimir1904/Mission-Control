package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"

	schemamixin "github.com/Casimir1904/Mission-Control/apps/api/internal/ent/schema/mixin"
)

// Agent holds the schema definition for the Agent entity.
// An agent is an AI entity that works on tasks within a board.
type Agent struct {
	ent.Schema
}

// Mixin of the Agent.
func (Agent) Mixin() []ent.Mixin {
	return []ent.Mixin{
		schemamixin.TimeMixin{},
	}
}

// Fields of the Agent.
func (Agent) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.String("name").
			NotEmpty().
			MaxLen(255).
			Comment("Display name of the agent"),
		field.String("role").
			NotEmpty().
			MaxLen(128).
			Comment("Role or specialty of the agent (e.g., lead, developer, reviewer)"),
		field.Enum("status").
			Values("online", "offline", "degraded", "provisioning").
			Default("offline").
			Comment("Current operational status of the agent"),
		field.String("backstory").
			Optional().
			MaxLen(8192).
			Comment("Agent personality backstory for context"),
		field.String("goal").
			Optional().
			MaxLen(4096).
			Comment("Agent's primary goal or mission"),
		field.String("model").
			Optional().
			MaxLen(255).
			Comment("LLM model identifier (e.g., anthropic/claude-sonnet-4-6)"),
		field.UUID("board_id", uuid.UUID{}).
			Comment("Foreign key to the board this agent belongs to"),
		field.UUID("gateway_id", uuid.UUID{}).
			Optional().
			Nillable().
			Comment("Optional foreign key to the gateway running this agent"),
		field.Time("last_heartbeat_at").
			Optional().
			Nillable().
			Comment("Timestamp of the last heartbeat received from this agent"),
	}
}

// Edges of the Agent.
func (Agent) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("board", Board.Type).
			Ref("agents").
			Field("board_id").
			Unique().
			Required(),
		edge.From("gateway", Gateway.Type).
			Ref("agents").
			Field("gateway_id").
			Unique(),
		edge.To("tasks", Task.Type).
			Comment("Tasks assigned to this agent"),
		edge.To("traces", Trace.Type).
			Comment("Execution traces for this agent"),
		edge.To("cost_records", CostRecord.Type).
			Comment("Cost records for this agent"),
		edge.To("chat_messages", ChatMessage.Type).
			Comment("Chat messages from this agent"),
		edge.To("chat_sessions", ChatSession.Type).
			Comment("Chat sessions involving this agent"),
		edge.To("led_boards", Board.Type).
			Comment("Boards where this agent is the lead orchestrator"),
	}
}
