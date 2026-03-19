package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"

	schemamixin "github.com/Casimir1904/Mission-Control/apps/api/internal/ent/schema/mixin"
)

// BoardMemory holds the schema definition for the BoardMemory entity.
// Board memory stores persistent knowledge entries accessible to agents.
type BoardMemory struct {
	ent.Schema
}

// Mixin of the BoardMemory.
func (BoardMemory) Mixin() []ent.Mixin {
	return []ent.Mixin{
		schemamixin.TimeMixin{},
	}
}

// Fields of the BoardMemory.
func (BoardMemory) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.Text("content").
			NotEmpty().
			Comment("The memory content text"),
		field.String("category").
			Optional().
			MaxLen(128).
			Comment("Category for organizing memory entries"),
		field.Float("importance").
			Default(0.5).
			Min(0).
			Max(1).
			Comment("Importance score between 0 and 1"),
		field.Enum("scope").
			Values("agent", "board", "group").
			Default("board").
			Comment("Visibility scope of this memory entry"),
		field.UUID("board_id", uuid.UUID{}).
			Comment("Foreign key to the board"),
	}
}

// Edges of the BoardMemory.
func (BoardMemory) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("board", Board.Type).
			Ref("memory").
			Field("board_id").
			Unique().
			Required(),
	}
}
