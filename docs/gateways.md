# Gateways

Gateways connect Mission Control to OpenClaw instances -- the runtimes where your
AI agents actually execute. Each gateway represents a WebSocket connection to one
OpenClaw server.

## What Is a Gateway?

OpenClaw is an AI agent runtime that exposes a **WebSocket JSON-RPC gateway** on a
configurable port (default: **18789**). Mission Control connects to these gateways
to:

- Import and monitor agents from the OpenClaw instance
- Create and manage chat sessions with agents
- Review and approve agent actions
- Track agent heartbeats and health status
- Manage device pairing for secure authentication

You can connect multiple gateways to a single Mission Control instance. Each
gateway operates independently.

## Connecting to OpenClaw

### Prerequisites

- An OpenClaw instance running with its gateway enabled
- The gateway URL (e.g., `ws://192.168.1.10:18789`)
- A gateway auth token (configured in OpenClaw)
- Network access from the Mission Control API container to the OpenClaw host

### Step 1: Register the Gateway

**Via the UI:**

1. Open Mission Control at [http://localhost:3000](http://localhost:3000)
2. Navigate to **Gateways** in the sidebar
3. Click **Add Gateway**
4. Fill in the form:
   - **Name**: A human-readable label (e.g., "Mac Air OpenClaw")
   - **URL**: The WebSocket endpoint (e.g., `ws://192.168.1.10:18789`)
   - **Auth Token**: The gateway authentication token

**Via the API:**

```bash
curl -X POST http://localhost:8000/api/v1/gateways \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mac Air OpenClaw",
    "url": "ws://192.168.1.10:18789",
    "auth_token": "your-gateway-token",
    "organization_id": "<your-org-id>"
  }'
```

### Step 2: Test the Connection

```bash
curl -X POST http://localhost:8000/api/v1/gateways/<gateway-id>/test
```

A successful response confirms that Mission Control can reach the gateway and
complete the authentication handshake.

### Step 3: Sync Agents

```bash
curl -X POST http://localhost:8000/api/v1/gateways/<gateway-id>/sync
```

This imports all agents from the OpenClaw instance into Mission Control. Agents
are created or updated based on their OpenClaw identity. You can then assign them
to boards and manage their tasks.

## Authentication

Mission Control supports two authentication modes when connecting to an OpenClaw
gateway.

### Token Authentication (Simple Mode)

Set `disable_device_pairing: true` on the gateway configuration in Mission Control.
The API connects with the auth token alone, using the `openclaw-control-ui` client
identity.

Best for: local development, trusted networks.

### Ed25519 Device Identity (Device Mode)

The default and more secure mode. Mission Control generates an Ed25519 keypair on
first startup (stored in the `device_identity` Docker volume) and uses it for
mutual authentication.

**How it works:**

1. On first connection, Mission Control presents its device public key
2. The OpenClaw instance registers the device (or requires manual pairing approval)
3. On subsequent connections, the signed device identity proves authenticity

Best for: production deployments, untrusted networks, multi-user setups.

### Device Pairing Workflow

When device mode is active and you connect a gateway for the first time:

1. Mission Control sends a connect payload with its device public key and a
   cryptographic signature
2. OpenClaw may auto-accept the device or require manual approval
3. Once paired, the device identity is trusted for all future connections
4. You can view paired devices in the OpenClaw admin interface

The device keypair is stored at the path configured by `DEVICE_IDENTITY_DIR`
(default: `/data/device-identity`). **This directory must be persistent.** If you
lose the keypair, you need to re-pair the device.

## Agent Sync

When you sync a gateway, Mission Control:

1. Calls the `agents.list` RPC method on the OpenClaw gateway
2. Compares the remote agent list with agents already in Mission Control
3. Creates new agent records or updates existing ones
4. Associates agents with the gateway for future operations

Agents synced from a gateway retain their OpenClaw identity and configuration
(model, heartbeat settings, etc.).

## Gateway Configuration on the OpenClaw Side

On your OpenClaw instance, ensure:

1. **The gateway is enabled** in the OpenClaw config
2. **The gateway port is accessible** from the Mission Control API container
   (default: 18789)
3. **An auth token is set** for the gateway
4. **CORS / allowed origins** permit the Mission Control API (if applicable)

Example OpenClaw gateway config:

```yaml
gateway:
  enabled: true
  port: 18789
  auth_token: "your-secret-token"
```

## Available Gateway Operations

Once connected, Mission Control can call these RPC methods:

| Category | Methods |
|---|---|
| **Sessions** | `sessions.list`, `sessions.create`, `sessions.close` |
| **Chat** | `sessions.message`, `sessions.history`, `sessions.ask-user` |
| **Agents** | `agents.list`, `agents.activate`, `agents.deactivate`, `agents.set-model` |
| **Health** | `health`, `status`, `last-heartbeat` |
| **Approvals** | `execution.approve`, `execution.reject` |
| **Skills** | `skills.list`, `skills.install`, `skills.uninstall` |
| **Pairing** | `nodes.list`, `nodes.pair`, `nodes.unpair` |
| **Config** | `config.get`, `config.update` |

## Concrete Example: Connecting to a Home Lab

This example connects Mission Control (running on an Unraid server at
`192.168.1.2`) to an OpenClaw instance on a Mac Air at `192.168.1.10`.

**Network topology:**

```
[Unraid Server 192.168.1.2]         [Mac Air 192.168.1.10]
  |-- mc-backend (port 8000)           |-- OpenClaw gateway (port 18789)
  |-- mc-frontend (port 3100)          |-- 78 agents
  |-- mc-db (PostgreSQL)               |-- model: zai/glm-5 (default)
  |-- mc-redis                         |
```

**Steps:**

1. Ensure the Mac Air's OpenClaw gateway is running on port 18789
2. In Mission Control, create a gateway with URL `ws://192.168.1.10:18789`
3. Enter the auth token configured in OpenClaw
4. Test the connection -- you should see a successful handshake
5. Sync agents -- all 78 agents are imported into Mission Control
6. Assign agents to boards and start managing tasks

## Troubleshooting

### Connection Refused

```
Error: dial tcp 192.168.1.10:18789: connect: connection refused
```

**Causes:**
- OpenClaw gateway is not running. Check the OpenClaw process on the remote host.
- Wrong port. Verify the gateway port in the OpenClaw config.
- Firewall blocking the connection. Ensure port 18789 is open between hosts.

**Fix:** Verify the gateway is running and the port is accessible:

```bash
# From the Mission Control host
nc -zv 192.168.1.10 18789
```

### Pairing Required

```
Error: device not paired
```

**Cause:** Device mode is active and the OpenClaw instance has not accepted this
device's identity.

**Fix:**
- Approve the device in the OpenClaw admin interface, or
- Set `disable_device_pairing: true` on the gateway in Mission Control to use
  token-only auth.

### Invalid Handshake / Authentication Failed

```
Error: authentication failed: invalid token
```

**Cause:** The auth token in Mission Control does not match the token configured
in OpenClaw.

**Fix:** Verify the token in both systems. Update the gateway record in Mission
Control with the correct token:

```bash
curl -X PATCH http://localhost:8000/api/v1/gateways/<gateway-id> \
  -H "Content-Type: application/json" \
  -d '{"auth_token": "correct-token"}'
```

### WebSocket Upgrade Failed

```
Error: unexpected response status: 403
```

**Cause:** CORS or origin restrictions on the OpenClaw gateway.

**Fix:** Ensure the OpenClaw gateway allows connections from the Mission Control
API server's address.

### TLS / Certificate Errors

If your OpenClaw instance uses TLS and you see certificate validation errors, you
may need to configure TLS settings on the gateway record. Check whether the
`allow_insecure_tls` flag is appropriate for your environment (development only --
never in production).
