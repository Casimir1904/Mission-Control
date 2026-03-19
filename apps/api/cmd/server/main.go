package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/clawteam"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/config"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/events"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/gateway"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/handler"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/service"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ws"

	"database/sql"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	if err := run(); err != nil {
		slog.Error("fatal error", "error", err)
		os.Exit(1)
	}
}

func run() error {
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	setupLogger(cfg.LogLevel)

	slog.Info("starting mission-control api",
		"port", cfg.Port,
		"log_level", cfg.LogLevel,
	)

	// Initialize Ent client with PostgreSQL via pgx driver.
	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("open database connection: %w", err)
	}
	drv := entsql.OpenDB(dialect.Postgres, db)
	entClient := generated.NewClient(generated.Driver(drv))
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer entClient.Close()

	// Run auto-migration on startup.
	slog.Info("running database auto-migration")
	if err := entClient.Schema.Create(ctx); err != nil {
		return fmt.Errorf("auto-migrate schema: %w", err)
	}
	slog.Info("database migration complete")

	// Initialize NATS event bus.
	bus, err := events.NewBus(ctx, cfg.NATSURL)
	if err != nil {
		return fmt.Errorf("connect nats: %w", err)
	}
	defer bus.Close()

	// Initialize WebSocket hub.
	hub := ws.NewHub()
	go hub.Run(ctx)

	// Initialize Phase 1 services.
	orgSvc := service.NewOrgService(entClient)
	boardSvc := service.NewBoardService(entClient)
	agentSvc := service.NewAgentService(entClient)
	taskSvc := service.NewTaskService(entClient, bus)
	tagSvc := service.NewTagService(entClient)

	// Initialize Phase 2 services.
	approvalSvc := service.NewApprovalService(entClient, bus, taskSvc)
	activitySvc := service.NewActivityService(entClient)
	heartbeatSvc := service.NewHeartbeatService(entClient, bus)
	dashboardSvc := service.NewDashboardService(entClient, approvalSvc, activitySvc)

	// Start activity subscriber goroutine (records NATS events as activity).
	actSub := service.NewActivitySubscriber(bus, activitySvc)
	go actSub.Run(ctx)

	// Start stale agent checker goroutine (monitors heartbeat freshness).
	go heartbeatSvc.RunStaleChecker(ctx)

	// Start NATS-to-WebSocket bridge goroutine.
	bridge := ws.NewBridge(hub, bus)
	go bridge.Run(ctx)

	// Initialize Phase 3 intelligence services.
	memorySvc := service.NewMemoryService(entClient, bus)
	notifSvc := service.NewNotificationService(entClient)
	costSvc := service.NewCostService(entClient)
	traceSvc := service.NewTraceService(entClient)

	// Initialize Phase 3 gateway manager and service.
	// Pass device identity directory so the manager can authenticate with
	// remote gateways using Ed25519 device mode.
	gwManager := gateway.NewManager(entClient, bus, cfg.DeviceIdentityDir, slog.Default())
	gatewaySvc := service.NewGatewayService(entClient, gwManager)

	// Start gateway manager goroutine (connects to all registered gateways).
	go func() {
		if err := gwManager.Start(ctx); err != nil {
			slog.Error("gateway manager error", "error", err)
		}
	}()

	// Start notification generator goroutine (auto-generates notifications from events).
	notifGen := service.NewNotificationGenerator(bus, notifSvc)
	go notifGen.Run(ctx)

	// Initialize Phase 5 chat and dispatch services.
	chatSvc := service.NewChatService(entClient, bus, gwManager)
	dispatchSvc := service.NewDispatchService(entClient, bus, chatSvc)

	// Wire auto-dispatch into task service. When a task transitions to in_progress,
	// it will automatically dispatch the task to the assigned agent if one has a gateway.
	service.SetDispatchFunc(taskSvc, func(ctx context.Context, taskID uuid.UUID) error {
		_, err := dispatchSvc.DispatchTask(ctx, taskID)
		return err
	})

	// Initialize Phase 5b services.
	deliverableSvc := service.NewDeliverableService(entClient)
	orchestratorSvc := service.NewOrchestratorService(entClient, bus, chatSvc, taskSvc, dispatchSvc)

	// Wire lead agent orchestration into task service. When a task is created on a board
	// with a lead agent, the orchestrator plans the task in a non-blocking goroutine.
	service.SetOrchestratorFunc(taskSvc, func(ctx context.Context, taskID uuid.UUID) error {
		return orchestratorSvc.PlanTask(ctx, taskID)
	})

	// Start chat event listener goroutine (persists agent messages from gateway events).
	chatListener := service.NewChatEventListener(bus, chatSvc)
	chatListener.SetOrchestratorService(orchestratorSvc)
	go chatListener.Run(ctx)

	// Initialize Phase 6 ClawTeam integration (optional).
	var clawTeamSvc service.ClawTeamService
	if cfg.ClawTeamEnabled && cfg.ClawTeamSSH != "" {
		ctClient := clawteam.NewClient(cfg.ClawTeamSSH, cfg.ClawTeamURL)
		clawTeamSvc = service.NewClawTeamService(ctClient)
		slog.Info("clawteam integration enabled", "ssh", cfg.ClawTeamSSH, "board_url", cfg.ClawTeamURL)
	}

	// Build the HTTP router.
	deps := &handler.Dependencies{
		Config:       cfg,
		Hub:          hub,
		Bus:          bus,
		OrgService:   orgSvc,
		BoardService: boardSvc,
		AgentService: agentSvc,
		TaskService:  taskSvc,
		TagService:   tagSvc,

		// Phase 2 services.
		ApprovalService:  approvalSvc,
		ActivityService:  activitySvc,
		HeartbeatService: heartbeatSvc,
		DashboardService: dashboardSvc,

		// Phase 3 services.
		GatewayService:      gatewaySvc,
		MemoryService:       memorySvc,
		NotificationService: notifSvc,
		CostService:         costSvc,
		TraceService:        traceSvc,

		// Phase 5 services.
		ChatService:     chatSvc,
		DispatchService: dispatchSvc,

		// Phase 5b services.
		DeliverableService:  deliverableSvc,
		OrchestratorService: orchestratorSvc,

		// Phase 6 services.
		ClawTeamService: clawTeamSvc,
	}
	router := handler.NewRouter(deps)

	srv := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	// Start the server in a goroutine.
	errCh := make(chan error, 1)
	go func() {
		slog.Info("http server listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- fmt.Errorf("listen and serve: %w", err)
		}
		close(errCh)
	}()

	// Wait for shutdown signal or server error.
	select {
	case <-ctx.Done():
		slog.Info("shutdown signal received")
	case err := <-errCh:
		return err
	}

	// Graceful shutdown with timeout.
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown server: %w", err)
	}

	slog.Info("server stopped gracefully")
	return nil
}

func setupLogger(level string) {
	var logLevel slog.Level
	switch level {
	case "debug":
		logLevel = slog.LevelDebug
	case "warn":
		logLevel = slog.LevelWarn
	case "error":
		logLevel = slog.LevelError
	default:
		logLevel = slog.LevelInfo
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: logLevel,
	}))
	slog.SetDefault(logger)
}
