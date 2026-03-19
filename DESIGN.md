# Mission Control — Design System

**Identity**: "Flight Console" — dark-mode first, dense information, operational precision.
**Feeling**: "I am in command." The user should feel like a flight director at NASA Mission Control.
**Anti-pattern**: Generic SaaS dashboards, card grids, hero sections, pie charts, excessive whitespace.

## Color Palette

### Dark Mode (Primary)

```
Background layers:
  --bg-base:      #0A0A0B    (deepest — page background)
  --bg-surface:   #111113    (cards, panels, sidebar)
  --bg-elevated:  #1A1A1D    (dialogs, popovers, hover states)
  --bg-overlay:   #222225    (Cmd+K palette, notification panel)

Borders:
  --border-subtle:  #1F1F23  (card borders, dividers)
  --border-default: #2A2A2E  (input borders, table lines)
  --border-strong:  #3A3A3F  (focus rings, active borders)

Text:
  --text-primary:   #EDEDEF  (headings, primary content)
  --text-secondary: #A0A0A6  (labels, descriptions, timestamps)
  --text-muted:     #6B6B73  (disabled, placeholder)

Status (semantic — these NEVER change between themes):
  --status-healthy:   #10B981  (green — agent online, task done)
  --status-warning:   #F59E0B  (amber — degraded, stale heartbeat)
  --status-critical:  #EF4444  (red — offline, error, failed)
  --status-info:      #3B82F6  (blue — in progress, informational)
  --status-neutral:   #6B7280  (gray — inactive, backlog)

Accent:
  --accent-primary:   #3B82F6  (blue — primary actions, links)
  --accent-hover:     #2563EB  (blue hover)
  --accent-muted:     #1E3A5F  (blue background tint)
```

### Light Mode (secondary — toggleable)

```
Background layers:
  --bg-base:      #FAFAFA
  --bg-surface:   #FFFFFF
  --bg-elevated:  #F5F5F5
  --bg-overlay:   #FFFFFF

Text:
  --text-primary:   #111113
  --text-secondary: #6B6B73
  --text-muted:     #A0A0A6

(Status colors stay the same in both themes)
```

## Typography

```
Font stack:
  --font-sans:   "Inter", system-ui, -apple-system, sans-serif
  --font-mono:   "JetBrains Mono", "Fira Code", "SF Mono", monospace

Scale (4px base, rem units):
  --text-xs:     0.75rem / 1rem       (12px — timestamps, badges)
  --text-sm:     0.875rem / 1.25rem   (14px — body text, table cells)
  --text-base:   1rem / 1.5rem        (16px — primary content)
  --text-lg:     1.125rem / 1.75rem   (18px — section headers)
  --text-xl:     1.25rem / 1.75rem    (20px — page titles)
  --text-2xl:    1.5rem / 2rem        (24px — dashboard hero numbers)
  --text-3xl:    2rem / 2.5rem        (32px — big metric display)

Rules:
  - ALL numbers use tabular figures (font-variant-numeric: tabular-nums)
  - Metrics and counts use --font-mono
  - Body text uses --font-sans
  - No text larger than --text-3xl anywhere in the app
  - Line lengths: max 72ch for body text, no max for tables
```

## Spacing

```
Scale (4px base):
  --space-1:   4px     (tight: inline badge padding)
  --space-2:   8px     (compact: table cell padding, icon gaps)
  --space-3:   12px    (default: card padding, form field gaps)
  --space-4:   16px    (comfortable: section gaps, sidebar item padding)
  --space-5:   20px    (spacious: page content padding)
  --space-6:   24px    (generous: section separators)
  --space-8:   32px    (large: page header to content)

Rules:
  - Sidebar items: --space-4 vertical, --space-3 horizontal
  - Card padding: --space-4
  - Table cells: --space-2 vertical, --space-3 horizontal
  - Page content: --space-5 horizontal margin
  - Between sections: --space-6
  - DENSE by default: prefer --space-2 and --space-3. Only use --space-6+ for visual breathing room between major sections.
```

## Components

### Health Banner (signature element)
Full-width bar at top of dashboard. 48px height. Gradient from status color to transparent.
- Healthy: green gradient + "All systems operational" (left-aligned)
- Warning: amber gradient + "{N} agents need attention" + [View →]
- Critical: red gradient + "{N} agents offline" + [View →]

### Status Dot
8px circle, inline with text. Colors from status palette.
Used: agent status, task status, gateway connection, sidebar nav items.

