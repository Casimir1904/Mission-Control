# Deployment

This guide covers deploying Mission Control for different environments, from
the default Docker Compose setup to production-hardened configurations.

## Docker Compose (Default)

The standard deployment uses a single `docker-compose.yml` with five services.

```bash
git clone https://github.com/Casimir1904/Mission-Control.git
cd Mission-Control
cp .env.example .env
# Edit .env with your settings
docker compose up -d
```

See [Getting Started](../getting-started.md) for the full walkthrough.

## Production Hardening

### 1. Set Strong Passwords

```bash
# .env
POSTGRES_PASSWORD=$(openssl rand -hex 32)
```

Never use the default `mc_dev_password` in production.

### 2. Enable OIDC Authentication

```bash
# .env
OIDC_ISSUER=https://accounts.google.com
OIDC_AUDIENCE=your-client-id.apps.googleusercontent.com
```

Any OIDC-compliant provider works (Auth0, Keycloak, Google, Okta, etc.).

### 3. Add TLS Termination

Place a reverse proxy in front of Mission Control for HTTPS. Example with Caddy:

```Caddyfile
mc.example.com {
    handle /api/* {
        reverse_proxy api:8000
    }
    handle /ws {
        reverse_proxy api:8000
    }
    handle {
        reverse_proxy web:3000
    }
}
```

Update your `.env` to use HTTPS URLs:

```bash
API_URL=https://mc.example.com
WS_URL=wss://mc.example.com/ws
ALLOWED_ORIGINS=https://mc.example.com
```

### 4. Restrict Network Exposure

Remove port mappings for internal services. Edit `docker-compose.override.yml`:

```yaml
services:
  postgres:
    ports: []
  redis:
    ports: []
  nats:
    ports: []
```

Or remove the `ports` section entirely -- containers can still communicate over
the Docker network.

### 5. Add Restart Policies

```yaml
# docker-compose.override.yml
services:
  postgres:
    restart: unless-stopped
  redis:
    restart: unless-stopped
  nats:
    restart: unless-stopped
  api:
    restart: unless-stopped
  web:
    restart: unless-stopped
```

## Unraid Deployment

This section covers deploying on Unraid using the Compose Manager plugin.

### Directory Structure

```
/mnt/user/appdata/mission-control/    <-- Git repo
  .env                                <-- Config (not in git)
  docker-compose.yml
  apps/api/
  apps/web/

/boot/config/plugins/compose.manager/projects/MissionControl/
  docker-compose.yml                  <-- Uses absolute build paths
  .env                                <-- Copy of repo .env
  autostart                           <-- Contains "true"
  name                                <-- Contains "MissionControl"
```

### Setup Steps

1. Clone the repo to appdata:

   ```bash
   cd /mnt/user/appdata
   git clone https://github.com/Casimir1904/Mission-Control.git mission-control
   cd mission-control
   cp .env.example .env
   ```

2. Edit `.env`:

   ```bash
   POSTGRES_PASSWORD=your-secure-password
   API_PORT=8000
   WEB_PORT=3100
   API_URL=http://192.168.1.2:8000
   WS_URL=ws://192.168.1.2:8000/ws
   ALLOWED_ORIGINS=http://192.168.1.2:3100
   ```

3. Create the Compose Manager project directory:

   ```bash
   mkdir -p /boot/config/plugins/compose.manager/projects/MissionControl
   ```

4. Create the Compose Manager `docker-compose.yml` with absolute paths for
   build contexts:

   ```yaml
   services:
     postgres:
       # ... same as upstream, add:
       container_name: mc-db
       restart: unless-stopped
     redis:
       # ... same as upstream, add:
       container_name: mc-redis
       restart: unless-stopped
     api:
       build:
         context: /mnt/user/appdata/mission-control/apps/api
         dockerfile: Dockerfile
       container_name: mc-backend
       restart: unless-stopped
       # ... rest same as upstream
     web:
       build:
         context: /mnt/user/appdata/mission-control/apps/web
         dockerfile: Dockerfile
       container_name: mc-frontend
       # ... rest same as upstream
   ```

5. Copy the `.env` to the Compose Manager project:

   ```bash
   cp /mnt/user/appdata/mission-control/.env \
      /boot/config/plugins/compose.manager/projects/MissionControl/.env
   ```

6. Set autostart:

   ```bash
   echo "true" > /boot/config/plugins/compose.manager/projects/MissionControl/autostart
   echo "MissionControl" > /boot/config/plugins/compose.manager/projects/MissionControl/name
   ```

### Important: Dual `.env` Sync

The `.env` file exists in two places and they **must stay in sync**:

1. `/mnt/user/appdata/mission-control/.env` -- used by the repo
2. `/boot/config/plugins/compose.manager/projects/MissionControl/.env` -- used by Compose Manager

When you change environment variables, update **both** files.

### Named Volumes

Create these as external volumes before first startup:

- `openclaw-mission-control_postgres_data`
- `openclaw-mission-control_device_identity`

These persist across container rebuilds and Compose Manager restarts.

### Container Names

| Container | Service |
|---|---|
| `mc-db` | PostgreSQL |
| `mc-redis` | Redis |
| `mc-backend` | API Server |
| `mc-frontend` | Frontend |

### Ports

| Service | Port |
|---|---|
| Frontend | 3100 (customized from default 3000) |
| API | 8000 |

## Backup

### PostgreSQL Backup

```bash
# Dump the database
docker compose exec postgres pg_dump -U mc mission_control > backup-$(date +%Y%m%d).sql

# Restore
docker compose exec -T postgres psql -U mc mission_control < backup-20240101.sql
```

### Full Volume Backup

```bash
# Stop services first for consistency
docker compose down

# Backup all volumes
docker run --rm \
  -v mission-control_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres-$(date +%Y%m%d).tar.gz -C /data .

# Restart
docker compose up -d
```

### Automated Backups

Add a cron job for daily backups:

```bash
# crontab -e
0 2 * * * cd /path/to/Mission-Control && docker compose exec -T postgres pg_dump -U mc mission_control | gzip > /backups/mc-$(date +\%Y\%m\%d).sql.gz
```

## Monitoring

Mission Control exposes Prometheus metrics at the API server's `/metrics` endpoint
(when instrumented). See the [monitoring/](../../monitoring/) directory for:

- Pre-built Grafana dashboards
- Prometheus scrape configuration
- Optional `docker-compose.monitoring.yml` to add Prometheus + Grafana

### Quick Start (Monitoring Stack)

```bash
docker compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml up -d
```

This adds Prometheus (port 9090) and Grafana (port 3001) alongside Mission Control.

Grafana default credentials: `admin` / `admin`

Import the dashboards from `monitoring/grafana/` via **Dashboards > Import > Upload JSON file**.
