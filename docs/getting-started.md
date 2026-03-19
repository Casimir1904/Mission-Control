# Getting Started

Get Mission Control running locally in under 10 minutes.

## Prerequisites

| Requirement | Minimum Version |
|---|---|
| [Docker](https://docs.docker.com/get-docker/) | 24.0+ |
| [Docker Compose](https://docs.docker.com/compose/install/) | 2.20+ |
| Git | 2.30+ |

Verify your setup:

```bash
docker --version    # Docker version 24.0+
docker compose version  # Docker Compose version v2.20+
```

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/Casimir1904/Mission-Control.git
cd Mission-Control
```

### 2. Create your environment file

```bash
cp .env.example .env
```

Open `.env` and set a secure database password:

```bash
# .env
POSTGRES_PASSWORD=change-me-to-something-secure
```

For local development, the defaults for everything else are fine. See
[Configuration](configuration.md) for all available options.

### 3. Start all services

```bash
docker compose up -d
```

This starts five containers:

| Container | Port | Description |
|---|---|---|
| `postgres` | 5432 | PostgreSQL 16 database |
| `redis` | 6379 | Redis 7 cache |
| `nats` | 4222 | NATS JetStream event bus |
| `api` | 8000 | Go API server |
| `web` | 3000 | Next.js frontend |

Wait for all services to report healthy:

```bash
docker compose ps
```

You should see all services in the `running` state with `(healthy)` where applicable.

### 4. Verify the API is running

```bash
curl http://localhost:8000/api/v1/healthz
```

Expected response:

```json
{"status":"ok"}
```

### 5. Open the dashboard

Visit [http://localhost:3000](http://localhost:3000) in your browser.

## First Steps After Installation

### Create an Organization

Mission Control is multi-tenant. Your first step is to create an organization:

```bash
curl -X POST http://localhost:8000/api/v1/organizations \
  -H "Content-Type: application/json" \
  -d '{"name": "My Team", "slug": "my-team"}'
```

### Create a Board

Boards are where you organize agents and tasks:

```bash
curl -X POST http://localhost:8000/api/v1/boards \
  -H "Content-Type: application/json" \
  -d '{"name": "Production Agents", "organization_id": "<org-id-from-above>"}'
```

### Connect Your First Gateway

Gateways connect Mission Control to OpenClaw instances that run your AI agents.
See the [Gateways guide](gateways.md) for detailed setup instructions.

1. Navigate to **Gateways** in the sidebar
2. Click **Add Gateway**
3. Enter your OpenClaw instance URL (e.g., `ws://192.168.1.10:18789`)
4. Provide the gateway auth token
5. Click **Test Connection** to verify
6. Save and click **Sync** to import agents

## Stopping and Restarting

```bash
# Stop all services (data is preserved in Docker volumes)
docker compose down

# Start again
docker compose up -d

# View logs
docker compose logs -f api
docker compose logs -f web
```

## Resetting Everything

To remove all data and start fresh:

```bash
docker compose down -v
```

> **Warning**: The `-v` flag deletes all Docker volumes, including your database.
> This is irreversible.

## Next Steps

- [Architecture](architecture.md) -- Understand how the pieces fit together.
- [Configuration](configuration.md) -- Customize ports, authentication, and more.
- [Gateways](gateways.md) -- Connect to OpenClaw and manage agents.
- [Development](development.md) -- Run the API and frontend without Docker for local dev.