### Agent Status Grid (dashboard)
Dense grid, NOT cards. Each cell: 48px height, contains: status dot + agent name + current task (truncated) + last heartbeat time.
Fits 20+ agents visible without scrolling.

### Data Tables
Default list view for agents, tasks, boards, memory.
- Sticky header
- Row hover: --bg-elevated
- Inline status dots
- Sortable columns (click header)
- Row selection (checkbox, left)
- Monospace for numbers/timestamps

### Sidebar Navigation
240px width, collapsible to 64px (icon-only).
- Section headers: uppercase, --text-xs, --text-muted
- Nav items: --text-sm, --text-secondary, bold when active
- Live counts: right-aligned, --font-mono, --text-muted
- Red dot indicator on items needing attention
- Active item: --bg-elevated + left border accent

### Command Palette (Cmd+K)
Centered overlay, 640px width, max-height 480px.
- Search input: --text-lg, autofocus
- Results grouped by category (Boards, Agents, Tasks, Actions)
- Keyboard navigation: ↑↓ to select, Enter to execute, Esc to close
- Recent items shown when query is empty

### Notification Panel
Slide-out from right, 400px width.
- Grouped by time: "Today", "Yesterday", "This Week", "Older"
- Unread items: left border --accent-primary
- Quick actions inline (Mark Read, Go To, Dismiss)
- Badge count on trigger (bell icon)

### Toast Notifications
Bottom-right, stacked.
- Success: --status-healthy left border, auto-dismiss 3s
- Error: --status-critical left border, persistent
- Warning: --status-warning left border, 5s
- Info: --status-info left border, 3s

## Layout Patterns

### Dashboard
```
┌─ Health Banner (full width, 48px) ──────────────────────────────┐
├─────────────────────────────────────────────────────────────────┤
│  ┌─ Agent Status Grid (2/3 width) ──┐  ┌─ Activity Stream ───┐ │
│  │                                   │  │  (1/3 width,        │ │
│  │  [dot] Agent-1  Task #12  2m ago  │  │   scrollable)       │ │
│  │  [dot] Agent-2  Idle       5m ago │  │                     │ │
│  │  [dot] Agent-3  Task #15  1m ago  │  │  10:42 Agent-1      │ │
│  │  [dot] Agent-4  OFFLINE   15m ago │  │  completed Task #11 │ │
│  │  ...                              │  │                     │ │
│  └───────────────────────────────────┘  │  10:40 Agent-3      │ │
│  ┌─ Metrics Bar ─────────────────────┐  │  started Task #15   │ │
│  │ Tasks Today: 47 │ Approvals: 3    │  │                     │ │
│  │ Agents Online: 12/15 │ Cost: $4.20│  │  10:38 Approval     │ │
│  └───────────────────────────────────┘  │  needed: Task #14   │ │
│                                         └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Board Detail (Kanban)
```
┌─ Board Header: "Project Alpha" │ 5 agents │ 23 tasks ──────────┐
├─────────────────────────────────────────────────────────────────┤
│  Backlog(4)  │  Todo(6)    │  In Progress(8) │  Review(3) │ Done(2) │
│  ┌─────────┐ │  ┌────────┐ │  ┌─────────────┐ │           │         │
│  │ Task #20│ │  │Task #18│ │  │ Task #15    │ │           │         │
│  │ Agent-3 │ │  │ —      │ │  │ Agent-3     │ │           │         │
│  │ P: High │ │  │ P: Med │ │  │ 🔄 Running  │ │           │         │
│  └─────────┘ │  └────────┘ │  └─────────────┘ │           │         │
│  (drag zone) │  (drag zone)│  (drag zone)     │           │         │
└─────────────────────────────────────────────────────────────────┘
```

## Motion & Animation

- Skeleton loading: pulse animation (opacity 0.5 → 1.0, 1.5s ease)
- Status transitions: color change with 200ms ease
- Panel slide-in: 200ms ease-out from right edge
- Cmd+K: fade-in 150ms with slight scale (0.98 → 1.0)
- Toast: slide-in from bottom-right, 200ms
- NO bouncy animations. NO playful motion. This is a control room.

## Iconography

- Use Lucide icons (compatible with shadcn/ui)
- 16px default, 20px for nav items, 24px for page headers
- Status uses dots, NOT icons (dots are faster to parse at a glance)
- Monochrome icons: --text-secondary default, --text-primary on hover

## Design Anti-Patterns (DO NOT)

- NO card grids for agents/tasks (use tables or dense grids)
- NO hero sections or marketing content within the app
- NO pie charts (use sparklines, bar charts, or plain numbers)
- NO excessive whitespace (dense > airy for ops tools)
- NO decorative illustrations (unless onboarding wizard)
- NO rounded-full buttons (use rounded-md: 6px)
- NO gradient text or glassmorphism
- NO animated backgrounds or ambient motion

## Responsive Strategy

### Breakpoints
```
  --bp-sm:   640px    (mobile landscape)
  --bp-md:   768px    (tablet portrait)
  --bp-lg:   1024px   (tablet landscape / small laptop)
  --bp-xl:   1280px   (desktop)
  --bp-2xl:  1536px   (wide desktop)
