# FRONTEND.md — SkyFrame CRM UI/UX Guide
> Visual design system, layout rules, component patterns, and UX decisions.
> Agents: follow this exactly. No generic AI aesthetics. No purple gradients.

---

## 1. Design Direction

**Aesthetic:** Industrial precision meets aviation luxury.
Dark-primary interface. Like a cockpit instrument panel — purposeful, data-dense, no noise.
Think: Bloomberg terminal meets Emirates first class. Functional but premium.

**Feeling:** The operator should feel like they're in control. Every glance at the dashboard = full situational awareness.

---

## 2. Color System

```css
:root {
  /* Backgrounds */
  --bg-base:       #0A0C10;   /* near-black — main background */
  --bg-surface:    #111318;   /* card/panel surface */
  --bg-elevated:   #1A1D24;   /* elevated elements, modals */
  --bg-input:      #15181F;   /* form inputs */

  /* Borders */
  --border-subtle: #1E2230;   /* subtle dividers */
  --border-default:#2A2F3E;   /* standard borders */
  --border-strong: #3D4455;   /* emphasis borders */

  /* Brand accent */
  --accent-primary:  #3B7FE8; /* aviation blue — primary actions */
  --accent-hover:    #5292F0; /* hover state */
  --accent-muted:    #1E3A6E; /* muted accent background */

  /* Status colors */
  --status-green:  #22C55E;   /* paid, delivered, success */
  --status-yellow: #EAB308;   /* pending, follow-up, caution */
  --status-red:    #EF4444;   /* overdue, unpaid, error */
  --status-orange: #F97316;   /* in production, bottleneck */
  --status-purple: #A855F7;   /* content/agency module */
  --status-blue:   #3B7FE8;   /* info, contacted */

  /* Text */
  --text-primary:  #F1F3F7;   /* main text */
  --text-secondary:#8B92A8;   /* labels, metadata */
  --text-muted:    #4A5068;   /* placeholders, disabled */
  --text-accent:   #3B7FE8;   /* links, highlighted values */
}
```

---

## 3. Typography

```css
/* Fonts — import in index.html */
/* Display: Bebas Neue — numbers, stats, big headings */
/* Body: IBM Plex Mono — data, tables, labels (aviation instrument feel) */
/* UI: DM Sans — buttons, form labels, nav */

font-family headline: 'Bebas Neue', sans-serif;
font-family body:     'IBM Plex Mono', monospace;
font-family ui:       'DM Sans', sans-serif;
```

**Scale:**
```
stat numbers (dashboard KPIs):  48px Bebas Neue
page title:                     28px DM Sans 600
section header:                 16px DM Sans 600 uppercase tracking-widest
card title:                     14px DM Sans 500
body / table content:           13px IBM Plex Mono
label / metadata:               11px DM Sans 500 uppercase tracking-wide --text-secondary
```

---

## 4. Layout Rules

- **Sidebar navigation** — fixed left, 64px collapsed / 220px expanded.
- **Main content area** — scrollable, padded 24px.
- **Max content width** — 1400px centered.
- **Card grid** — 12-column grid. Dashboard KPIs: 3-col. Lead list: full width.
- **No horizontal scroll** — everything fits viewport width.

### Sidebar nav items (in order):
```
🏠 Dashboard
👥 Leads
📦 Orders
💰 Finance
📅 Content
🤖 Agency
⚙️  Settings
```

---

## 5. Component Patterns

### KPI Card (Dashboard)
```
┌─────────────────────────┐
│ TOTAL REVENUE           │  ← label: 11px uppercase --text-secondary
│ AED 2,994               │  ← value: 48px Bebas Neue --text-primary
│ ↑ 12% this month        │  ← trend: 12px --status-green
└─────────────────────────┘
bg: --bg-surface, border: --border-default, border-radius: 8px
```

### Lead Card (Kanban)
```
┌────────────────────────────────┐
│ Ahmed Al Mansouri    [HIGH] 🔴 │  ← name + priority badge
│ Emirates B777 · Standard       │  ← product interest
│ 📱 Instagram → WhatsApp        │  ← source
│ Follow-up: Tomorrow            │  ← follow-up badge (yellow if due)
└────────────────────────────────┘
```

