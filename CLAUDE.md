# Mission Control

## Project Overview
Open-source operations center for AI agents. Self-hosted via Docker Compose.

## Tech Stack
- Backend: Go (chi + Huma + Ent ORM) at apps/api/
- Frontend: Next.js + React + TanStack Query + Jotai + shadcn/ui at apps/web/
- Infrastructure: PostgreSQL, Redis, NATS (JetStream)
- Monorepo: Turborepo

## Key Patterns
- Multi-tenancy enforced via Ent privacy policies (fail-safe)
- Events via NATS JetStream (guaranteed delivery for audit, fire-and-forget for UI)
- WebSocket: single hub with topic-based routing at /ws
- Auth: OIDC standard (any provider)
- API: Huma generates OpenAPI from Go types, orval generates TS client
- Logging: slog structured JSON with request_id, org_id, user_id
- Error handling: AppError types with fmt.Errorf wrapping

## Development
- Start infra: docker compose up postgres redis nats -d
- Start API: cd apps/api && go run ./cmd/server
- Start web: cd apps/web && npm run dev
- Run Go tests: cd apps/api && go test ./...
- Run frontend tests: cd apps/web && npm run test
- Lint Go: cd apps/api && golangci-lint run
- Lint frontend: cd apps/web && npm run lint

## Design System
See DESIGN.md for the complete "Flight Console" design system.
Dark-mode first. Dense information design. Green/amber/red status palette.

## Database
- Ent ORM with code generation
- Generate Ent code: cd apps/api && go generate ./internal/ent
- Migrations: Ent auto-migration in dev, versioned in production
- Multi-tenancy: Ent privacy policies on every schema (query without org context returns empty, not everything)

## Testing
- Go: testcontainers-go with real PostgreSQL (no SQLite)
- Frontend: Vitest + React Testing Library
- E2E: Playwright (Phase 2+)
