# Configuration

Mission Control is configured through environment variables. Copy `.env.example`
to `.env` and adjust values as needed.

```bash
cp .env.example .env
```

## Environment Variables

### Database (PostgreSQL)

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | `mc_dev_password` | PostgreSQL password for the `mc` user. **Change this in production.** |
| `POSTGRES_PORT` | `5432` | Host port mapped to the PostgreSQL container. |

The full database URL is constructed automatically in Docker Compose:

```
postgres://mc:${POSTGRES_PASSWORD}@postgres:5432/mission_control?sslmode=disable
```

If you run the API outside Docker, set `DATABASE_URL` directly:

```bash
export DATABASE_URL="postgres://mc:your-password@localhost:5432/mission_control?sslmode=disable"
```

### Cache (Redis)

| Variable | Default | Description |
|---|---|---|
| `REDIS_PORT` | `6379` | Host port mapped to the Redis container. |

Inside Docker Compose, the API connects via `redis://redis:6379`. For local
development, set `REDIS_URL`:

```bash
export REDIS_URL="redis://localhost:6379"
```

### Event Bus (NATS)

| Variable | Default | Description |
|---|---|---|
| `NATS_PORT` | `4222` | Host port for the NATS client protocol. |
| `NATS_MONITOR_PORT` | `8222` | Host port for the NATS HTTP monitoring endpoint. |

Inside Docker Compose, the API connects via `nats://nats:4222`. For local
development:

```bash
export NATS_URL="nats://localhost:4222"
```

NATS monitoring dashboard: [http://localhost:8222](http://localhost:8222)

### API Server

| Variable | Default | Description |
|---|---|---|
| `API_PORT` | `8000` | Host port mapped to the API container. |
| `LOG_LEVEL` | `info` | Log verbosity: `debug`, `info`, `warn`, `error`. |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated list of allowed CORS origins. |

Example with multiple CORS origins:

```bash
ALLOWED_ORIGINS=http://localhost:3000,https://mc.example.com
```

### Authentication (OIDC)

| Variable | Default | Description |
|---|---|---|
| `OIDC_ISSUER` | *(empty)* | OIDC issuer URL for JWT validation (e.g., `https://accounts.google.com`). Leave empty to disable OIDC. |
| `OIDC_AUDIENCE` | *(empty)* | Expected `aud` claim in JWTs. |

When both `OIDC_ISSUER` and `OIDC_AUDIENCE` are set, the API validates Bearer
tokens on every request. When empty, the API runs in open mode (suitable for
local development or trusted networks).

### Frontend

| Variable | Default | Description |
|---|---|---|
| `API_URL` | `http://localhost:8000` | API base URL that the frontend uses. Set to your API's public URL in production. |
| `WS_URL` | `ws://localhost:8000/ws` | WebSocket URL for real-time updates. |
| `WEB_PORT` | `3000` | Host port mapped to the frontend container. |

> **Note**: `API_URL` and `WS_URL` are baked into the frontend at build time via
> Next.js build args (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`). If you change
> them, you must rebuild the frontend container.

### Device Identity

| Variable | Default | Description |
|---|---|---|
| `DEVICE_IDENTITY_DIR` | `/data/device-identity` | Directory where the Ed25519 device identity keypair is stored. Must be persistent across container restarts. |

The device identity is used for authenticating with OpenClaw gateways in device
mode. A keypair is generated automatically on first startup if the directory is
empty. See [Gateways](gateways.md) for details on device pairing.

## Docker Compose Customization

### Exposing Services to the Network

By default, all ports bind to `0.0.0.0` (all interfaces). To restrict services
to localhost only:

```yaml
# docker-compose.override.yml
services:
  postgres:
    ports:
      - "127.0.0.1:${POSTGRES_PORT:-5432}:5432"
  redis:
    ports:
      - "127.0.0.1:${REDIS_PORT:-6379}:6379"
```

### Removing Port Exposure for Internal Services

In production, you may not need PostgreSQL, Redis, or NATS accessible from the
host. Remove their `ports` sections entirely -- they remain reachable by other
containers on the Docker network.

### Adding Container Names and Restart Policies

For deployment on systems like Unraid where you need predictable container names:

```yaml
# docker-compose.override.yml
services:
  postgres:
    container_name: mc-db
    restart: unless-stopped
  redis:
    container_name: mc-redis
    restart: unless-stopped
  api:
    container_name: mc-backend
    restart: unless-stopped
  web:
    container_name: mc-frontend
    restart: unless-stopped
```

## Volume Management

Mission Control uses four Docker volumes:

| Volume | Service | Contains |
|---|---|---|
| `postgres_data` | PostgreSQL | All database data |
| `redis_data` | Redis | Append-only file cache |
| `nats_data` | NATS | JetStream message storage |
| `device_identity` | API | Ed25519 keypair for gateway authentication |

### Backing Up Volumes

Database backup:

```bash
docker compose exec postgres pg_dump -U mc mission_control > backup.sql
```

Restore from backup:

```bash
docker compose exec -T postgres psql -U mc mission_control < backup.sql
```

### Inspecting Volumes

```bash
docker volume ls | grep mission-control
docker volume inspect mission-control_postgres_data
```

## Full `.env.example`

```bash
# Database
POSTGRES_PASSWORD=mc_dev_password
POSTGRES_PORT=5432

# Cache
REDIS_PORT=6379

# Event Bus
NATS_PORT=4222
NATS_MONITOR_PORT=8222

# API Server
API_PORT=8000
LOG_LEVEL=info
ALLOWED_ORIGINS=http://localhost:3000

# Authentication (leave empty for open mode)
OIDC_ISSUER=
OIDC_AUDIENCE=

# Frontend
API_URL=http://localhost:8000
WS_URL=ws://localhost:8000/ws
WEB_PORT=3000

# Device Identity (for gateway authentication)
DEVICE_IDENTITY_DIR=/data/device-identity
```
