# OpenClaw Mac Air Instance

**Host:** `192.168.1.162` (SSH user: `openclaw`)
**Last verified:** 2026-03-19

## Gateway Connection Details

| Parameter | Value |
|-----------|-------|
| **WebSocket URL** | `ws://192.168.1.162:18789` |
| **HTTP Health** | `http://192.168.1.162:18789/health` (returns `{"ok":true,"status":"live"}`) |
| **Auth mode** | `token` |
| **Auth token** | `659e1f3b489529441110dea88518628136f39bca37aeb524` |
| **Bind** | `lan` (0.0.0.0 -- accessible from LAN) |
| **TLS** | None (plain WebSocket, no SSL) |
| **OpenClaw version** | `2026.3.8` (installed via npm at `/opt/homebrew/lib/node_modules/openclaw`) |
| **Update available** | v2026.3.13 (run `openclaw update` on the Mac Air) |

## Process Management

- Managed by **pm2** (process name: `mission-control`, PID 1606)
- Node.js process listening on ports:
  - `18789` (gateway WebSocket -- LAN-accessible)
  - `18791` (browser control -- localhost only)
  - `18792` (internal -- localhost only)
  - `8787` (unknown service, LAN-accessible)
- Also running: Ollama on `127.0.0.1:11434`, PostgreSQL on `127.0.0.1:5432`

## Paired Devices

Two devices are paired:

1. **Web UI (Control UI)**
   - Device ID: `d386cd65...d16d`
   - Client: `openclaw-control-ui` / webchat
   - Role: operator (admin, approvals, pairing)
   - Token: `JrCLWeRJq4Yf1K3KPpv3G2yJkCq6FfGzqFo_R44Dy1g`

2. **CLI**
   - Device ID: `4007f103...7d38`
   - Client: `cli`
   - Role: operator (read, admin, write, approvals, pairing)
   - Token: `ykRVQvlCUlSt4Yqm-wThc4tgSoCen1r1jFd84FJa2mo`

## Agents (78 total)

### Custom agents (with explicit models)

| ID | Name | Model |
|----|------|-------|
| `main` | Main | default (zai/glm-5) |
| `mission-control` | Mission Control | anthropic/claude-opus-4-6 |
| `dev-team` | Dev Team | openai-codex/gpt-5.3-codex |
| `marketing-team` | Marketing Team | minimax-portal/MiniMax-M2.5 |
| `docker-expert` | Docker Expert | anthropic/claude-sonnet-4-6 |
| `unraid-expert` | Unraid Expert | anthropic/claude-sonnet-4-6 |
| `linux-expert` | Linux Expert | anthropic/claude-sonnet-4-6 |
| `memory-curator` | Memory Curator | kimi-coding/k2p5 |
| `n8n-expert` | N8N Expert | anthropic/claude-sonnet-4-6 |
| `fundamentals-analyst` | Stock Fundamentals Analyst | anthropic/claude-sonnet-4-6 |

### Agency agents (use default model: zai/glm-5)

brand-guardian, image-prompt-engineer, inclusive-visuals-specialist, ui-designer, ux-architect, ux-researcher, visual-storyteller, whimsy-injector, ai-engineer, autonomous-optimization-architect, backend-architect, data-engineer, devops-automator, frontend-developer, mobile-app-builder, rapid-prototyper, security-engineer, senior-developer, technical-writer, app-store-optimizer, content-creator, growth-hacker, instagram-curator, reddit-community-builder, social-media-strategist, tiktok-strategist, twitter-engager, wechat-official-account, xiaohongshu-specialist, zhihu-strategist, behavioral-nudge-engine, feedback-synthesizer, sprint-prioritizer, trend-researcher, experiment-tracker, project-shepherd, studio-operations, studio-producer, project-manager-senior, macos-spatial-metal-engineer, terminal-integration-specialist, visionos-spatial-engineer, xr-cockpit-interaction-specialist, xr-immersive-developer, xr-interface-architect, agentic-identity-trust, agents-orchestrator, data-analytics-reporter, data-consolidation-agent, lsp-index-engineer, report-distribution-agent, sales-data-extraction-agent, cultural-intelligence-strategist, developer-advocate, analytics-reporter, executive-summary-generator, finance-tracker, infrastructure-maintainer, legal-compliance-checker, support-responder, accessibility-auditor, api-tester, evidence-collector, performance-benchmarker, reality-checker, test-results-analyzer, tool-evaluator, workflow-optimizer

## Model Defaults

- **Primary model:** `zai/glm-5`
- **Fallback chain:** anthropic/claude-sonnet-4-6 -> anthropic/claude-opus-4-6 -> minimax-portal/MiniMax-M2.5 -> minimax-portal/MiniMax-M2.5-highspeed -> minimax-portal/MiniMax-M2.5-Lightning -> kimi-coding/k2p5
- **Max concurrent agents:** 4
- **Max concurrent subagents:** 8
- **Subagent run timeout:** 1800s (30 min)
- **Compaction mode:** safeguard

## Channels

- **Telegram:** enabled, bot `@nox1904_bot`, DM policy: pairing, group policy: allowlist (currently empty -- all group messages dropped)

## Connecting Mission Control

To register this gateway in Mission Control (Unraid at 192.168.1.2:8000):

1. Create a gateway via the API or UI:
   - **Name:** OpenClaw Mac Air
   - **URL:** `ws://192.168.1.162:18789`
   - **Auth token:** `659e1f3b489529441110dea88518628136f39bca37aeb524`
   - **Allow insecure TLS:** true (no TLS)

2. The gateway `controlUi.allowedOrigins` only lists localhost -- Mission Control connects server-side via WebSocket, so this should not be an issue. If CORS problems arise, add the Unraid origin to the allowedOrigins list in `~/.openclaw/openclaw.json` on the Mac Air.

## Log Files

- `~/.openclaw/logs/gateway.log` (93 KB) -- main gateway log
- `~/.openclaw/logs/gateway.err.log` (63 KB) -- errors/warnings
- `~/.openclaw/logs/config-audit.jsonl` -- configuration change audit trail
- `/tmp/openclaw/openclaw-2026-03-19.log` -- daily rotated log

## Known Issues / Notes

- **Update pending:** v2026.3.8 -> v2026.3.13 available
- **Telegram group allowlist empty:** Group messages silently dropped (doctor warning in logs)
- **Control UI token mismatches:** Multiple `token_mismatch` errors in err.log from local Control UI (Mar 17) -- the web UI token may need re-syncing
- **Non-loopback binding warning:** Gateway warns about LAN binding; auth is configured so this is expected
- **Claude Desktop app** is running on the Mac Air (separate from OpenClaw)
