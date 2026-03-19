# GitHub Projects Research for Mission Control & OpenClaw

**Date**: 2026-03-19
**Sources**: GitHub Trending Weekly #26 & #27, Monthly #5, Today #26, 30 Trending Self-Hosted Projects, karpathy/autoresearch

---

## 1. Must-Investigate -- Projects Directly Relevant to MC Features

### Engram -- Persistent Memory for AI Agents
- **URL**: https://github.com/Gentleman-Programming/engram
- **What it is**: Single Go binary with SQLite + FTS5 that gives AI agents persistent memory. Agents proactively save state after architecture decisions or bug fixes and instantly recover full session state.
- **Why it matters for MC**: Mission Control already has board memory and board group memory. Engram's approach -- a single lightweight binary with full-text search -- could inspire a more efficient memory implementation. The "proactive save on significant events" pattern is directly applicable to how agents should manage memory in MC.
- **Action**: Study the Go binary architecture and FTS5 search patterns. Consider whether MC's memory API could adopt similar auto-save triggers.

### Ask4Me -- Human-in-the-Loop via Simple API
- **URL**: https://github.com/easychen/ask4me
- **What it is**: Provides human-in-the-loop decisions in one synchronous HTTP long-poll request. Send API call with buttons/text input, get notification on phone, human responds, original request receives the result immediately.
- **Why it matters for MC**: MC already has approval workflows with rubric scores and confidence levels. Ask4Me's ultra-simple single-request pattern could inspire a lightweight approval mode for less critical decisions. The long-poll pattern is interesting for real-time approval resolution.
- **Action**: Evaluate whether MC could offer a "quick approval" API endpoint inspired by Ask4Me for simple yes/no agent decisions, in addition to the full structured approval workflow.

### Overstory -- Multi-Agent Coordination via Git Worktrees
- **URL**: https://github.com/jayminwest/overstory
- **What it is**: Spawns worker agents in isolated Git worktrees using tmux, coordinates them through SQLite mail system, merges work back with tiered conflict resolution. Supports Claude Code, Pi, and Gemini CLI.
- **Why it matters for MC**: MC manages agents across boards and groups. Overstory's coordination patterns -- isolated worktrees, message passing via SQLite, tiered conflict resolution -- could inform how MC orchestrates multi-agent work. The "one session, many workers" model maps to MC's board group concept.
- **Action**: Study the conflict resolution tiers and message-passing protocol. These patterns could enhance MC's task dispatch and agent coordination.

### OpenReview -- AI Code Review Agent (Vercel Labs)
- **URL**: https://github.com/vercel-labs/openreview
- **What it is**: Deploy as GitHub App, mention @openreview in PRs. Spins up sandboxed environment, clones branch, runs Claude-powered review, auto-commits fixes for lint/formatting issues.
- **Why it matters for MC**: Could be integrated as a gateway skill for OpenClaw agents doing code review. The sandboxed execution pattern is relevant to MC's gateway architecture.
- **Action**: Evaluate as a reference implementation for how MC gateways could safely run code-modifying agent tasks.

### Checkmate -- Open-Source Uptime & Infrastructure Monitoring
- **URL**: https://github.com/bluewave-labs/checkmate
- **What it is**: Self-hosted monitoring for websites, Docker containers, SSL certs, ports. Real-time alerts via email/Discord/Slack/webhooks. Public status pages. Uses just 100MB RAM.
- **Why it matters for MC**: MC needs gateway health monitoring and agent uptime tracking. Checkmate's lightweight monitoring architecture and alert pattern (webhook-based) could inform MC's metrics and health check features.
- **Action**: Study the alerting pipeline and status page architecture. MC could adopt similar patterns for gateway and agent health dashboards.

### claude-devtools -- AI Agent Session Visualization
- **URL**: https://github.com/matt1398/claude-devtools
- **What it is**: Desktop app that visualizes Claude Code session logs -- every file read, tool call, subagent tree, and token usage. Zero config, reads existing session logs.
- **Why it matters for MC**: MC's activity feed and agent observability could learn from how claude-devtools visualizes agent behavior. The subagent tree view and token cost visualization are directly relevant to MC's metrics dashboard.
- **Action**: Study the session log parsing and visualization approach. Consider building similar observability views into MC's dashboard for OpenClaw agent sessions.

