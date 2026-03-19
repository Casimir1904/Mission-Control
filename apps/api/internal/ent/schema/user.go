package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"

	schemamixin "github.com/Casimir1904/Mission-Control/apps/api/internal/ent/schema/mixin"
)

// User holds the schema definition for the User entity.
type User struct {
	ent.Schema
}

// Mixin of the User.
func (User) Mixin() []ent.Mixin {
	return []ent.Mixin{
		schemamixin.TimeMixin{},
	}
}

// Fields of the User.
func (User) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.String("email").
			NotEmpty().
			MaxLen(255).
			Unique().
			Comment("User email address"),
		field.String("display_name").
			NotEmpty().
			MaxLen(255).
			Comment("User display name"),
		field.String("avatar_url").
			Optional().
			MaxLen(2048).
			Comment("URL to user avatar image"),
		field.String("oidc_subject").
			NotEmpty().
			Unique().
			Comment("OIDC subject identifier from the identity provider"),
	}
}

// Edges of the User.
func (User) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("org_memberships", OrgMember.Type).
			Comment("Organization memberships for this user"),
		edge.To("approvals", Approval.Type).
			Comment("Approvals reviewed by this user"),
		edge.To("notifications", Notification.Type).
			Comment("Notifications for this user"),
		edge.To("activity_events", ActivityEvent.Type).
			Comment("Activity events created by this user"),
	}
}
