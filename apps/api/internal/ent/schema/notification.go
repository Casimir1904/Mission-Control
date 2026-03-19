package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"

	schemamixin "github.com/Casimir1904/Mission-Control/apps/api/internal/ent/schema/mixin"
)

// Notification holds the schema definition for the Notification entity.
type Notification struct {
	ent.Schema
}

// Mixin of the Notification.
func (Notification) Mixin() []ent.Mixin {
	return []ent.Mixin{
		schemamixin.TimeMixin{},
	}
}

// Fields of the Notification.
func (Notification) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.String("title").
			NotEmpty().
			MaxLen(255).
			Comment("Notification title"),
		field.String("body").
			Optional().
			MaxLen(4096).
			Comment("Notification body text"),
		field.Bool("read").
			Default(false).
			Comment("Whether the notification has been read"),
		field.Enum("channel").
			Values("in_app", "webhook").
			Default("in_app").
			Comment("Delivery channel for the notification"),
		field.UUID("user_id", uuid.UUID{}).
			Comment("Foreign key to the target user"),
	}
}

// Edges of the Notification.
func (Notification) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Ref("notifications").
			Field("user_id").
			Unique().
			Required(),
	}
}
