# Development

This guide covers running Mission Control locally without Docker for active
development. You still use Docker for infrastructure (PostgreSQL, Redis, NATS)
but run the API and frontend directly on your machine.

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Go | 1.23+ | [go.dev/dl](https://go.dev/dl/) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| npm | 9+ | Included with Node.js |
| Docker | 24+ | [docker.com](https://docs.docker.com/get-docker/) |
| Docker Compose | 2.20+ | Included with Docker Desktop |

## Setup

### 1. Clone and Configure

```bash
git clone https://github.com/Casimir1904/Mission-Control.git
cd Mission-Control
cp .env.example .env
```

### 2. Start Infrastructure Services

Run only the infrastructure containers:

```bash
docker compose up postgres redis nats -d
```

Wait for healthy status:

```bash
docker compose ps
```

### 3. Start the API Server

```bash
cd apps/api
go run ./cmd/server
```

The API starts on [http://localhost:8000](http://localhost:8000). On first run, it
auto-migrates the database schema using Ent.

Environment variables for local development (these match the Docker Compose
defaults):

```bash
export DATABASE_URL="postgres://mc:mc_dev_password@localhost:5432/mission_control?sslmode=disable"
export REDIS_URL="redis://localhost:6379"
export NATS_URL="nats://localhost:4222"
export LOG_LEVEL="debug"
export ALLOWED_ORIGINS="http://localhost:3000"
```

### 4. Start the Frontend

```bash
cd apps/web
npm install
npm run dev
```

The frontend starts on [http://localhost:3000](http://localhost:3000) with hot
module replacement.

## Running Tests

### Go Tests

```bash
cd apps/api
go test ./...
```

For verbose output with race detection:

```bash
go test -v -race ./...
```

For a specific package:

```bash
go test -v ./internal/service/...
```

### Frontend Tests

```bash
cd apps/web
npm test
```

For coverage:

```bash
npm run test:coverage
```

### Running All Tests via Turborepo

From the repository root:

```bash
npx turbo test
```

Turborepo runs tests in parallel across all packages, respecting dependency order.

## Code Style

### Go

The project uses [golangci-lint](https://golangci-lint.run/) for Go code:

```bash
cd apps/api
golangci-lint run
```

Key conventions:
- Standard library `log/slog` for structured logging
- Errors wrapped with `fmt.Errorf("context: %w", err)`
- Handler files: one file per resource in `internal/handler/`
- Service files: one file per resource in `internal/service/`
- DTOs in `internal/dto/` (Huma request/response types)

### TypeScript / Frontend

The project uses ESLint with Next.js configuration:

```bash
cd apps/web
npm run lint
```

Key conventions:
- Functional components with hooks
- TanStack Query for all API data fetching
- Jotai for client-side state
- shadcn/ui components as the UI primitive layer
- Tailwind CSS for styling (no CSS modules)

### Pre-commit Hooks

The repository uses pre-commit hooks configured in `.pre-commit-config.yaml`.
Install them with:

```bash
pip install pre-commit
pre-commit install
```

Hooks include markdownlint checks for documentation quality.

## Ent Schema Changes

When you modify an Ent schema file in `apps/api/internal/ent/schema/`:

1. Edit the schema (e.g., add a field to `schema/task.go`)

2. Regenerate the Ent client:

   ```bash
   cd apps/api
   go generate ./internal/ent
   ```

3. The API applies schema changes automatically on startup via Ent's
   auto-migration. In development, this is safe to run against your local
   database.

4. Test that the migration works:

   ```bash
   go run ./cmd/server
   # Check the "database migration complete" log line
   ```

### Existing Ent Schemas

| Schema | File | Description |
|---|---|---|
| Organization | `schema/organization.go` | Tenant entity |
| Board | `schema/board.go` | Project workspace |
| Agent | `schema/agent.go` | AI agent |
| Task | `schema/task.go` | Work item |
| Tag | `schema/tag.go` | Label for agents/tasks |
| Approval | `schema/approval.go` | Human review record |
| Gateway | `schema/gateway.go` | OpenClaw connection |
| Activity Event | `schema/activity_event.go` | Audit log entry |
| Board Memory | `schema/board_memory.go` | Persistent agent context |
| Board Group | `schema/board_group.go` | Cross-board coordination |
| Notification | `schema/notification.go` | User alert |
| Cost Record | `schema/cost_record.go` | LLM usage tracking |
| Trace | `schema/trace.go` | Execution trace |
| Span | `schema/span.go` | Trace span |
| Webhook | `schema/webhook.go` | Inbound event trigger |
| User | `schema/user.go` | User account |
| Org Member | `schema/org_member.go` | Organization membership |

## Adding a New API Endpoint

Follow this workflow to add a new endpoint:

### 1. Define the DTO

Create request/response types in `internal/dto/`:

```go
// internal/dto/example.go
package dto

type CreateExampleInput struct {
    Body struct {
        Name string `json:"name" doc:"Example name" minLength:"1" maxLength:"255"`
    }
}

type ExampleOutput struct {
    Body ExampleResponse
}

type ExampleResponse struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}
```

### 2. Add the Service Method

```go
// internal/service/example.go
package service

type ExampleService interface {
    Create(ctx context.Context, name string) (*dto.ExampleResponse, error)
}
```

### 3. Register the Handler

```go
// internal/handler/example.go
package handler

func registerExampleRoutes(api huma.API, svc service.ExampleService) {
    huma.Register(api, huma.Operation{
        OperationID: "create-example",
        Method:      http.MethodPost,
        Path:        "/examples",
        Summary:     "Create an example",
        Tags:        []string{"examples"},
    }, func(ctx context.Context, input *dto.CreateExampleInput) (*dto.ExampleOutput, error) {
        result, err := svc.Create(ctx, input.Body.Name)
        if err != nil {
            return nil, toHumaError(err)
        }
        return &dto.ExampleOutput{Body: *result}, nil
    })
}
```

### 4. Wire it up in the Router

Add to `internal/handler/router.go`:

```go
registerExampleRoutes(api, deps.ExampleService)
```

### 5. Add the Service to Dependencies

Add the service field to the `Dependencies` struct in `router.go` and wire it
in `cmd/server/main.go`.

## Project Structure

```
Mission-Control/
  apps/
    api/                    -- Go API server
      cmd/server/main.go   -- Entrypoint
      internal/
        config/             -- Env var loading
        handler/            -- HTTP handlers + router
        service/            -- Business logic
        dto/                -- Request/response types
        ent/                -- ORM (schema + generated)
        events/             -- NATS event bus
        gateway/            -- OpenClaw WebSocket client
        ws/                 -- Browser WebSocket hub
        middleware/          -- Auth, CORS, logging, request ID
        apperror/           -- Structured errors
    web/                    -- Next.js frontend
      src/
        app/                -- Page routes
        components/         -- UI components (atoms/molecules/organisms)
        lib/                -- Utilities and hooks
        api/                -- Generated API client
  docs/                     -- Documentation (you are here)
  monitoring/               -- Grafana dashboards, Prometheus config
  packages/                 -- Shared packages (Turborepo)
  DESIGN.md                 -- Design system spec
  CONTRIBUTING.md           -- Contribution guide
  CLAUDE.md                 -- AI assistant context
```
