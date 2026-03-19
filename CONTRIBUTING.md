# Contributing to Mission Control

Thank you for your interest in contributing to Mission Control! This guide will help you get started.

## Prerequisites

- **Go** 1.23+
- **Node.js** 20+
- **Docker** and **Docker Compose**
- **golangci-lint** (for Go linting)

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/mission-control/mission-control.git
   cd mission-control
   ```

2. **Copy the environment file**

   ```bash
   cp .env.example .env
   ```

3. **Start infrastructure services**

   ```bash
   docker compose up postgres redis nats -d
   ```

4. **Start the API server**

   ```bash
   cd apps/api
   go run ./cmd/server
   ```

5. **Start the frontend**

   ```bash
   cd apps/web
   npm install
   npm run dev
   ```

   The frontend will be available at [http://localhost:3000](http://localhost:3000).

## Code Style

### Go

- We use **golangci-lint** with a strict configuration. Run it before committing:

  ```bash
  cd apps/api
  golangci-lint run
  ```

- Use `slog` for all logging (never `fmt.Print` or `log.Print`).
- Wrap errors with `fmt.Errorf("context: %w", err)`.
- Follow standard Go project layout conventions.

### TypeScript / Frontend

- **ESLint** and **Prettier** enforce consistent style:

  ```bash
  cd apps/web
  npm run lint
  ```

- Use `type` imports where possible (`import type { Foo } from ...`).
- Prefer named exports over default exports.

## Testing

### Go Tests

```bash
cd apps/api
go test -race ./...
```

Tests use **testcontainers-go** to spin up real PostgreSQL instances. No mocks or SQLite substitutes.

### Frontend Tests

```bash
cd apps/web
npm run test
```

We use **Vitest** with **React Testing Library**.

### Running All Tests via Turborepo

```bash
# From the repository root
npm run test
```

## Pull Request Process

1. **Branch off `main`** -- create a descriptive branch name (e.g., `feat/agent-dashboard`, `fix/websocket-reconnect`).

2. **Conventional commits preferred** -- use prefixes like `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.

3. **Keep PRs focused** -- one feature or fix per pull request. Split large changes into stacked PRs if needed.

4. **Ensure CI passes** -- all lint, test, and build checks must pass before merge.

5. **Fill out the PR template** -- describe the change, link to relevant issues, and include screenshots for UI changes.

## Architecture Overview

For a detailed overview of the system architecture, see:

- [`docs/`](./docs/) -- technical documentation
- [`CLAUDE.md`](./CLAUDE.md) -- project context for AI assistants
- [`DESIGN.md`](./DESIGN.md) -- "Flight Console" design system

## Questions?

Open a [GitHub Discussion](https://github.com/mission-control/mission-control/discussions) or file an issue. We are happy to help!
