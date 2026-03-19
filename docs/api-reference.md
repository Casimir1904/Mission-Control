# API Reference

Mission Control exposes a REST API at `/api/v1/`. The API uses
[Huma](https://huma.rocks/) for automatic OpenAPI spec generation, request
validation, and documentation.

## Interactive Docs

When the API is running, auto-generated OpenAPI documentation is available at:

```
http://localhost:8000/docs
```

This provides a browsable, interactive reference for every endpoint with schemas
and example payloads.

## Base URL

```
http://localhost:8000/api/v1
```

In production, replace `localhost:8000` with your API's public hostname.

## Authentication

When `OIDC_ISSUER` and `OIDC_AUDIENCE` are configured, all API requests require a
Bearer token:

```bash
curl -H "Authorization: Bearer <your-jwt>" http://localhost:8000/api/v1/boards
```

When OIDC is not configured (default for local development), the API runs in open
mode and no authentication is required.

## Common Patterns

### Pagination

List endpoints support `limit` and `offset` query parameters:

```bash
curl "http://localhost:8000/api/v1/boards?limit=10&offset=0"
```

Response includes pagination metadata:

```json
{
  "items": [...],
  "total": 42,
  "limit": 10,
  "offset": 0
}
```

### Error Responses

Errors follow the [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) problem
details format:

```json
{
  "type": "https://httpproblems.com/http-status/404",
  "title": "Not Found",
  "status": 404,
  "detail": "Board with ID abc123 not found"
}
```

### Content Type

All requests and responses use `application/json`.

## Endpoints by Resource

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/healthz` | Liveness probe. Returns `{"status":"ok"}`. |
| `GET` | `/readyz` | Readiness probe. Checks database and NATS connectivity. |

> **Note**: Health endpoints are at the root level, not under `/api/v1/`.

```bash
curl http://localhost:8000/api/v1/healthz
# {"status":"ok"}
```

### Organizations

| Method | Path | Description |
|---|---|---|
| `GET` | `/organizations` | List organizations |
| `POST` | `/organizations` | Create an organization |
| `GET` | `/organizations/{id}` | Get organization by ID |
| `PATCH` | `/organizations/{id}` | Update an organization |
| `DELETE` | `/organizations/{id}` | Delete an organization |

```bash
# Create an organization
curl -X POST http://localhost:8000/api/v1/organizations \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp", "slug": "acme"}'
```

### Boards

| Method | Path | Description |
|---|---|---|
| `GET` | `/boards` | List boards |
| `POST` | `/boards` | Create a board |
| `GET` | `/boards/{id}` | Get board by ID |
| `PATCH` | `/boards/{id}` | Update a board |
| `DELETE` | `/boards/{id}` | Delete a board |

```bash
# Create a board
curl -X POST http://localhost:8000/api/v1/boards \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Agents",
    "organization_id": "org-uuid-here"
  }'
```

### Agents

| Method | Path | Description |
|---|---|---|
| `GET` | `/agents` | List agents |
| `POST` | `/agents` | Create an agent |
| `GET` | `/agents/{id}` | Get agent by ID |
| `PATCH` | `/agents/{id}` | Update an agent |
| `DELETE` | `/agents/{id}` | Delete an agent |

```bash
# List all agents
curl http://localhost:8000/api/v1/agents?limit=20
```

### Tasks

| Method | Path | Description |
|---|---|---|
| `GET` | `/boards/{boardId}/tasks` | List tasks for a board |
| `POST` | `/boards/{boardId}/tasks` | Create a task |
| `GET` | `/boards/{boardId}/tasks/{id}` | Get task by ID |
| `PATCH` | `/boards/{boardId}/tasks/{id}` | Update a task |
| `DELETE` | `/boards/{boardId}/tasks/{id}` | Delete a task |

```bash
# Create a task
curl -X POST http://localhost:8000/api/v1/boards/<board-id>/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Review pull request #42",
    "status": "todo",
    "agent_id": "agent-uuid-here"
  }'

# Update task status
curl -X PATCH http://localhost:8000/api/v1/boards/<board-id>/tasks/<task-id> \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

### Tags

| Method | Path | Description |
|---|---|---|
| `GET` | `/tags` | List tags |
| `POST` | `/tags` | Create a tag |
| `GET` | `/tags/{id}` | Get tag by ID |
| `PATCH` | `/tags/{id}` | Update a tag |
| `DELETE` | `/tags/{id}` | Delete a tag |

### Approvals

| Method | Path | Description |
|---|---|---|
| `GET` | `/boards/{boardId}/approvals` | List approvals for a board |
| `POST` | `/boards/{boardId}/approvals` | Create an approval |
| `PATCH` | `/boards/{boardId}/approvals/{id}` | Update approval status |

```bash
# Approve an agent action
curl -X PATCH http://localhost:8000/api/v1/boards/<board-id>/approvals/<id> \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'
```

### Activity

| Method | Path | Description |
|---|---|---|
| `GET` | `/activity` | List activity events (audit log) |

```bash
# Get recent activity
curl "http://localhost:8000/api/v1/activity?limit=50"
```

### Dashboard

| Method | Path | Description |
|---|---|---|
| `GET` | `/dashboard` | Dashboard metrics (task counts, agent status, KPIs) |

### Heartbeats

| Method | Path | Description |
|---|---|---|
| `POST` | `/heartbeats` | Record an agent heartbeat |

### Memory

| Method | Path | Description |
|---|---|---|
| `GET` | `/boards/{boardId}/memory` | List board memory entries |
| `POST` | `/boards/{boardId}/memory` | Create a memory entry |
| `DELETE` | `/boards/{boardId}/memory/{id}` | Delete a memory entry |

### Notifications

| Method | Path | Description |
|---|---|---|
| `GET` | `/notifications` | List notifications |
| `PATCH` | `/notifications/{id}` | Mark notification as read |

### Costs

| Method | Path | Description |
|---|---|---|
| `GET` | `/costs` | List cost records (LLM usage tracking) |

### Traces

| Method | Path | Description |
|---|---|---|
| `GET` | `/traces` | List execution traces |
| `GET` | `/traces/{id}` | Get trace with spans |

### Gateways

| Method | Path | Description |
|---|---|---|
| `GET` | `/gateways` | List gateways |
| `POST` | `/gateways` | Register a gateway |
| `GET` | `/gateways/{id}` | Get gateway by ID |
| `PATCH` | `/gateways/{id}` | Update a gateway |
| `DELETE` | `/gateways/{id}` | Delete a gateway |
| `POST` | `/gateways/{id}/test` | Test gateway connection |
| `POST` | `/gateways/{id}/sync` | Sync agents from gateway |

```bash
# Register a new gateway
curl -X POST http://localhost:8000/api/v1/gateways \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production OpenClaw",
    "url": "ws://192.168.1.10:18789",
    "auth_token": "your-token",
    "organization_id": "org-uuid"
  }'

# Test the connection
curl -X POST http://localhost:8000/api/v1/gateways/<id>/test

# Sync agents
curl -X POST http://localhost:8000/api/v1/gateways/<id>/sync
```

## WebSocket

Real-time events are pushed over a WebSocket connection:

```
ws://localhost:8000/ws
```

The WebSocket sends JSON messages for events like task updates, agent status
changes, new approvals, and heartbeat data. The frontend uses these events to
invalidate TanStack Query caches for instant UI updates.

## Rate Limiting

Rate limiting is not currently enforced at the application level. For production,
use a reverse proxy (nginx, Caddy, Traefik) in front of the API.
