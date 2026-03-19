# Architecture

Mission Control is a self-hosted operations center for managing AI agents across
multiple OpenClaw instances. It provides a unified dashboard, task management,
approval workflows, and real-time monitoring.

## System Overview

```
                         +-----------------+
                         |    Browser      |
                         | (Next.js SPA)   |
                         +--------+--------+
                                  |
                          HTTP / WebSocket
                                  |
                         +--------v--------+
                         |    API Server   |
                         | (Go + chi/Huma) |
                         +--+-----------+--+
                            |           |
                +-----------+           +-----------+
                |                                   |
       +--------v--------+                 +--------v--------+
       |   PostgreSQL 16  |                 |   NATS JetStream |
       |   (persistent    |                 |   (events,       |
       |    data store)   |                 |    real-time)    |
       +---------+--------+                 +--------+--------+
                                                     |
       +------------------+                 +--------v--------+
       |   Redis 7        |                 |  WebSocket Hub   |
       |   (cache, temp   |                 |  (browser push)  |
       |    state)        |                 +---------+--------+
       +------------------+                           |
                                              WebSocket to browser
       +------------------+
       |  OpenClaw Gateway |<--- WebSocket JSON-RPC --- API Server
       |  (remote agent   |
       |   runtime)       |
       +------------------+
```

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **API** | Go 1.23, chi router, Huma framework | HTTP routing, OpenAPI generation, request validation |
| **ORM** | Ent | Type-safe database access, auto-migration, privacy policies |
| **Frontend** | Next.js 15, React 19, TanStack Query | Server-side rendering, data fetching, caching |
| **State** | Jotai | Lightweight client-side state management |
| **UI** | shadcn/ui, Radix, Tailwind CSS | Component library, accessible primitives, utility-first CSS |
| **Database** | PostgreSQL 16 | Primary data store for all entities |
| **Cache** | Redis 7 | Session data, rate limiting, temporary state |
| **Events** | NATS JetStream | Durable event streaming, pub/sub |
| **Monorepo** | Turborepo | Parallel builds, dependency-aware task execution |

## Component Boundaries

### API Server (`apps/api/`)

The API is a single Go binary organized into clean layers:

```
apps/api/
  cmd/server/main.go       -- Entrypoint: config, DB, NATS, WS hub, HTTP server
  internal/
    config/                 -- Environment variable loading
    handler/                -- HTTP handlers (one file per resource)
      router.go             -- Route registration, middleware stack
    service/                -- Business logic layer
    dto/                    -- Request/response types (Huma schemas)
    ent/
      schema/               -- Ent entity definitions
      generated/            -- Auto-generated Ent client code
    events/                 -- NATS event bus wrapper
    gateway/                -- OpenClaw WebSocket RPC client
    ws/                     -- Browser WebSocket hub
    middleware/             -- Auth, logging, request ID, CORS
    apperror/               -- Structured application errors
```

**Request flow**: HTTP request --> chi middleware --> Huma validation --> handler --> service --> Ent --> PostgreSQL

### Frontend (`apps/web/`)

A Next.js application using the App Router:

```
apps/web/
  src/
    app/                    -- Page routes (file-system routing)
    components/
      ui/                   -- shadcn/ui primitives (Button, Card, Dialog, etc.)
      atoms/                -- Small display components (StatusDot, BrandMark)
      molecules/            -- Composed components (TaskCard, DependencyBanner)
      organisms/            -- Full sections (TaskBoard, DashboardSidebar)
      templates/            -- Page layouts (DashboardShell, LandingShell)
    lib/                    -- Utilities, hooks, API client
    api/                    -- Generated API client (via Orval from OpenAPI spec)
```

### Gateway Client (`internal/gateway/`)

Mission Control connects to OpenClaw instances via WebSocket JSON-RPC (protocol v3).
Each gateway connection is managed independently and supports:

- Token-based authentication or Ed25519 device identity
- Agent sync (import agents from OpenClaw into Mission Control)
- Session management (create, message, close agent sessions)
- Health checks and connection testing

## Data Flow

### Write Path (User creates a task)

```
Browser --> POST /api/v1/boards/{id}/tasks
         --> handler.CreateTask()
         --> service.TaskService.Create()
         --> ent.Task.Create().Save()        -- writes to PostgreSQL
         --> bus.Publish("task.created", ...)  -- publishes to NATS
         --> hub.Broadcast(boardID, event)     -- pushes to WebSocket clients
         --> 201 Created response to browser
```

### Read Path (Dashboard loads)

```
Browser --> GET /api/v1/dashboard
         --> handler.GetDashboard()
         --> service.DashboardService.Get()
         --> ent queries (task counts, agent status, etc.)
         --> JSON response to browser
```

### Real-Time Updates

```
NATS JetStream
  |
  +-- events.Bus subscribes to subjects (task.*, agent.*, approval.*)
  |
  +-- On event received:
        ws.Hub.Broadcast(orgID, boardID, event)
          |
          +-- Sends JSON message to all connected browser WebSocket clients
```

The frontend maintains a persistent WebSocket connection at `ws://host:8000/ws`.
TanStack Query caches are invalidated based on incoming WebSocket events, so the
UI stays current without polling.

## Multi-Tenancy

Mission Control supports multiple organizations in a single deployment:

- **Ent privacy policies** enforce tenant isolation at the ORM level. Every query
  is automatically scoped to the requesting user's organization.
- **Fail-safe design**: If the privacy policy check fails (e.g., missing context),
  the query is denied rather than returning data from another tenant.
- Organization membership is tracked via the `org_member` entity.

## Entity Model

Key entities and their relationships:

```
Organization
  |-- Board (project/team workspace)
  |     |-- Task (work item with status: todo/in_progress/done)
  |     |-- Agent (AI agent assigned to a board)
  |     |-- Approval (human review of agent actions)
  |     |-- Board Memory (persistent context for agents)
  |     +-- Webhook (inbound event triggers)
  |-- Board Group (cross-board coordination)
  |-- Tag (label system for agents and tasks)
  |-- Gateway (connection to an OpenClaw instance)
  +-- Org Member (user membership with role)

Activity Event (audit log of all actions)
Notification (user alerts)
Cost Record (LLM usage tracking)
Trace / Span (agent execution tracing)
```

## Ports and Protocols

| Service | Default Port | Protocol |
|---|---|---|
| API Server | 8000 | HTTP, WebSocket |
| Frontend | 3000 | HTTP |
| PostgreSQL | 5432 | PostgreSQL wire protocol |
| Redis | 6379 | RESP |
| NATS | 4222 | NATS client protocol |
| NATS Monitor | 8222 | HTTP |
| OpenClaw Gateway | 18789 | WebSocket JSON-RPC |
