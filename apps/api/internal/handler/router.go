package handler

import (
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/config"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/events"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/middleware"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/service"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ws"
)

// Dependencies holds shared dependencies injected into route handlers.
type Dependencies struct {
	Config *config.Config
	Hub    *ws.Hub
	Bus    *events.Bus

	// Phase 1 services.
	OrgService   service.OrgService
	BoardService service.BoardService
	AgentService service.AgentService
	TaskService  service.TaskService
	TagService   service.TagService

	// Phase 2 services.
	ApprovalService  service.ApprovalService
	ActivityService  service.ActivityService
	HeartbeatService service.HeartbeatService
	DashboardService service.DashboardService

	// Phase 3 services.
	GatewayService      service.GatewayService
	MemoryService       service.MemoryService
	NotificationService service.NotificationService
	CostService         service.CostService
	TraceService        service.TraceService

	// Phase 5 services.
	ChatService     service.ChatService
	DispatchService service.DispatchService

	// Phase 5b services.
	DeliverableService  service.DeliverableService
	OrchestratorService service.OrchestratorService

	// Phase 6 services.
	ClawTeamService service.ClawTeamService
}

// NewRouter creates and configures the chi router with Huma API and all middleware.
func NewRouter(deps *Dependencies) http.Handler {
	r := chi.NewRouter()

	// Global middleware stack (order matters).
	r.Use(middleware.Recovery)
	r.Use(middleware.RequestID)
	r.Use(middleware.Logging)
	r.Use(middleware.CORS(deps.Config.AllowedOrigins))

	// Create the Huma API instance on the /api/v1 sub-router.
	apiRouter := chi.NewRouter()
	r.Mount("/api/v1", apiRouter)

	humaConfig := huma.DefaultConfig("Mission Control API", "0.2.0")
	humaConfig.Info.Description = "AI agent operations platform API"
	humaConfig.Servers = []*huma.Server{
		{URL: "/api/v1"},
	}

	api := humachi.New(apiRouter, humaConfig)

	// Register health endpoints.
	registerHealthRoutes(api, deps)

	// Register Phase 1 CRUD routes.
	registerOrganizationRoutes(api, deps.OrgService)
	registerBoardRoutes(api, deps.BoardService)
	registerAgentRoutes(api, deps.AgentService)
	registerTaskRoutes(api, deps.TaskService)
	registerTagRoutes(api, deps.TagService)

	// Register Phase 2 real-time operations routes.
	registerApprovalRoutes(api, deps.ApprovalService)
	registerActivityRoutes(api, deps.ActivityService)
	registerHeartbeatRoutes(api, deps.HeartbeatService)
	registerDashboardRoutes(api, deps.DashboardService)

	// Register Phase 3 routes.
	registerGatewayRoutes(api, deps.GatewayService)
	registerMemoryRoutes(api, deps.MemoryService)
	registerNotificationRoutes(api, deps.NotificationService)
	registerCostRoutes(api, deps.CostService)
	registerTraceRoutes(api, deps.TraceService)

	// Register Phase 5 chat and dispatch routes.
	registerChatRoutes(api, deps.ChatService)
	registerDispatchRoutes(api, deps.DispatchService)

	// Register Phase 5b deliverable routes.
	registerDeliverableRoutes(api, deps.DeliverableService)

	// Register Phase 6 ClawTeam integration routes (if service is available).
	if deps.ClawTeamService != nil {
		registerTeamRoutes(api, deps.ClawTeamService)
	}

	// Placeholder route groups for future entities.
	apiRouter.Route("/webhooks", func(r chi.Router) {
		r.Get("/", placeholderHandler("list webhooks"))
	})

	// WebSocket endpoint at root level.
	r.Get("/ws", ws.UpgradeHandler(deps.Hub))

	// Huma auto-generates OpenAPI docs at /docs.
	r.Handle("/docs", http.RedirectHandler("/api/v1/docs", http.StatusMovedPermanently))

	return r
}

// placeholderHandler returns a handler that responds with a 501 Not Implemented status.
func placeholderHandler(resource string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotImplemented)
		_, _ = w.Write([]byte(`{"error":"not implemented","resource":"` + resource + `"}`))
	}
}
