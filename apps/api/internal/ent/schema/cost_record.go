package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"

	schemamixin "github.com/Casimir1904/Mission-Control/apps/api/internal/ent/schema/mixin"
)

// CostRecord holds the schema definition for the CostRecord entity.
// A cost record tracks token usage and monetary cost for agent operations.
type CostRecord struct {
	ent.Schema
}

// Mixin of the CostRecord.
func (CostRecord) Mixin() []ent.Mixin {
	return []ent.Mixin{
		schemamixin.TimeMixin{},
	}
}

// Fields of the CostRecord.
func (CostRecord) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.Float("amount").
			Min(0).
			Comment("Monetary cost in USD"),
		field.Int("token_count").
			NonNegative().
			Comment("Number of tokens consumed"),
		field.String("model").
			NotEmpty().
			MaxLen(128).
			Comment("LLM model identifier (e.g., gpt-4, claude-3)"),
		field.Time("period").
			Comment("Time period this cost record covers"),
		field.UUID("agent_id", uuid.UUID{}).
			Comment("Foreign key to the agent"),
		field.UUID("board_id", uuid.UUID{}).
			Optional().
			Nillable().
			Comment("Optional foreign key to the board"),
	}
}

// Edges of the CostRecord.
func (CostRecord) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("agent", Agent.Type).
			Ref("cost_records").
			Field("agent_id").
			Unique().
			Required(),
	}
}
