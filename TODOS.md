# Mission Control — TODOS

## Phase 2 (after v0.1 release)

### Multi-Framework Agent Adapters
**Priority:** P2 | **Effort:** L (CC: ~4-6 hours)
**What:** Build adapter interfaces for CrewAI, AutoGen, and LangGraph so Mission Control can manage agents from any framework.
**Why:** The competitive analysis shows the market is framework-specific. Being framework-agnostic expands addressable market 10x.
**Context:** The Go architecture with NATS events and Ent schemas supports this cleanly — each adapter implements an `AgentProvider` interface. Start with CrewAI (largest community at ~46k stars).
**Depends on:** Core platform stable, AgentProvider interface defined.

### SAML/SSO Enterprise Auth
**Priority:** P3 | **Effort:** M (CC: ~1 hour)
**What:** Add SAML 2.0 support alongside OIDC for enterprise customers who mandate it.
**Why:** Many enterprises require SAML for internal tools. Without it, MC can't enter some organizations.
**Context:** OIDC (built in Phase 0) covers ~80% of use cases. SAML is the remaining 20% of large enterprise. Go SAML libraries (crewjam/saml) are less mature than OIDC equivalents.
**Depends on:** OIDC auth working and stable.

## Phase 4 (before open-source release)

### Logo/Brand Mark
**Priority:** P2 | **Effort:** S (CC: can generate SVG concepts, ~15 min)
**What:** Create a proper brand mark for Mission Control to replace the text "MC" placeholder.
**Why:** Open-source credibility. A text logo says "we haven't launched yet." Needed for: GitHub social preview, favicon, README hero image, login screen.
**Context:** Should evoke "mission control" — consider a stylized radar sweep, grid pattern, or orbital path. Must work at 16px (favicon) and 200px (README). Monochrome first, color optional. The design system ("Flight Console") is dark-mode first with green/amber/red status palette.
**Depends on:** DESIGN.md finalized (done).

## Phase 3+ (scaling and polish)

### Database Connection Pooling (PgBouncer)
**Priority:** P3 | **Effort:** S (CC: ~10 min)
**What:** Add PgBouncer to Docker Compose for connection pooling.
**Why:** Go's built-in sql.DB pooling is sufficient for most self-hosted deployments, but PgBouncer provides better resource utilization under high agent count (100+).
**Context:** Only add when load testing data shows Go's built-in pool is insufficient. Don't add infrastructure before it's needed ("boring by default").
**Depends on:** Load testing data showing connection pool pressure.

### Horizontal Scaling Guide
**Priority:** P3 | **Effort:** S (CC: ~15 min, docs only)
**What:** Document how to run multiple API instances behind a load balancer with sticky WebSocket sessions.
**Why:** Some self-hosted users in larger organizations may need HA (high availability).
**Context:** Single-instance is fine for most self-hosted deployments. NATS naturally distributes events across instances. WebSocket sessions need sticky routing (or use NATS for WS message relay). Document in `docs/deployment/scaling.md`.
**Depends on:** Core platform stable, NATS event system working.
