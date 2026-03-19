# Grafana Dashboards for Mission Control

Pre-built Grafana dashboard templates for monitoring Mission Control.

## Prerequisites

- Grafana 10+ (included in `docker-compose.monitoring.yml`)
- A Prometheus datasource scraping the Mission Control API at `/metrics`

## Importing Dashboards

### Option 1: Grafana UI

1. Open Grafana at [http://localhost:3001](http://localhost:3001)
2. Navigate to **Dashboards > Import**
3. Click **Upload dashboard JSON file**
4. Select a `.json` file from this directory
5. Choose your Prometheus datasource from the dropdown
6. Click **Import**

### Option 2: Grafana Provisioning

Mount this directory as a provisioned dashboards folder. Add to your Grafana
config or `docker-compose.monitoring.yml`:

```yaml
grafana:
  volumes:
    - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
    - ./monitoring/grafana:/var/lib/grafana/dashboards
```

Create a provisioning config at `monitoring/grafana/provisioning/dashboards/dashboards.yml`:

```yaml
apiVersion: 1
providers:
  - name: Mission Control
    folder: Mission Control
    type: file
    options:
      path: /var/lib/grafana/dashboards
```

## Available Dashboards

| File | Description |
|---|---|
| `mission-control-overview.json` | Main operational dashboard with HTTP metrics, agent status, event bus, and infrastructure gauges |

## Prometheus Metrics

These dashboards expect the following Prometheus metrics from the Mission Control
API:

| Metric | Type | Labels | Description |
|---|---|---|---|
| `http_requests_total` | counter | `method`, `path`, `status` | Total HTTP requests |
| `http_request_duration_seconds` | histogram | `method`, `path` | Request latency |
| `ws_connections_active` | gauge | -- | Active WebSocket connections |
| `agents_total` | gauge | `status` | Agent count by status |
| `agent_last_heartbeat_seconds` | gauge | `agent_id`, `agent_name` | Time since last heartbeat |
| `tasks_total` | gauge | `status`, `board_id` | Task count by status |
| `nats_messages_published_total` | counter | `subject` | NATS messages published |
| `nats_consumer_lag` | gauge | `consumer` | NATS consumer message lag |
| `activity_events_total` | counter | -- | Activity events recorded |
| `go_goroutines` | gauge | -- | Current number of goroutines |
| `go_memstats_heap_alloc_bytes` | gauge | -- | Heap memory in use |
| `db_connections_active` | gauge | -- | Active database connections |
| `db_connections_idle` | gauge | -- | Idle database connections |
| `redis_operations_total` | counter | `command` | Redis operations |

## Datasource Variable

All dashboards use `${DS_PROMETHEUS}` as the datasource variable. This is
automatically populated when you select a Prometheus datasource during import.
If you have multiple Prometheus instances, use the datasource dropdown at the
top of the dashboard to switch between them.