```

### Layout Behavior by Viewport

```
VIEWPORT          │ SIDEBAR        │ CONTENT           │ PANELS
──────────────────┼────────────────┼───────────────────┼────────────────
< 768px (mobile)  │ Hidden.        │ Full width.       │ Full-screen
                  │ Hamburger menu │ Simplified views.  │ overlays.
                  │ (top-left).    │ Tables → stacked   │
                  │                │ cards.             │
──────────────────┼────────────────┼───────────────────┼────────────────
768-1024 (tablet) │ Icon-only      │ Full width minus  │ Slide-over
                  │ (64px).        │ sidebar. Tables    │ (half-width).
                  │ Expand on      │ with horizontal    │
                  │ hover/tap.     │ scroll.            │
──────────────────┼────────────────┼───────────────────┼────────────────
1024-1280         │ Full sidebar   │ Standard layout.   │ Side panel
                  │ (240px).       │ All features.      │ (400px).
──────────────────┼────────────────┼───────────────────┼────────────────
> 1280 (desktop)  │ Full sidebar   │ Wide layout.       │ Side panel
                  │ (240px).       │ Dashboard uses     │ (400px).
                  │                │ 3-column grid.     │
```

### Mobile-Specific Decisions
- **Dashboard mobile**: Health banner (full width) + agent count summary (not full grid) + approve/alert CTAs
- **Kanban mobile**: Single column view, swipe between columns
- **Topology mobile**: Not shown. Link to "View on desktop" with simplified agent list instead
- **Cmd+K mobile**: Full-screen overlay with large touch targets
- **Tables mobile**: Convert to stacked card layout with key info visible, expand for details

## Accessibility

### WCAG 2.1 AA Compliance (minimum)

**Color contrast:**
- Text on dark bg: --text-primary (#EDEDEF) on --bg-base (#0A0A0B) = 18.5:1 ✓
- Text on dark bg: --text-secondary (#A0A0A6) on --bg-base (#0A0A0B) = 7.5:1 ✓
- Status colors on dark bg: all > 4.5:1 ✓
- NEVER use color alone to convey status — always pair with text label or icon shape

**Keyboard navigation:**
- Tab order follows visual layout (left-to-right, top-to-bottom)
- Focus rings: 2px solid --border-strong, 2px offset. ALWAYS visible.
- Skip-to-content link (visible on focus)
- Sidebar: ↑↓ to navigate items, Enter to select, Esc to collapse
- Kanban: ↑↓ to select task, ←→ to move between columns, Space to pick up/drop
- Cmd+K: ↑↓ to navigate results, Enter to execute, Esc to close
- Tables: ↑↓ to navigate rows, Enter to open detail, Space to select

**Screen readers:**
- ARIA landmarks: navigation, main, complementary (sidebar), banner (top bar)
- Live regions (aria-live="polite"): agent status changes, new notifications, activity stream
- Agent status announced: "Agent Alpha, online, working on Task 12"
- Dashboard announced: "12 of 15 agents online. 3 approvals pending."

**Touch targets:**
- Minimum 44x44px for all interactive elements
- Sidebar nav items: 44px height minimum
- Table rows: 44px height minimum
- Action buttons: 36px minimum (within click area of 44px)

**Motion:**
- Respect prefers-reduced-motion: disable pulse animations, instant transitions
- No auto-playing animations that can't be paused

**Focus management:**
- Dialog open → focus trap within dialog
- Dialog close → return focus to trigger element
- Cmd+K open → focus search input
- Notification panel open → focus first notification
- Toast → aria-live announcement, no focus steal
