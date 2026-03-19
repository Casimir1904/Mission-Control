# Design System

Mission Control uses a design system called **"Flight Console"**. The full
specification lives in [DESIGN.md](../DESIGN.md) at the repository root.

## Identity

**Feeling**: "I am in command." The interface should feel like a flight director's
console at NASA Mission Control -- dark-mode first, information-dense, and built
for operational precision.

**Anti-patterns to avoid**: Generic SaaS dashboards, card grids, hero sections,
pie charts, excessive whitespace.

## UI Foundation

- **Component library**: [shadcn/ui](https://ui.shadcn.com/) (built on Radix primitives)
- **Icons**: [Lucide](https://lucide.dev/) -- monochrome, 16px default, 20px for nav, 24px for page headers
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State management**: Jotai (atoms for client-side state)
- **Data fetching**: TanStack Query (server state, caching, WebSocket invalidation)

## Color Palette

### Dark Mode (Primary)

The default and primary theme.

| Token | Value | Usage |
|---|---|---|
| `--bg-base` | `#0A0A0C` | Page background |
| `--bg-surface` | `#111113` | Cards, panels |
| `--bg-elevated` | `#1A1A1E` | Modals, popovers |
| `--bg-overlay` | `#252529` | Hover states, active rows |
| `--border-default` | `#2A2A2E` | Default borders |
| `--border-strong` | `#3A3A3E` | Active/focus borders |
| `--text-primary` | `#EDEDEF` | Headings, primary content |
| `--text-secondary` | `#A0A0A6` | Descriptions, labels |
| `--text-muted` | `#6B6B73` | Timestamps, metadata |

### Status Colors

Used across both themes:

| Token | Value | Usage |
|---|---|---|
| `--status-healthy` | `#22C55E` | Online, complete, success |
| `--status-warning` | `#F59E0B` | Degraded, pending |
| `--status-critical` | `#EF4444` | Offline, failed, error |
| `--status-info` | `#3B82F6` | In progress, active |
| `--accent-primary` | `#6366F1` | Primary actions, active nav |

### Light Mode (Secondary)

Available as a toggleable option. Status colors remain the same.

| Token | Value |
|---|---|
| `--bg-base` | `#FAFAFA` |
| `--bg-surface` | `#FFFFFF` |
| `--bg-elevated` | `#F5F5F5` |
| `--text-primary` | `#111113` |
| `--text-secondary` | `#6B6B73` |
| `--text-muted` | `#A0A0A6` |

## Typography

| Token | Size | Usage |
|---|---|---|
| `--text-xs` | 12px | Timestamps, badges |
| `--text-sm` | 14px | Body text, table cells |
| `--text-base` | 16px | Primary content |
| `--text-lg` | 18px | Section headers |
| `--text-xl` | 20px | Page titles |
| `--text-2xl` | 24px | Dashboard hero numbers |
| `--text-3xl` | 32px | Big metric display (maximum size) |

**Font stacks:**

- Sans: `Inter`, system-ui, -apple-system, sans-serif
- Mono: `JetBrains Mono`, `Fira Code`, `SF Mono`, monospace

**Rules:**

- All numbers use tabular figures (`font-variant-numeric: tabular-nums`)
- Metrics and counts use the mono font
- Body text uses the sans font
- No text larger than `--text-3xl` anywhere in the app

## Key Components

### Health Banner

The signature element -- a full-width 48px bar at the top of the dashboard that
shows system status at a glance.

### Status Dots

Status is communicated through colored dots, not icons. Dots are faster to parse
at a glance. Use `--status-*` colors.

### Agent Status Grid

The primary dashboard view: a dense table/grid showing all agents with their
current status, active task, and time since last heartbeat.

### Data Tables

Built on TanStack Table. Dense rows (36px height), monospace numbers, sortable
columns.

### Sidebar Navigation

Always visible on desktop. Collapsible on smaller screens. Uses Lucide icons at
20px.

### Command Palette

Triggered by `Cmd+K`. Provides quick navigation and actions across the entire
application.

## Layout Patterns

### Dashboard

```
+-- Health Banner (full width, 48px) --------------------------+
|                                                               |
|  +-- Agent Status Grid (2/3) --+  +-- Activity Stream (1/3) |
|  |                              |  |   (scrollable)          |
|  | [dot] Agent-1  Task #12 2m  |  |                          |
|  | [dot] Agent-2  Idle     5m  |  |   10:42 Agent-1          |
|  | [dot] Agent-3  Task #15 1m  |  |   completed Task #11     |
|  +------------------------------+  +--------------------------+
|  +-- Metrics Bar ------------------------------------------+  |
|  | Tasks Today: 47 | Agents: 12/15 | Approvals: 3         |  |
|  +----------------------------------------------------------+ |
+---------------------------------------------------------------+
```

### Board Detail (Kanban)

```
+-- Board Header (name, description, agent count) ----+
+-- Filter Bar (status, agent, tag, search) -----------+
|                                                       |
| +-- Todo -----+ +-- In Progress -+ +-- Done --------+|
| | Task card   | | Task card      | | Task card      ||
| | Task card   | | Task card      | |                ||
| | Task card   | |                | |                ||
| +-------------+ +----------------+ +----------------+|
+-------------------------------------------------------+
```

## When to Use What

| Pattern | Use For |
|---|---|
| **Data Table** | Lists of items with sortable columns (agents, tasks, activity) |
| **Card** | Kanban task cards, gateway status cards |
| **Grid** | Dashboard agent status, metric tiles |
| **Dialog** | Create/edit forms, confirmations, approvals |
| **Command Palette** | Quick navigation, search, bulk actions |

## Responsive Breakpoints

| Breakpoint | Width | Behavior |
|---|---|---|
| `sm` | 640px | Stack sidebar, single column |
| `md` | 768px | Collapsible sidebar, responsive grids |
| `lg` | 1024px | Full sidebar, 2-column layouts |
| `xl` | 1280px | Full density, 3-column layouts |

## Further Reading

- [DESIGN.md](../DESIGN.md) -- Full design system specification with spacing, motion, and accessibility details.
