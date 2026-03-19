package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/apperror"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/gateway"
	gwclient "github.com/Casimir1904/Mission-Control/apps/api/internal/gateway"
)

// GatewayService defines the interface for gateway CRUD and operations.
type GatewayService interface {
	Create(ctx context.Context, input dto.CreateGatewayInput) (*dto.GatewayOutput, error)
	Get(ctx context.Context, id uuid.UUID) (*dto.GatewayOutput, error)
	List(ctx context.Context, opts dto.ListGatewaysOptions) (*dto.PaginatedResponse[dto.GatewayOutput], error)
	Update(ctx context.Context, id uuid.UUID, input dto.UpdateGatewayInput) (*dto.GatewayOutput, error)
	Delete(ctx context.Context, id uuid.UUID) error
	TestConnection(ctx context.Context, id uuid.UUID) (*dto.TestConnectionOutput, error)
	Sync(ctx context.Context, id uuid.UUID) (*dto.SyncOutput, error)
}

type gatewayService struct {
	client  *generated.Client
	manager *gwclient.Manager
}

// NewGatewayService creates a new GatewayService backed by the Ent client and gateway manager.
func NewGatewayService(client *generated.Client, manager *gwclient.Manager) GatewayService {
	return &gatewayService{
		client:  client,
		manager: manager,
	}
}

func (s *gatewayService) Create(ctx context.Context, input dto.CreateGatewayInput) (*dto.GatewayOutput, error) {
	gw, err := s.client.Gateway.Create().
		SetName(input.Name).
		SetURL(input.URL).
		SetAuthToken(input.AuthToken).
		SetAllowInsecureTLS(input.AllowInsecureTLS).
		SetOrganizationID(input.OrganizationID).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.GatewayService.Create: %w", err)
	}

	slog.Info("gateway created", "id", gw.ID, "name", input.Name)
	return s.gatewayToOutput(ctx, gw)
}

func (s *gatewayService) Get(ctx context.Context, id uuid.UUID) (*dto.GatewayOutput, error) {
	gw, err := s.client.Gateway.Query().
		Where(gateway.ID(id)).
		WithAgents().
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("gateway not found")
		}
		return nil, fmt.Errorf("service.GatewayService.Get: %w", err)
	}
	return s.gatewayToOutput(ctx, gw)
}

func (s *gatewayService) List(ctx context.Context, opts dto.ListGatewaysOptions) (*dto.PaginatedResponse[dto.GatewayOutput], error) {
	query := s.client.Gateway.Query().
		Order(generated.Desc(gateway.FieldCreatedAt))

	if opts.OrganizationID != nil {
		query = query.Where(gateway.OrganizationID(*opts.OrganizationID))
	}
	if opts.Status != "" {
		query = query.Where(gateway.StatusEQ(gateway.Status(opts.Status)))
	}

	total, err := query.Clone().Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.GatewayService.List count: %w", err)
	}

	gateways, err := query.
		Limit(opts.Limit()).
		Offset(opts.Offset()).
		WithAgents().
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.GatewayService.List: %w", err)
	}

	items := make([]dto.GatewayOutput, len(gateways))
	for i, gw := range gateways {
		out, err := s.gatewayToOutput(ctx, gw)
		if err != nil {
			return nil, err
		}
		items[i] = *out
	}

	return &dto.PaginatedResponse[dto.GatewayOutput]{
		Items:   items,
		Total:   total,
		Page:    opts.Page,
		PerPage: opts.Limit(),
	}, nil
}

func (s *gatewayService) Update(ctx context.Context, id uuid.UUID, input dto.UpdateGatewayInput) (*dto.GatewayOutput, error) {
	builder := s.client.Gateway.UpdateOneID(id)

	if input.Name != nil {
		builder.SetName(*input.Name)
	}
	if input.URL != nil {
		builder.SetURL(*input.URL)
	}
	if input.AuthToken != nil {
		builder.SetAuthToken(*input.AuthToken)
	}
	if input.AllowInsecureTLS != nil {
		builder.SetAllowInsecureTLS(*input.AllowInsecureTLS)
	}

	gw, err := builder.Save(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("gateway not found")
		}
		return nil, fmt.Errorf("service.GatewayService.Update: %w", err)
	}

	slog.Info("gateway updated", "id", id)
	return s.gatewayToOutput(ctx, gw)
}

func (s *gatewayService) Delete(ctx context.Context, id uuid.UUID) error {
	// Disconnect the gateway first if it's connected.
	_ = s.manager.DisconnectGateway(id)

	err := s.client.Gateway.DeleteOneID(id).Exec(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return apperror.NewNotFound("gateway not found")
		}
		return fmt.Errorf("service.GatewayService.Delete: %w", err)
	}
	slog.Info("gateway deleted", "id", id)
	return nil
}

func (s *gatewayService) TestConnection(ctx context.Context, id uuid.UUID) (*dto.TestConnectionOutput, error) {
	// Load gateway from DB.
	gw, err := s.client.Gateway.Get(ctx, id)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("gateway not found")
		}
		return nil, fmt.Errorf("service.GatewayService.TestConnection: %w", err)
	}

	if gw.AuthToken == "" {
		return &dto.TestConnectionOutput{
			Status:  "failed",
			Message: "no auth token configured",
		}, nil
	}

	// Create a temporary client to test the connection.
	start := time.Now()
	client := gwclient.NewClient(gw.URL, gw.AuthToken, nil, slog.Default())
	if err := client.Connect(ctx); err != nil {
		return &dto.TestConnectionOutput{
			Status:  "failed",
			Message: fmt.Sprintf("connection failed: %v", err),
		}, nil
	}

	// Call health to verify the gateway is responsive.
	_, rpcErr := client.Call(ctx, "health", nil)
	latency := time.Since(start).Milliseconds()
	client.Close()

	if rpcErr != nil {
		return &dto.TestConnectionOutput{
			Status:    "failed",
			Message:   fmt.Sprintf("health check failed: %v", rpcErr),
			LatencyMs: latency,
		}, nil
	}

	return &dto.TestConnectionOutput{
		Status:    "connected",
		Message:   "gateway is healthy and responsive",
		LatencyMs: latency,
	}, nil
}

func (s *gatewayService) Sync(ctx context.Context, id uuid.UUID) (*dto.SyncOutput, error) {
	result, err := s.manager.SyncAgents(ctx, id)
	if err != nil {
		return nil, apperror.NewGatewayError(fmt.Sprintf("agent sync failed: %v", err))
	}

	return &dto.SyncOutput{
		AgentsSynced:  result.AgentsSynced,
		AgentsAdded:   result.AgentsAdded,
		AgentsUpdated: result.AgentsUpdated,
		AgentsOffline: result.AgentsOffline,
	}, nil
}

func (s *gatewayService) gatewayToOutput(ctx context.Context, gw *generated.Gateway) (*dto.GatewayOutput, error) {
	out := &dto.GatewayOutput{
		ID:               gw.ID,
		Name:             gw.Name,
		URL:              gw.URL,
		Status:           string(gw.Status),
		AllowInsecureTLS: gw.AllowInsecureTLS,
		OrganizationID:   gw.OrganizationID,
		LastConnectedAt:  gw.LastConnectedAt,
		CreatedAt:        gw.CreatedAt,
		UpdatedAt:        gw.UpdatedAt,
	}

	// Agent count from eager-loaded edges or a separate query.
	if gw.Edges.Agents != nil {
		out.AgentCount = len(gw.Edges.Agents)
	} else {
		count, err := gw.QueryAgents().Count(ctx)
		if err == nil {
			out.AgentCount = count
		}
	}

	return out, nil
}
