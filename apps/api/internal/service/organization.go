package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/apperror"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/organization"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/orgmember"
)

// OrgService defines the interface for organization operations.
type OrgService interface {
	Create(ctx context.Context, input dto.CreateOrganizationInput) (*dto.OrganizationOutput, error)
	Get(ctx context.Context, id uuid.UUID) (*dto.OrganizationOutput, error)
	List(ctx context.Context, opts dto.ListOrganizationsOptions) (*dto.PaginatedResponse[dto.OrganizationOutput], error)
	Update(ctx context.Context, id uuid.UUID, input dto.UpdateOrganizationInput) (*dto.OrganizationOutput, error)
	Delete(ctx context.Context, id uuid.UUID) error
	AddMember(ctx context.Context, orgID, userID uuid.UUID, role string) (*dto.OrgMemberOutput, error)
	RemoveMember(ctx context.Context, orgID, userID uuid.UUID) error
	ListMembers(ctx context.Context, orgID uuid.UUID) ([]dto.OrgMemberOutput, error)
}

type orgService struct {
	client *generated.Client
}

// NewOrgService creates a new OrgService backed by the Ent client.
func NewOrgService(client *generated.Client) OrgService {
	return &orgService{client: client}
}

func (s *orgService) Create(ctx context.Context, input dto.CreateOrganizationInput) (*dto.OrganizationOutput, error) {
	builder := s.client.Organization.Create().
		SetName(input.Name).
		SetSlug(input.Slug)

	if input.Description != "" {
		builder.SetDescription(input.Description)
	}

	org, err := builder.Save(ctx)
	if err != nil {
		if generated.IsConstraintError(err) {
			return nil, apperror.NewConflict("organization slug already exists")
		}
		return nil, fmt.Errorf("service.OrgService.Create: %w", err)
	}

	slog.Info("organization created", "id", org.ID, "slug", input.Slug)
	return orgToOutput(org), nil
}

func (s *orgService) Get(ctx context.Context, id uuid.UUID) (*dto.OrganizationOutput, error) {
	org, err := s.client.Organization.Get(ctx, id)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("organization not found")
		}
		return nil, fmt.Errorf("service.OrgService.Get: %w", err)
	}
	return orgToOutput(org), nil
}

func (s *orgService) List(ctx context.Context, opts dto.ListOrganizationsOptions) (*dto.PaginatedResponse[dto.OrganizationOutput], error) {
	query := s.client.Organization.Query().
		Order(generated.Desc(organization.FieldCreatedAt))

	total, err := query.Clone().Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.OrgService.List count: %w", err)
	}

	orgs, err := query.
		Limit(opts.Limit()).
		Offset(opts.Offset()).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.OrgService.List: %w", err)
	}

	items := make([]dto.OrganizationOutput, len(orgs))
	for i, org := range orgs {
		items[i] = *orgToOutput(org)
	}

	return &dto.PaginatedResponse[dto.OrganizationOutput]{
		Items:   items,
		Total:   total,
		Page:    opts.Page,
		PerPage: opts.Limit(),
	}, nil
}

func (s *orgService) Update(ctx context.Context, id uuid.UUID, input dto.UpdateOrganizationInput) (*dto.OrganizationOutput, error) {
	builder := s.client.Organization.UpdateOneID(id)

	if input.Name != nil {
		builder.SetName(*input.Name)
	}
	if input.Description != nil {
		builder.SetDescription(*input.Description)
	}

	org, err := builder.Save(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("organization not found")
		}
		return nil, fmt.Errorf("service.OrgService.Update: %w", err)
	}

	slog.Info("organization updated", "id", id)
	return orgToOutput(org), nil
}

func (s *orgService) Delete(ctx context.Context, id uuid.UUID) error {
	err := s.client.Organization.DeleteOneID(id).Exec(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return apperror.NewNotFound("organization not found")
		}
		return fmt.Errorf("service.OrgService.Delete: %w", err)
	}
	slog.Info("organization deleted", "id", id)
	return nil
}

func (s *orgService) AddMember(ctx context.Context, orgID, userID uuid.UUID, role string) (*dto.OrgMemberOutput, error) {
	// Verify the organization exists.
	exists, err := s.client.Organization.Query().Where(organization.ID(orgID)).Exist(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.OrgService.AddMember org check: %w", err)
	}
	if !exists {
		return nil, apperror.NewNotFound("organization not found")
	}

	// Check for duplicate membership.
	dup, err := s.client.OrgMember.Query().
		Where(
			orgmember.OrganizationID(orgID),
			orgmember.UserID(userID),
		).Exist(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.OrgService.AddMember dup check: %w", err)
	}
	if dup {
		return nil, apperror.NewConflict("user is already a member of this organization")
	}

	member, err := s.client.OrgMember.Create().
		SetOrganizationID(orgID).
		SetUserID(userID).
		SetRole(orgmember.Role(role)).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.OrgService.AddMember: %w", err)
	}

	// Eager-load the user for the response.
	member, err = s.client.OrgMember.Query().
		Where(orgmember.ID(member.ID)).
		WithUser().
		Only(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.OrgService.AddMember reload: %w", err)
	}

	slog.Info("member added to organization", "org_id", orgID, "user_id", userID, "role", role)
	return memberToOutput(member), nil
}

func (s *orgService) RemoveMember(ctx context.Context, orgID, userID uuid.UUID) error {
	// Find the membership record.
	member, err := s.client.OrgMember.Query().
		Where(
			orgmember.OrganizationID(orgID),
			orgmember.UserID(userID),
		).Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return apperror.NewNotFound("membership not found")
		}
		return fmt.Errorf("service.OrgService.RemoveMember: %w", err)
	}

	if err := s.client.OrgMember.DeleteOne(member).Exec(ctx); err != nil {
		return fmt.Errorf("service.OrgService.RemoveMember delete: %w", err)
	}

	slog.Info("member removed from organization", "org_id", orgID, "user_id", userID)
	return nil
}

func (s *orgService) ListMembers(ctx context.Context, orgID uuid.UUID) ([]dto.OrgMemberOutput, error) {
	members, err := s.client.OrgMember.Query().
		Where(orgmember.OrganizationID(orgID)).
		WithUser().
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.OrgService.ListMembers: %w", err)
	}

	out := make([]dto.OrgMemberOutput, len(members))
	for i, m := range members {
		out[i] = *memberToOutput(m)
	}
	return out, nil
}

func orgToOutput(org *generated.Organization) *dto.OrganizationOutput {
	return &dto.OrganizationOutput{
		ID:          org.ID,
		Name:        org.Name,
		Slug:        org.Slug,
		Description: org.Description,
		CreatedAt:   org.CreatedAt,
		UpdatedAt:   org.UpdatedAt,
	}
}

func memberToOutput(m *generated.OrgMember) *dto.OrgMemberOutput {
	out := &dto.OrgMemberOutput{
		ID:        m.ID,
		UserID:    m.UserID,
		Role:      string(m.Role),
		CreatedAt: m.CreatedAt,
	}
	if m.Edges.User != nil {
		out.Email = m.Edges.User.Email
		out.Name = m.Edges.User.DisplayName
	}
	return out
}
