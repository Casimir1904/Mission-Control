package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"

	schemamixin "github.com/Casimir1904/Mission-Control/apps/api/internal/ent/schema/mixin"
)

// Organization holds the schema definition for the Organization entity.
type Organization struct {
	ent.Schema
}

// Mixin of the Organization.
func (Organization) Mixin() []ent.Mixin {
	return []ent.Mixin{
		schemamixin.TimeMixin{},
	}
}

// Fields of the Organization.
func (Organization) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.String("name").
			NotEmpty().
			MaxLen(255).
			Comment("Display name of the organization"),
		field.String("slug").
			NotEmpty().
			MaxLen(128).
			Unique().
			Comment("URL-friendly identifier"),
		field.String("description").
			Optional().
			MaxLen(2048).
			Comment("Optional description of the organization"),
	}
}

// Edges of the Organization.
func (Organization) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("members", OrgMember.Type).
			Comment("Members of this organization"),
		edge.To("boards", Board.Type).
			Comment("Boards owned by this organization"),
		edge.To("board_groups", BoardGroup.Type).
			Comment("Board groups in this organization"),
		edge.To("gateways", Gateway.Type).
			Comment("Gateways registered to this organization"),
		edge.To("tags", Tag.Type).
			Comment("Tags in this organization"),
		edge.To("activity_events", ActivityEvent.Type).
			Comment("Activity events for this organization"),
	}
}
