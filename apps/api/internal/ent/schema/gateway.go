package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"

	schemamixin "github.com/Casimir1904/Mission-Control/apps/api/internal/ent/schema/mixin"
)

// Gateway holds the schema definition for the Gateway entity.
// A gateway is a bridge between the control plane and agent runtimes.
type Gateway struct {
	ent.Schema
}

// Mixin of the Gateway.
func (Gateway) Mixin() []ent.Mixin {
	return []ent.Mixin{
		schemamixin.TimeMixin{},
	}
}

// Fields of the Gateway.
func (Gateway) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.String("name").
			NotEmpty().
			MaxLen(255).
			Comment("Display name of the gateway"),
		field.String("url").
			NotEmpty().
			MaxLen(2048).
			Comment("Connection URL for the gateway"),
		field.Enum("status").
			Values("connected", "disconnected").
			Default("disconnected").
			Comment("Current connection status"),
		field.Bool("allow_insecure_tls").
			Default(false).
			Comment("Whether to allow insecure TLS connections"),
		field.String("auth_token").
			Optional().
			Sensitive().
			MaxLen(512).
			Comment("Authentication token for the gateway (sensitive, excluded from logs)"),
		field.Time("last_connected_at").
			Optional().
			Nillable().
			Comment("Timestamp of the last successful connection"),
		field.UUID("organization_id", uuid.UUID{}).
			Comment("Foreign key to organization"),
	}
}

// Edges of the Gateway.
func (Gateway) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("organization", Organization.Type).
			Ref("gateways").
			Field("organization_id").
			Unique().
			Required(),
		edge.To("agents", Agent.Type).
			Comment("Agents running on this gateway"),
	}
}