### Order Status Tracker (timeline strip)
```
[BOOKING ✓] → [PRODUCTION ●] → [READY] → [BALANCE] → [SHIPPING] → [DELIVERED]
```
Completed steps: --status-green filled.
Current step: --accent-primary pulsing dot.
Future steps: --border-default empty circle.

### Payment Cell
```
Booking:  AED 50   [✓ PAID]    ← green badge
Balance:  AED 199  [PENDING]   ← yellow badge
Shipping: AED 35   [PENDING]   ← yellow badge
─────────────────────────────
Total:    AED 284
```

### Material Checklist
```
☑ Box Frame          IN STOCK
☑ Model Plane        IN STOCK
⚠ Printout Plaque   ⚠ MISSING   ← orange, triggers bottleneck flag
☑ Frame Extension    IN STOCK
☑ Nail               IN STOCK
☑ PVC Tape           IN STOCK
```

### Agent Pipeline Progress (Agency page)
```
[●] Analyst      → Running...
[ ] Strategist   → Waiting
[ ] Copywriter   → Waiting
[ ] Planner      → Waiting
```
Active: pulsing --accent-primary dot.
Complete: --status-green checkmark.
Error: --status-red X with retry button.

---

## 6. Kanban Board (Leads)

Columns map to funnel stages:
```
INQUIRY | CONTACTED | INTERESTED | BOOKING PAID | IN PRODUCTION | READY | DELIVERED
```

- Each column: fixed width 260px, vertically scrollable.
- Drag-and-drop between columns updates `funnel_stage` in Supabase.
- Column header shows count badge.
- Overdue follow-ups: card gets left border --status-red 3px.

---

## 7. Dashboard Layout

```
┌──────────────────────────────────────────────────────┐
│  SKYFRAME                          [+ New Lead] [🔔]  │
├──────────────────────────────────────────────────────┤
│ TODAY'S FOLLOW-UPS  ·  3 due                         │  ← urgent strip
├────────────┬────────────┬────────────┬───────────────┤
│ REVENUE    │ ACTIVE     │ IN PROD    │ FOLLOW-UPS    │
│ AED 2,994  │ LEADS: 12  │ ORDERS: 3  │ DUE: 5        │
├────────────┴────────────┴────────────┴───────────────┤
│ RECENT LEADS                  │ MATERIAL ALERTS       │
│ [lead cards]                  │ [bottleneck flags]    │
├───────────────────────────────┴───────────────────────┤
│ CONTENT CALENDAR — This Week                          │
│ [Mon][Tue][Wed][Thu][Fri][Sat][Sun]                   │
└───────────────────────────────────────────────────────┘
```

---

## 8. Motion & Interaction

- Page transitions: 150ms fade-in.
- Kanban drag: card lifts with shadow + 5% scale.
- Agent pipeline: each agent completion animates from loading → done.
- Status badge changes: 200ms color transition.
- Sidebar expand/collapse: 200ms ease-out.
- No bouncy/springy animations — this is a work tool, not a toy.

---

## 9. Forms

- All inputs: `--bg-input` background, `--border-default` border, focus → `--accent-primary` border.
- Validation errors: `--status-red` text below field.
- Submit buttons: solid `--accent-primary` background, DM Sans 500.
- Cancel: ghost button, `--text-secondary`.
- Destructive actions (delete): `--status-red` button, requires confirm dialog.

---

## 10. Responsive Rules

- **Desktop (1280px+):** Full layout — sidebar expanded, multi-column.
- **Laptop (1024–1279px):** Sidebar collapsed (icons only), content adapts.
- **Tablet (768–1023px):** Bottom nav instead of sidebar, single column.
- **Mobile (<768px):** Simplified view — list only (no kanban), key actions only.

Desktop is primary. Mobile is usable but not optimised.

---

## 11. Empty States

Every empty list/page must show:
```
[icon]
No [things] yet.
[Primary action button]
```
Example: "No leads yet. [+ Add First Lead]"
Never show a blank white/dark void.

---

## 12. Accessibility Baseline

- All interactive elements: keyboard focusable.
- Color not used as sole indicator (always text or icon too).
- Minimum touch target: 44x44px.
- Contrast ratio: 4.5:1 minimum for body text.
