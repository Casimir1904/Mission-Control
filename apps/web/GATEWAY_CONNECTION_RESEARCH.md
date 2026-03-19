# OpenClaw Gateway Connection Research

## Source: crshdn/mission-control (TypeScript reference implementation)

### Architecture Difference
crshdn/mission-control is a **Next.js + SQLite monolith** that connects directly to a local or remote OpenClaw gateway via WebSocket. Our fork split into a Python backend + Next.js frontend and added its own gateway abstraction layer.

---

## Authentication Flow (Two Modes)

### Mode 1: Device Identity (default, used when `disableDevicePairing = false`)

1. **WebSocket opens** to `OPENCLAW_GATEWAY_URL` (default `ws://127.0.0.1:18789`)
2. **Gateway sends** `connect.challenge` event with a `nonce` in `payload.nonce`
3. **Client responds** with a `connect` request containing:

```json
{
  "type": "req",
  "id": "<uuid>",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "gateway-client",         // Our Python backend uses DEFAULT_GATEWAY_CLIENT_ID
      "version": "1.0.0",
      "platform": "python",           // crshdn uses process.platform
      "mode": "backend"               // DEFAULT_GATEWAY_CLIENT_MODE
    },
    "auth": { "token": "<OPENCLAW_GATEWAY_TOKEN>" },
    "role": "operator",
    "scopes": ["operator.read", "operator.admin", "operator.approvals", "operator.pairing"],
    "device": {
      "id": "<sha256-of-public-key>",
      "publicKey": "<base64url-raw-32-byte-ed25519-public-key>",
      "signature": "<base64url-ed25519-signature>",
      "signedAt": <unix-ms>,
      "nonce": "<nonce-from-challenge>"
    }
  }
}
```

4. **Device identity** is an Ed25519 keypair stored in `~/.mission-control/identity/device.json` (crshdn) or managed by our `device_identity.py`
5. **Signature payload** (v2 with nonce): `v2|<deviceId>|<clientId>|<clientMode>|<role>|<scopes-csv>|<signedAtMs>|<token>|<nonce>`
6. **Signature payload** (v1 without nonce): `v1|<deviceId>|<clientId>|<clientMode>|<role>|<scopes-csv>|<signedAtMs>|<token>`

### Mode 2: Control UI (used when `disableDevicePairing = true`)

1. **No device identity** is sent
2. Client ID changes to `"openclaw-control-ui"`, mode changes to `"ui"`
3. An **Origin header** is set on the WebSocket connection matching the gateway URL's scheme+host+port
4. The Origin header is what the gateway uses to trust the connection (like a browser's same-origin)
5. This is the **simpler path** — no Ed25519 keys needed

---

## crshdn/mission-control Specific Values

The TypeScript reference uses **slightly different values** than our Python backend:

| Field | crshdn (TypeScript) | Our backend (Python) |
|-------|-------------------|---------------------|
| `client.id` | `"cli"` | `"gateway-client"` or `"openclaw-control-ui"` |
| `client.mode` | `"ui"` | `"backend"` or `"ui"` |
| `role` | `"operator"` | `"operator"` |
| `scopes` | `["operator.admin"]` | `["operator.read", "operator.admin", "operator.approvals", "operator.pairing"]` |
| `protocol` | `3` | `3` |
| Identity path | `~/.mission-control/identity/device.json` | `~/.openclaw/device_identity/` |

**Important**: crshdn always sends device identity when available, uses `clientId: "cli"`, `mode: "ui"`, and only requests `["operator.admin"]` scope. It does not have a `control_ui` bypass mode.

---

## Registered Devices on Our OpenClaw Instance

From the devices.json on the gateway, we can see two registered devices:

1. **Control UI** (browser): `clientId: "openclaw-control-ui"`, `clientMode: "webchat"`, scopes: `["operator.admin", "operator.approvals", "operator.pairing"]`
2. **CLI**: `clientId: "cli"`, `clientMode: "cli"`, scopes: `["operator.read", "operator.admin", "operator.write", "operator.approvals", "operator.pairing"]`

---

## What a Go Gateway Client Needs

### Option A: Device Identity Mode (recommended for production)
1. Generate an Ed25519 keypair and persist it
2. Compute `deviceId` = SHA-256 hex of raw 32-byte public key
3. Open WebSocket to gateway URL
4. Wait for `connect.challenge` event, extract `nonce`
5. Build signature payload: `v2|<deviceId>|<clientId>|<clientMode>|<role>|<scopes-csv>|<signedAtMs>|<token>|<nonce>`
6. Sign with Ed25519 private key, encode as base64url
7. Send `connect` request with device block
8. **First connection**: gateway will need to approve the device (check gateway logs or approve via control UI)

### Option B: Control UI Mode (simpler, for dev/local)
1. Set `disableDevicePairing: true` on the gateway config (in `openclaw.json` under the channel)
2. Open WebSocket with `Origin` header = `http://<gateway-host>:<port>` (or `https://` for TLS)
3. Use `client.id: "openclaw-control-ui"`, `client.mode: "ui"`
4. No device identity needed
5. Wait for `connect.challenge`, respond with `connect` request (no `device` field)

### Option C: Token-Only (what crshdn actually does for remote)
1. Set `OPENCLAW_GATEWAY_TOKEN` env var
2. The token goes in `auth.token` field
3. Still need device identity for the signature
4. Token alone is NOT sufficient — device identity is required unless using control_ui mode

---

## Key Config Changes Needed on OpenClaw Side

To use **Control UI mode** (simplest for remote connections):
- In the OpenClaw gateway config, set `disableDevicePairing: true` on the relevant channel
- This makes the gateway accept connections with just a valid Origin header

To use **Device Identity mode**:
- No gateway config changes needed
- But the device must be **approved** on first connection (either auto-approved or manually via the gateway)
- Check if there's an `autoApproveDevices` setting in the gateway config

---

## Summary of Exact Changes for Go Client

1. **Protocol**: WebSocket, protocol version 3
2. **Flow**: Open WS -> receive `connect.challenge` -> send `connect` response
3. **Simplest path**: Use control_ui mode with `disableDevicePairing: true` on gateway
4. **Production path**: Implement Ed25519 device identity with challenge-response signing
5. **Client values**: `id: "gateway-client"`, `mode: "backend"`, `role: "operator"`
6. **Scopes**: `["operator.read", "operator.admin", "operator.approvals", "operator.pairing"]`
7. **Auth**: Include `auth.token` if `OPENCLAW_GATEWAY_TOKEN` is set
