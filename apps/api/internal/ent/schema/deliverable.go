package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"

	schemamixin "github.com/Casimir1904/Mission-Control/apps/api/internal/ent/schema/mixin"
)

// Deliverable holds the schema definition for the Deliverable entity.
// A deliverable is an artifact (file, link, or text) produced during task execution.
type Deliverable struct {
	ent.Schema
}

// Mixin of the Deliverable.
func (Deliverable) Mixin() []ent.Mixin {
	return []ent.Mixin{
		schemamixin.TimeMixin{},
	}
}

// Fields of the Deliverable.
func (Deliverable) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.UUID("task_id", uuid.UUID{}).
			Comment("Foreign key to the task this deliverable belongs to"),
		field.Enum("type").
			Values("file", "link", "text").
			Comment("Type of deliverable: file content, URL link, or text output"),
		field.String("name").
			NotEmpty().
			MaxLen(512).
			Comment("Filename, title, or label for this deliverable"),
		field.Text("content").
			Comment("File content, URL, or text output stored in the database"),
		field.String("mime_type").
			Optional().
			MaxLen(255).
			Comment("MIME type for file type detection (e.g., text/plain, application/json)"),
		field.Int("size_bytes").
			Optional().
			Nillable().
			NonNegative().
			Comment("Size of the content in bytes"),
	}
}

// Edges of the Deliverable.
func (Deliverable) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("task", Task.Type).
			Ref("deliverables").
			Field("task_id").
			Unique().
			Required(),
	}
}
