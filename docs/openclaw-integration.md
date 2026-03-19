# OpenClaw Integration Guide

This document describes how Mission Control integrates with OpenClaw gateway instances.

## Network Topology

```
                    +-------------------+
                    |  Mission Control  |
                    |  (Unraid :8000)   |
                    +--------+----------+
                             |
                        LAN (WebSocket)
                             |
                    +--------v----------+
                    | OpenClaw Gateway  |
                    | (Mac Air :18789)  |
                    +--------+----------+
                             |
                    +--------v----------+
                    |   AI Agents       |
                    |   (sessions)      |
                    +-------------------+
```

**Known hosts:**

| Host | IP | Hostname | Role |
|---|---|---|---|
| Unraid server | 192.168.1.2 | myunraid.lan | Mission Control (backend + frontend + DB) |
| Mac Air | 192.168.1.67 | airvonopenclaw.lan | OpenClaw gateway runtime |

## OpenClaw Gateway Overview

OpenClaw is an AI agent runtime that exposes a **WebSocket-based JSON-RPC gateway** on a configurable port (default: **18789**). Mission Control connects to this gateway to manage agents, sessions, and communication.

### Gateway Configuration (on the Mac Air)

The OpenClaw config lives at `~/.openclaw/openclaw.json`. Key gateway settings:

```json
{
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "lan",
    "controlUi": {
      "allowInsecureAuth": true
    },
    "auth": {
      "mode": "token",
      "token": "<your-token-here>"
    }
  }
}
```

| Setting | Value | Notes |
|---|---|---|
| `gateway.port` | `18789` | WebSocket listener port |
| `gateway.mode` | `local` | Single-node local mode |
| `gateway.bind` | `lan` | Binds to LAN interfaces (required for remote access) |
| `gateway.auth.mode` | `token` | Authentication method (`token` or `password`) |
| `gateway.controlUi.allowInsecureAuth` | `true` | Allows non-TLS auth (dev only) |

### Starting the Gateway

```bash
# On the Mac Air (openclaw@192.168.1.67)
openclaw gateway        # Start the gateway
openclaw health         # Verify health
openclaw dashboard      # Open local control UI
```

## Connection Protocol

Mission Control connects to OpenClaw via **WebSocket JSON-RPC** (protocol version 3).

### Connection URL

```
ws://192.168.1.67:18789
```

For TLS-enabled gateways: `wss://192.168.1.67:18789`

### Authentication Handshake

1. Mission Control opens a WebSocket connection to the gateway URL
2. The gateway sends a `connect.challenge` event (may include a nonce)
3. Mission Control responds with a connect payload:

```json
{
  "minProtocol": 3,
  "maxProtocol": 3,
  "role": "operator",
  "scopes": [
    "operator.read",
    "operator.admin",
    "operator.approvals",
    "operator.pairing"
  ],
  "client": {
    "id": "openclaw-control-ui",
    "version": "1.0.0",
    "platform": "go",
    "mode": "ui"
  },
  "auth": {
    "token": "<gateway-auth-token>"
  }
}
```

**Connect modes:**

| Mode | When | Client ID |
|---|---|---|
| `control_ui` | `disable_device_pairing` is true on the gateway config in MC | `openclaw-control-ui` |
| `device` | Default; uses cryptographic device identity | `gateway-client` |

In `device` mode, the connect payload also includes a signed `device` object with the device's public key and signature for mutual authentication.

### RPC Call Format

Once connected, all communication uses JSON-RPC style messages:

**Request:**
```json
{
  "id": "<uuid>",
  "method": "<method-name>",
  "params": { ... }
}
```

**Response:**
```json
{
  "id": "<uuid>",
  "result": { ... }
}
```

**Error:**
```json
{
  "id": "<uuid>",
  "error": { "message": "...", "code": ... }
}
```

## Available Gateway Methods

### Session Management

| Method | Description | Key Params |
|---|---|---|
| `sessions.list` | List all agent sessions | - |
| `sessions.preview` | Preview a session | `{ "key": "<session-key>" }` |
| `sessions.patch` | Update session metadata | `{ "key": "...", ... }` |
| `sessions.reset` | Reset a session | `{ "key": "..." }` |
| `sessions.delete` | Delete a session | `{ "key": "..." }` |
| `sessions.compact` | Compact session memory | `{ "key": "..." }` |

### Chat / Messaging

