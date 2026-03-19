package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"

	schemamixin "github.com/Casimir1904/Mission-Control/apps/api/internal/ent/schema/mixin"
)

// OrgMember holds the schema definition for the OrgMember entity.
// It represents the membership relationship between a user and an organization.
type OrgMember struct {
	ent.Schema
}

// Mixin of the OrgMember.
func (OrgMember) Mixin() []ent.Mixin {
	return []ent.Mixin{
		schemamixin.TimeMixin{},
	}
}

// Fields of the OrgMember.
func (OrgMember) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.Enum("role").
			Values("owner", "admin", "member").
			Default("member").
			Comment("Role of the user within the organization"),
		field.UUID("organization_id", uuid.UUID{}).
			Comment("Foreign key to organization"),
		field.UUID("user_id", uuid.UUID{}).
			Comment("Foreign key to user"),
	}
}

// Edges of the OrgMember.
func (OrgMember) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("organization", Organization.Type).
			Ref("members").
			Field("organization_id").
			Unique().
			Required(),
		edge.From("user", User.Type).
			Ref("org_memberships").
			Field("user_id").
			Unique().
			Required(),
	}
}
