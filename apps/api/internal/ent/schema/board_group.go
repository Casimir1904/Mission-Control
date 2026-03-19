package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"

	schemamixin "github.com/Casimir1904/Mission-Control/apps/api/internal/ent/schema/mixin"
)

// BoardGroup holds the schema definition for the BoardGroup entity.
// A board group is a logical grouping of related boards.
type BoardGroup struct {
	ent.Schema
}

// Mixin of the BoardGroup.
func (BoardGroup) Mixin() []ent.Mixin {
	return []ent.Mixin{
		schemamixin.TimeMixin{},
	}
}

// Fields of the BoardGroup.
func (BoardGroup) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.String("name").
			NotEmpty().
			MaxLen(255).
			Comment("Name of the board group"),
		field.String("description").
			Optional().
			MaxLen(2048).
			Comment("Description of the board group"),
		field.UUID("organization_id", uuid.UUID{}).
			Comment("Foreign key to organization"),
	}
}

// Edges of the BoardGroup.
func (BoardGroup) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("organization", Organization.Type).
			Ref("board_groups").
			Field("organization_id").
			Unique().
			Required(),
		edge.To("boards", Board.Type).
			Comment("Boards in this group"),
	}
}
