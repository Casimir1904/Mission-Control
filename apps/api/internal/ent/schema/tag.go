package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"

	schemamixin "github.com/Casimir1904/Mission-Control/apps/api/internal/ent/schema/mixin"
)

// Tag holds the schema definition for the Tag entity.
// Tags provide a labeling system for categorizing entities.
type Tag struct {
	ent.Schema
}

// Mixin of the Tag.
func (Tag) Mixin() []ent.Mixin {
	return []ent.Mixin{
		schemamixin.TimeMixin{},
	}
}

// Fields of the Tag.
func (Tag) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.String("name").
			NotEmpty().
			MaxLen(128).
			Comment("Tag name"),
		field.String("color").
			Optional().
			MaxLen(32).
			Comment("Tag color as hex code or CSS color name"),
		field.UUID("organization_id", uuid.UUID{}).
			Comment("Foreign key to organization"),
	}
}

// Edges of the Tag.
func (Tag) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("organization", Organization.Type).
			Ref("tags").
			Field("organization_id").
			Unique().
			Required(),
	}
}