| Method | Description | Key Params |
|---|---|---|
| `chat.send` | Send message to agent session | `{ "sessionKey": "...", "message": "...", "deliver": true, "idempotencyKey": "<uuid>" }` |
| `chat.history` | Get chat history | `{ "sessionKey": "...", "limit": 50 }` |
| `chat.abort` | Abort current generation | `{ "sessionKey": "..." }` |
| `send` | Low-level send | varies |

### Agent Management

| Method | Description | Key Params |
|---|---|---|
| `agents.list` | List registered agents | - |
| `agents.create` | Create a new agent | agent config object |
| `agents.update` | Update agent config | agent config object |
| `agents.delete` | Delete an agent | `{ "id": "..." }` |
| `agents.files.list` | List agent workspace files | `{ "agentId": "..." }` |
| `agents.files.get` | Read an agent file | `{ "agentId": "...", "path": "..." }` |
| `agents.files.set` | Write an agent file | `{ "agentId": "...", "path": "...", "content": "..." }` |
| `agent` | Get current agent info | - |
| `agent.identity.get` | Get agent identity profile | - |
| `agent.wait` | Wait for agent to be ready | - |

### Health and Status

| Method | Description |
|---|---|
| `health` | Gateway health check |
| `status` | Gateway status overview |
| `channels.status` | Channel connection status |
| `last-heartbeat` | Last agent heartbeat timestamp |
| `set-heartbeats` | Configure heartbeat settings |
| `system-presence` | System presence info |

### Configuration

| Method | Description |
|---|---|
| `config.get` | Read gateway config |
| `config.set` | Update gateway config |
| `config.schema` | Get config JSON schema |
| `models.list` | List available LLM models |

### Execution Approvals

| Method | Description |
|---|---|
| `exec.approvals.get` | Get approval settings |
| `exec.approvals.set` | Update approval settings |
| `exec.approvals.node.get` | Get node-level approval settings |
| `exec.approvals.node.set` | Update node-level approval settings |
| `exec.approval.request` | Request execution approval |
| `exec.approval.resolve` | Resolve (approve/reject) an execution |

### Skills Management

| Method | Description |
|---|---|
| `skills.status` | List installed skills and status |
| `skills.bins` | List skill binary paths |
| `skills.install` | Install a skill |
| `skills.update` | Update a skill |

### Device/Node Pairing

| Method | Description |
|---|---|
| `node.pair.request` | Request to pair with a node |
| `node.pair.list` | List pairing requests |
| `node.pair.approve` | Approve a pairing request |
| `node.pair.reject` | Reject a pairing request |
| `device.pair.list` | List device pairings |
| `device.pair.approve` | Approve device pairing |
| `device.pair.reject` | Reject device pairing |
| `device.token.rotate` | Rotate device auth token |
| `device.token.revoke` | Revoke device auth token |

### Cron / Scheduled Tasks

| Method | Description |
|---|---|
| `cron.list` | List scheduled jobs |
| `cron.status` | Get cron system status |
| `cron.add` | Add a scheduled job |
| `cron.update` | Update a scheduled job |
| `cron.remove` | Remove a scheduled job |
| `cron.run` | Manually trigger a job |
| `cron.runs` | List recent job runs |

### Miscellaneous

| Method | Description |
|---|---|
| `wake` | Wake an idle agent |
| `logs.tail` | Tail gateway logs |
| `update.run` | Run gateway self-update |
| `wizard.start/next/cancel/status` | Interactive setup wizard |
| `tts.status/providers/enable/disable/convert/setProvider` | Text-to-speech |
| `voicewake.get/set` | Voice wake word config |
| `talk.mode` | Toggle talk mode |

## Gateway Events (Server -> Client)

The gateway pushes real-time events to connected clients:

| Event | Description |
|---|---|
| `connect.challenge` | Authentication challenge on connect |
| `agent` | Agent state change |
| `chat` | New chat message or generation update |
| `presence` | Agent presence/online status change |
| `tick` | Periodic tick (heartbeat) |
| `health` | Health status change |
| `heartbeat` | Agent heartbeat received |
| `shutdown` | Gateway shutting down |
| `cron` | Cron job event |
| `node.pair.requested` | Incoming pairing request |
| `node.pair.resolved` | Pairing request resolved |
| `node.invoke.request` | Incoming node invocation |
| `device.pair.requested` | Device pairing request |
| `device.pair.resolved` | Device pairing resolved |
| `voicewake.changed` | Voice wake word changed |
| `exec.approval.requested` | Execution approval needed |
| `exec.approval.resolved` | Execution approval resolved |
| `talk.mode` | Talk mode toggled |

