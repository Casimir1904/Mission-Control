package mixin

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/mixin"

	"github.com/google/uuid"
)

// OrgMixin adds an organization_id foreign key field to any schema.
// Schemas that use this mixin should define their own edge to Organization
// using the organization_id field, since Ent mixins cannot reference
// schema types from a separate package.
//
// Usage in a schema:
//
//	func (MyEntity) Mixin() []ent.Mixin {
//	    return []ent.Mixin{
//	        mixin.TimeMixin{},
//	        mixin.OrgMixin{},
//	    }
//	}
//
//	func (MyEntity) Edges() []ent.Edge {
//	    return []ent.Edge{
//	        edge.From("organization", Organization.Type).
//	            Ref("my_entities").
//	            Field("organization_id").
//	            Unique().
//	            Required(),
//	    }
//	}
type OrgMixin struct {
	mixin.Schema
}

// Fields of the OrgMixin.
func (OrgMixin) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("organization_id", uuid.UUID{}).
			Immutable().
			Comment("The organization this record belongs to"),
	}
}