---

## 2. Architecture Inspiration -- Patterns Worth Studying

### zeroclaw -- Zero-Overhead Rust Agent Runtime
- **URL**: https://github.com/zeroclaw-labs/zeroclaw
- **What it is**: Rust-based agentic workflow runtime with <5MB RAM, 10ms cold start, WebAssembly sandbox for agent isolation. Built by Harvard/MIT researchers.
- **Why it matters**: The WebAssembly sandbox approach to agent isolation is architecturally significant. MC gateways could potentially adopt WASM sandboxing for running untrusted agent skills safely. The ultra-low resource footprint demonstrates what's achievable.
- **Patterns to study**: WASM-based skill sandboxing, minimal runtime overhead, cold start optimization.

### nanobot -- Ultra-Lightweight Agent Framework (4K LOC)
- **URL**: https://github.com/HKUDS/nanobot
- **What it is**: Core AI agent functionality in 4,000 lines of Python -- tool calling, persistent memory, scheduled tasks. Entire codebase readable in an afternoon.
- **Why it matters**: Demonstrates the minimum viable surface area for agent functionality. Useful as a reference to ensure MC isn't over-engineering its agent management abstractions.
- **Patterns to study**: Minimal memory implementation, tool calling interface, scheduled task architecture.

### openfang -- Agent OS with 40 Channel Adapters
- **URL**: https://github.com/openfang (from monthly trending)
- **What it is**: Open-source "Agent OS" compiled as single 32MB Rust binary. Autonomous workers for scraping, social media, OSINT. 16 layers of security, 40 channel adapters.
- **Why it matters**: The channel adapter architecture (40 adapters) maps to MC's gateway concept. The security layer approach is relevant to MC's approval and permission system.
- **Patterns to study**: Channel adapter abstraction, layered security model, single-binary deployment.

### picoclaw -- Go Agent for Edge Devices
- **URL**: https://github.com/sipeed/picoclaw
- **What it is**: Ultra-efficient OpenClaw-inspired assistant in Go. Runs on $10 hardware (Raspberry Pi Zero, old Android phones, RISC-V boards). Near-zero memory, sub-second boot.
- **Why it matters**: MC's Go backend could learn from picoclaw's efficiency patterns. Demonstrates how to build OpenClaw-compatible agents that work on constrained hardware -- relevant for edge gateway deployments.
- **Patterns to study**: Go memory optimization, lightweight WebSocket JSON-RPC implementation, edge deployment patterns.

### gstack -- AI Virtual Company (YC CEO's Setup)
- **URL**: https://github.com/garrytan/gstack
- **What it is**: Garry Tan's personal AI setup that turns Claude Code into a virtual tech company with distinct personas (CEO, Engineering Manager, QA). Uses a conductor agent that forces strategic thinking before coding.
- **Why it matters**: The "conductor agent" pattern -- an orchestrating agent that plans before execution -- is directly relevant to MC's board lead agent concept. The persona-based role system maps to MC's agent roles.
- **Patterns to study**: Conductor/lead agent patterns, persona definitions, strategic planning before execution.

### OpenPencil -- AI-Native Design Tool with MCP
- **URL**: https://github.com/open-pencil/open-pencil
- **What it is**: Open-source Figma alternative with MCP server integration. AI can generate and place components on canvas from natural language. Ships with professional style guides.
- **Why it matters**: The MCP server integration pattern shows how design tools can expose capabilities to AI agents. Relevant for thinking about how MC's UI could be AI-controllable.
- **Patterns to study**: MCP server integration in desktop apps, AI-driven UI generation.

---

## 3. OpenClaw Ecosystem -- Tools That Enhance OpenClaw Setup