## Mission Control Configuration

### Registering a Gateway in Mission Control

In Mission Control, a gateway is registered with the following fields (from the Ent schema):

| Field | Type | Description |
|---|---|---|
| `name` | string | Display name (e.g., "Mac Air Gateway") |
| `url` | string | WebSocket URL (e.g., `ws://192.168.1.67:18789`) |
| `status` | enum | `connected` or `disconnected` (managed by MC) |
| `allow_insecure_tls` | bool | Skip TLS cert verification for `wss://` connections |
| `organization_id` | UUID | The owning organization |

Agents are then linked to a gateway via the `gateway_id` foreign key on the Agent entity.

### Environment Variables

No special gateway env vars are needed in Mission Control's `.env`. Gateway URLs and tokens are stored per-gateway in the database.

### CORS / Allowed Origins

If the OpenClaw gateway has CORS restrictions, ensure Mission Control's backend URL is allowed. By default, OpenClaw in local/LAN mode does not enforce CORS on WebSocket connections.

## Integration Data Flow

### What Mission Control reads from OpenClaw:

- **Sessions**: List active agent sessions, get session details and history
- **Agent status**: Online/offline/degraded via heartbeats and presence events
- **Chat history**: Full conversation logs per session
- **Health**: Gateway and agent health status
- **Config**: Gateway configuration and available models
- **Approvals**: Pending execution approval requests
- **Skills**: Installed skills and their status
- **Metrics**: Usage and cost data

### What Mission Control writes to OpenClaw:

- **Chat messages**: Send messages to agent sessions (task assignments, instructions)
- **Agent lifecycle**: Create, update, delete agents; manage agent files
- **Session management**: Create/reset/compact/delete sessions
- **Approvals**: Resolve (approve/reject) execution approval requests
- **Configuration**: Update gateway and agent config
- **Skills**: Install/update skills on the gateway
- **Heartbeats**: Configure heartbeat intervals
- **Cron jobs**: Schedule, update, and trigger recurring tasks

## Version Compatibility

Mission Control checks gateway version compatibility using CalVer format (e.g., `2026.1.30`). The minimum supported version is configurable (default: `2026.1.30`). Version is retrieved via the `openclaw_connect_metadata` call during the WebSocket handshake.

## Security Considerations

1. **Token auth**: Always set a strong token in `gateway.auth.token` for non-local access
2. **TLS**: Use `wss://` with valid certificates in production; `allow_insecure_tls` should only be used for development
3. **LAN binding**: `gateway.bind: "lan"` exposes the gateway on all LAN interfaces; use firewall rules to restrict access if needed
4. **Device pairing**: For higher security, use device-based authentication with cryptographic identity (Ed25519 keys) instead of `control_ui` mode

## Quick Start: Connecting Mission Control to the Mac Air

1. **Ensure the Mac Air is online** (currently at `192.168.1.67`, hostname `airvonopenclaw.lan`)

2. **SSH in and verify OpenClaw is running:**
   ```bash
   ssh openclaw@192.168.1.67
   openclaw health
   openclaw gateway  # start if not running
   ```

3. **Note the gateway token** from `~/.openclaw/openclaw.json` -> `gateway.auth.token`

4. **In Mission Control**, create a gateway:
   - Name: `Mac Air Gateway`
   - URL: `ws://192.168.1.67:18789`
   - Token: (from step 3)
   - Allow insecure TLS: `false` (not needed for `ws://`)

5. **Create agents** in Mission Control and link them to the gateway

6. **Verify connectivity** by checking the gateway status in Mission Control's Gateways page

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Gateway shows "disconnected" | Mac Air is asleep/offline | Wake the Mac Air; check `ping 192.168.1.67` |
| Connection refused on :18789 | OpenClaw gateway not started | SSH in and run `openclaw gateway` |
| Auth failure | Token mismatch | Verify token in MC matches `~/.openclaw/openclaw.json` |
| Version incompatible | Old OpenClaw version | Run `openclaw update` on the Mac Air |
| TLS errors with wss:// | Self-signed certificate | Enable `allow_insecure_tls` on the gateway in MC, or install a valid cert |
