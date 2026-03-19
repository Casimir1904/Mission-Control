package dto_test

import (
	"reflect"
	"strings"
	"testing"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
)

// TestCreateTaskInput_PriorityEnumTag verifies the priority field's enum tag
// contains exactly the expected values: low, medium, high, critical.
func TestCreateTaskInput_PriorityEnumTag(t *testing.T) {
	typ := reflect.TypeOf(dto.CreateTaskInput{})
	field, ok := typ.FieldByName("Priority")
	if !ok {
		t.Fatal("CreateTaskInput missing Priority field")
	}

	enumTag := field.Tag.Get("enum")
	if enumTag == "" {
		t.Fatal("Priority field missing enum tag")
	}

	values := strings.Split(enumTag, ",")
	expected := []string{"low", "medium", "high", "critical"}

	if len(values) != len(expected) {
		t.Fatalf("enum values count = %d, want %d: got %v", len(values), len(expected), values)
	}

	for i, v := range values {
		if v != expected[i] {
			t.Errorf("enum value[%d] = %q, want %q", i, v, expected[i])
		}
	}
}

// TestUpdateTaskInput_PriorityEnumTag verifies UpdateTaskInput has the same
// priority enum values.
func TestUpdateTaskInput_PriorityEnumTag(t *testing.T) {
	typ := reflect.TypeOf(dto.UpdateTaskInput{})
	field, ok := typ.FieldByName("Priority")
	if !ok {
		t.Fatal("UpdateTaskInput missing Priority field")
	}

	enumTag := field.Tag.Get("enum")
	expected := "low,medium,high,critical"
	if enumTag != expected {
		t.Errorf("Priority enum = %q, want %q", enumTag, expected)
	}
}

// TestCreateTaskInput_TitleConstraints verifies the title field has proper
// min/max length constraints.
func TestCreateTaskInput_TitleConstraints(t *testing.T) {
	typ := reflect.TypeOf(dto.CreateTaskInput{})
	field, ok := typ.FieldByName("Title")
	if !ok {
		t.Fatal("CreateTaskInput missing Title field")
	}

	minLen := field.Tag.Get("minLength")
	maxLen := field.Tag.Get("maxLength")

	if minLen != "1" {
		t.Errorf("Title minLength = %q, want %q", minLen, "1")
	}
	if maxLen != "512" {
		t.Errorf("Title maxLength = %q, want %q", maxLen, "512")
	}
}

// TestCreateTaskInput_DescriptionConstraints verifies description max length.
func TestCreateTaskInput_DescriptionConstraints(t *testing.T) {
	typ := reflect.TypeOf(dto.CreateTaskInput{})
	field, ok := typ.FieldByName("Description")
	if !ok {
		t.Fatal("CreateTaskInput missing Description field")
	}

	maxLen := field.Tag.Get("maxLength")
	if maxLen != "16384" {
		t.Errorf("Description maxLength = %q, want %q", maxLen, "16384")
	}
}

// TestCreateTaskInput_JSONTags verifies all JSON field names match the API contract.
func TestCreateTaskInput_JSONTags(t *testing.T) {
	typ := reflect.TypeOf(dto.CreateTaskInput{})

	expected := map[string]string{
		"Title":           "title",
		"Description":     "description",
		"Priority":        "priority",
		"BoardID":         "board_id",
		"AssignedAgentID": "assigned_agent_id",
	}

	for fieldName, wantJSON := range expected {
		field, ok := typ.FieldByName(fieldName)
		if !ok {
			t.Errorf("missing field %q", fieldName)
			continue
		}
		jsonTag := field.Tag.Get("json")
		// Strip options like ",omitempty".
		jsonName := strings.Split(jsonTag, ",")[0]
		if jsonName != wantJSON {
			t.Errorf("field %q json tag = %q, want %q", fieldName, jsonName, wantJSON)
		}
	}
}

// TestTaskOutput_JSONTags verifies the output DTO JSON tags.
func TestTaskOutput_JSONTags(t *testing.T) {
	typ := reflect.TypeOf(dto.TaskOutput{})

	expected := map[string]string{
		"ID":              "id",
		"Title":           "title",
		"Description":     "description",
		"Status":          "status",
		"Priority":        "priority",
		"BoardID":         "board_id",
		"AssignedAgentID": "assigned_agent_id",
		"Dependencies":    "dependencies",
		"CreatedAt":       "created_at",
		"UpdatedAt":       "updated_at",
	}

	for fieldName, wantJSON := range expected {
		field, ok := typ.FieldByName(fieldName)
		if !ok {
			t.Errorf("TaskOutput missing field %q", fieldName)
			continue
		}
		jsonTag := field.Tag.Get("json")
		jsonName := strings.Split(jsonTag, ",")[0]
		if jsonName != wantJSON {
			t.Errorf("field %q json tag = %q, want %q", fieldName, jsonName, wantJSON)
		}
	}
}

// TestTransitionInput_HasStatus verifies the TransitionInput DTO has a Status field.
func TestTransitionInput_HasStatus(t *testing.T) {
	typ := reflect.TypeOf(dto.TransitionInput{})
	field, ok := typ.FieldByName("Status")
	if !ok {
		t.Fatal("TransitionInput missing Status field")
	}

	jsonTag := field.Tag.Get("json")
	if jsonTag != "status" {
		t.Errorf("Status json tag = %q, want %q", jsonTag, "status")
	}
}

// TestAddDependencyInput_HasDependsOnID verifies the dependency input DTO.
func TestAddDependencyInput_HasDependsOnID(t *testing.T) {
	typ := reflect.TypeOf(dto.AddDependencyInput{})
	field, ok := typ.FieldByName("DependsOnID")
	if !ok {
		t.Fatal("AddDependencyInput missing DependsOnID field")
	}

	jsonTag := field.Tag.Get("json")
	jsonName := strings.Split(jsonTag, ",")[0]
	if jsonName != "depends_on_id" {
		t.Errorf("DependsOnID json tag = %q, want %q", jsonName, "depends_on_id")
	}

	formatTag := field.Tag.Get("format")
	if formatTag != "uuid" {
		t.Errorf("DependsOnID format tag = %q, want %q", formatTag, "uuid")
	}
}