### OpenClaw Master Skills Directory
- **URL**: https://github.com/LeoYeAI/openclaw-master-skills
- **What it is**: Curated, weekly-updated directory of 127+ best OpenClaw skills from across the web. Browse and plug skills directly into your setup.
- **Why it matters for OpenClaw**: Direct value -- curated skill collection that can be installed into OpenClaw. MC's skills marketplace feature should index this directory.
- **Action**: Integrate with MC's skills marketplace. Consider auto-importing from this directory.

### jCodeMunch MCP Server -- AST-Based Code Indexing
- **URL**: https://github.com/jgravelle/jcodemunch-mcp
- **What it is**: MCP server that indexes codebases using tree-sitter AST parsing. AI retrieves exact functions/classes by symbol instead of reading entire files. Drops context from 40K tokens to 200.
- **Why it matters for OpenClaw**: Essential tool for any OpenClaw agent doing code tasks. Dramatically reduces token costs and improves code comprehension accuracy.
- **Action**: Install as MCP server for OpenClaw agents. Consider building MC integration that auto-configures this for code-focused boards.

### chrome-cdp-skill -- Live Browser Access for Agents
- **URL**: https://github.com/pasky/chrome-cdp-skill
- **What it is**: Connects AI agents directly to live Chrome sessions via WebSocket. Agent reads open tabs and uses sites where you're already authenticated. No bloated frameworks.
- **Why it matters for OpenClaw**: Enables OpenClaw agents to interact with web applications using existing authentication. Useful for agents that need to perform web-based tasks.
- **Action**: Add as available skill in OpenClaw setup. Relevant for agents doing web research or automation tasks.

### KeyID agent-kit -- Email Tools for AI Agents
- **URL**: https://github.com/KeyID-AI/agent-kit
- **What it is**: 27 email tools via MCP. Agents get a real email address -- check inbox, send, reply, forward, search, manage contacts, schedule delivery. Works with any MCP client.
- **Why it matters for OpenClaw**: Gives OpenClaw agents email capabilities. Combined with MC's approval workflows, agents could send approval requests via email and process responses.
- **Action**: Install as MCP server for OpenClaw. Consider MC webhook integration for email-triggered tasks.

### Excalidraw Diagram Skill
- **URL**: https://github.com/coleam00/excalidraw-diagram-skill
- **What it is**: Generates structured Excalidraw JSON files from natural language. Creates system flow diagrams with brand-aligned colors.
- **Why it matters for OpenClaw**: Useful skill for documentation-focused agents. Could auto-generate architecture diagrams for MC boards.
- **Action**: Install as OpenClaw skill. Consider MC integration that stores generated diagrams as board memory artifacts.

### Open Terminal -- Sandboxed Execution for AI
- **URL**: https://github.com/open-webui/open-terminal
- **What it is**: From Open WebUI team. Gives AI agents a real sandboxed OS via Docker -- full shell access to install software, run scripts, manage files. Isolated from host.
- **Why it matters for OpenClaw**: Provides the safe execution environment that OpenClaw agents need for running arbitrary code. Complements MC's gateway architecture by providing isolated compute.
- **Action**: Evaluate as execution backend for OpenClaw agents. Could serve as skill execution sandbox.

### karpathy/autoresearch -- Automated Research Agent
- **URL**: https://github.com/karpathy/autoresearch
- **Stars**: 42.1k
- **What it is**: Fully automated AI research lab in a few Python scripts. Points at a model, proposes architecture changes, runs training loops, checks validation loss, decides whether to keep or discard. Runs overnight.
- **Why it matters for OpenClaw**: Reference implementation for long-running autonomous agent workflows. The propose-train-evaluate loop maps directly to how OpenClaw agents could run research tasks managed by MC boards.
- **Action**: Study the autonomous decision loop. Consider building a "research board" template in MC inspired by this pattern.

### Skills Best Practices
- **URL**: https://github.com/mgechev/skills-best-practices
- **What it is**: Definitive guide for writing professional-grade agent skills. Teaches directory structure, LLM validation, context window management, and reliable tool triggering.
- **Why it matters for OpenClaw**: Essential reference for anyone building skills for OpenClaw. MC's skills marketplace could enforce these patterns.
- **Action**: Reference in MC documentation. Consider building skill validation into MC's marketplace that checks these best practices.

