package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"

	schemamixin "github.com/Casimir1904/Mission-Control/apps/api/internal/ent/schema/mixin"
)

// Webhook holds the schema definition for the Webhook entity.
// A webhook delivers event notifications to external URLs.
type Webhook struct {
	ent.Schema
}

// Mixin of the Webhook.
func (Webhook) Mixin() []ent.Mixin {
	return []ent.Mixin{
		schemamixin.TimeMixin{},
	}
}

// Fields of the Webhook.
func (Webhook) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.String("name").
			NotEmpty().
			MaxLen(255).
			Comment("Display name of the webhook"),
		field.String("url").
			NotEmpty().
			MaxLen(2048).
			Comment("Target URL for webhook delivery"),
		field.Strings("events").
			Optional().
			Comment("List of event types that trigger this webhook"),
		field.Bool("active").
			Default(true).
			Comment("Whether this webhook is active"),
		field.UUID("board_id", uuid.UUID{}).
			Comment("Foreign key to the board"),
	}
}

// Edges of the Webhook.
func (Webhook) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("board", Board.Type).
			Ref("webhooks").
			Field("board_id").
			Unique().
			Required(),
	}
}