---

## 4. Self-Hosted Tools -- Complementary to Mission Control

### Outline -- Knowledge Base
- **URL**: https://github.com/outline/outline
- **What it is**: Open-source knowledge base with real-time collaborative editing, Notion-style interface, slash commands, nested documents, permissions, version history. Docker Compose with PostgreSQL, Redis, S3.
- **Why it matters**: MC users running self-hosted setups likely need documentation. Outline's tech stack (PostgreSQL, Redis, Docker) mirrors MC's. Could serve as the documentation layer alongside MC's agent operations.
- **Complementary use**: Agent-generated documentation stored in Outline, managed by MC boards.

### Octelium -- Unified Secure Access Platform
- **URL**: https://github.com/octelium/octelium
- **What it is**: Self-hosted platform on Kubernetes functioning as VPN, ZTNA, API gateway, AI gateway, MCP gateway, PaaS, and ngrok alternative. WireGuard/QUIC tunnels, BeyondCorp mode, per-request access control.
- **Why it matters**: Directly relevant as infrastructure for MC + OpenClaw deployments. The MCP gateway and AI gateway features could complement MC's gateway management. Per-request access control using CEL/OPA is relevant to MC's approval system.
- **Action**: Evaluate as infrastructure layer for multi-gateway MC deployments. The MCP gateway feature could simplify OpenClaw skill routing.

### portracker -- Infrastructure Discovery Dashboard
- **URL**: https://github.com/mostafa-wahied/portracker
- **What it is**: Auto-discovers Docker containers, services, and VMs across your network. Shows internal vs published ports. Peer-to-peer instances for multi-server view. Single dashboard.
- **Why it matters**: Useful for MC deployments with multiple gateways. Auto-discovers all running services including MC's own containers (mc-db, mc-redis, mc-backend, mc-frontend, mc-webhook-worker).
- **Complementary use**: Run alongside MC to visualize the infrastructure supporting agent operations.

### Doppelganger -- Browser Automation Platform
- **URL**: https://github.com/mnemosyne-artificial-intelligence/doppelganger
- **What it is**: Self-hosted browser automation on Playwright. Drag-and-drop block editor. Proxy rotation, screenshot/recording capture. Cookie storage.
- **Why it matters**: Could serve as execution backend for OpenClaw agents doing web automation tasks. The proxy rotation and cookie management are relevant for agents accessing external services.

### HomeDockOS -- Docker Container Dashboard
- **URL**: https://github.com/BansheeTech/HomeDockOS
- **What it is**: Dashboard for managing Docker containers on homelab servers.
- **Why it matters**: Complementary tool for users running MC on Unraid or similar homelab setups. Provides container-level visibility.

---

## 5. Key Takeaways -- Top 5 Actionable Insights for Mission Control

### 1. Memory Systems Are Getting Smarter -- MC Should Lead
Engram (Go+SQLite+FTS5) and nanobot (4K LOC) both demonstrate that AI agent memory is trending toward lightweight, searchable, event-driven persistence. MC already has board memory and board group memory, but should consider:
- **Auto-save triggers** (save memory on significant agent events, not just explicit writes)
- **Full-text search** across all memory (FTS5 pattern from Engram)
- **Memory importance scoring** (as seen in CrewAI's composite scoring approach)

### 2. The OpenClaw Skill Ecosystem Is Exploding -- MC's Marketplace Must Keep Up
Four sources featured OpenClaw-related projects: Master Skills directory (127+ curated skills), Skills Best Practices guide, picoclaw (edge agents), and zeroclaw (WASM runtime). MC's skills marketplace should:
- **Auto-import from the Master Skills directory**
- **Enforce best practices** via automated skill validation
- **Support lightweight runtimes** (picoclaw-style agents) alongside full OpenClaw instances

### 3. Agent Observability Is a Growing Need
claude-devtools visualizes agent sessions, Checkmate monitors infrastructure, Langfuse traces LLM operations. MC should build:
- **Session-level agent tracing** (what did the agent read, decide, execute?)
- **Token cost visualization** per board/agent
- **Gateway health dashboards** with alert webhooks

### 4. Human-in-the-Loop Is Becoming Simpler and More Nuanced
Ask4Me proves that approval workflows can be a single HTTP request. MC already has sophisticated approvals with rubric scores. The opportunity is to offer:
- **Tiered approval modes** -- from Ask4Me-simple (one button) to full structured review
- **Mobile-friendly approval** notifications (push notification with action buttons)
- **Approval SLA tracking** (time-to-decision metrics)

### 5. Single-Binary, Edge-Ready Deployment Is the Future
zeroclaw (Rust, <5MB RAM), picoclaw (Go, $10 hardware), and openfang (32MB single binary) all point toward ultra-lightweight agent runtimes. MC should:
- **Support lightweight gateway agents** that run on edge devices
- **Offer a minimal MC agent binary** for resource-constrained environments
- **Consider WASM sandboxing** for skill execution (zeroclaw pattern)

---

## Appendix: Full Project Index

| Project | URL | Category | Relevance |
|---------|-----|----------|-----------|
| Engram | github.com/Gentleman-Programming/engram | Agent Memory | Must-investigate |
| Ask4Me | github.com/easychen/ask4me | HITL/Approvals | Must-investigate |
| Overstory | github.com/jayminwest/overstory | Agent Coordination | Must-investigate |
| OpenReview | github.com/vercel-labs/openreview | Code Review Agent | Must-investigate |
| Checkmate | github.com/bluewave-labs/checkmate | Monitoring | Must-investigate |
| claude-devtools | github.com/matt1398/claude-devtools | Agent Observability | Must-investigate |
| zeroclaw | github.com/zeroclaw-labs/zeroclaw | Agent Runtime | Architecture |
| nanobot | github.com/HKUDS/nanobot | Agent Framework | Architecture |
| openfang | github.com/openfang | Agent OS | Architecture |
| picoclaw | github.com/sipeed/picoclaw | Edge Agent | Architecture |
| gstack | github.com/garrytan/gstack | Agent Orchestration | Architecture |
| OpenPencil | github.com/open-pencil/open-pencil | Design + MCP | Architecture |
| OC Master Skills | github.com/LeoYeAI/openclaw-master-skills | Skill Directory | OpenClaw |
| jCodeMunch MCP | github.com/jgravelle/jcodemunch-mcp | MCP Server | OpenClaw |
| chrome-cdp-skill | github.com/pasky/chrome-cdp-skill | Browser MCP | OpenClaw |
| KeyID agent-kit | github.com/KeyID-AI/agent-kit | Email MCP | OpenClaw |
| Excalidraw Skill | github.com/coleam00/excalidraw-diagram-skill | Diagram Skill | OpenClaw |
| Open Terminal | github.com/open-webui/open-terminal | Sandboxed Exec | OpenClaw |
| autoresearch | github.com/karpathy/autoresearch | Research Agent | OpenClaw |
| Skills Best Practices | github.com/mgechev/skills-best-practices | Skill Guide | OpenClaw |
| Outline | github.com/outline/outline | Knowledge Base | Self-Hosted |
| Octelium | github.com/octelium/octelium | Secure Access/MCP GW | Self-Hosted |
| portracker | github.com/mostafa-wahied/portracker | Infra Discovery | Self-Hosted |
| Doppelganger | github.com/mnemosyne-artificial-intelligence/doppelganger | Browser Automation | Self-Hosted |
| HomeDockOS | github.com/BansheeTech/HomeDockOS | Docker Dashboard | Self-Hosted |
| llmfit | github.com/AlexsJones/llmfit | LLM Hardware Fit | Utility |
| Remodex | github.com/Emanuele-web04/remodex | Mobile Agent Control | Utility |
| Webreel | github.com/vercel-labs/webreel | Demo Recording | Utility |
| PM Skills | github.com/phuryn/pm-skills | PM Agent Skill | OpenClaw |
| WebHaptics | github.com/lochie/web-haptics | Mobile UX | Frontend |
