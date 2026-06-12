# BUILD.md — SkyFrame CRM Build Sequence
> Step-by-step: bolt.new skeleton → Antigravity full build.
> Follow this order exactly.

---

## Phase 1 — bolt.new Skeleton

Paste this prompt into bolt.new to generate the starter skeleton:

---

### bolt.new Prompt (copy-paste exactly):

```
Build a React 18 + TypeScript + Vite + Tailwind CSS SPA called SkyFrame CRM.

STACK:
- React 18, TypeScript strict mode
- Vite build tool
- Tailwind CSS v3
- React Router v6 (createBrowserRouter)
- Zustand for state
- Supabase JS client (@supabase/supabase-js)
- shadcn/ui components
- Lucide React icons
- Recharts for charts
- React Hook Form + Zod for forms
- date-fns for dates

ROUTES (client-side SPA):
/ → Dashboard
/leads → Lead list + Kanban toggle
/leads/:id → Lead detail
/orders → Orders list
/orders/:id → Order detail
/finance → Cost tracker + P&L
/content → Content calendar + post log
/content/agency → AI Agency page
/settings → Settings

FILE STRUCTURE:
src/
  components/
    ui/           ← shadcn components here
    leads/
    orders/
    finance/
    content/
    shared/
  pages/
    Dashboard.tsx
    Leads.tsx
    LeadDetail.tsx
    Orders.tsx
    OrderDetail.tsx
    Finance.tsx
    Content.tsx
    Agency.tsx
    Settings.tsx
  lib/
    supabase.ts   ← singleton Supabase client
    agents/
      orchestrator.ts
      analyst.ts
      strategist.ts
      copywriter.ts
      planner.ts
  stores/
    leadsStore.ts
    ordersStore.ts
    contentStore.ts
  hooks/
    useLeads.ts
    useOrders.ts
    useContent.ts
  types/
    index.ts      ← all shared TypeScript types

DESIGN:
- Dark theme. Background: #0A0C10. Surface: #111318.
- Primary accent: #3B7FE8 (aviation blue)
- Fixed sidebar navigation (left). Icons: Lucide React.
- Sidebar items: Dashboard, Leads, Orders, Finance, Content, Agency, Settings
- Fonts: Bebas Neue (headings/stats), IBM Plex Mono (data), DM Sans (UI)
- Import Google Fonts in index.html

ENV VARS (use import.meta.env):
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_ANTHROPIC_API_KEY

SUPABASE CLIENT (src/lib/supabase.ts):
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

Create placeholder page components with correct routing wired up.
Each page shows its name as heading and "Module coming soon" placeholder.
Wire all navigation so every route renders correct page.
Include .env.local.example file with the 3 env var keys (values blank).
Include .gitignore with: node_modules/, dist/, .env.local, .env, *.local, .DS_Store
```

---

## Phase 2 — Export from bolt.new

1. Download the generated project ZIP from bolt.new.
2. Unzip into your working directory.
3. Copy all 7 markdown files from this `skyframe-docs/` folder into the project root:
   - `CONTEXT.md`
   - `ARCHITECTURE.md`
   - `SUPABASE.md`
   - `MAINTENANCE.md`
   - `AGENTS.md`
   - `GEMINI.md`
   - `FRONTEND.md`
   - `BUILD.md` (this file)
4. Run `npm install` to verify all packages install cleanly.
5. Open in Antigravity.

---

## Phase 3 — Antigravity Build Order

Open project in Antigravity. Run missions in this sequence. Complete + validate each before next.

### Mission 1 — Supabase Setup
```
Mission: Set up Supabase database for SkyFrame CRM.
Read SUPABASE.md. Create all tables, RLS policies, indexes, and triggers 
exactly as specified. Then set up the Supabase client singleton in src/lib/supabase.ts. 
Confirm all TypeScript types in src/types/index.ts match the schema.
```

### Mission 2 — Leads Module
```
Mission: Build the complete Leads module for SkyFrame CRM.
Read CONTEXT.md, ARCHITECTURE.md, FRONTEND.md, SUPABASE.md.
Build:
- /leads page: list view + kanban board toggle
- Lead cards (design from FRONTEND.md Section 5)
- Kanban columns: inquiry, contacted, interested, booking_paid, in_production, ready_pending, delivered
- Drag-and-drop between columns updates funnel_stage in Supabase
- Add lead form (all fields from SUPABASE.md leads table)
- /leads/:id page: full lead detail, notes log, follow-up setter, link to order
- Follow-up badge: yellow if due today, red if overdue
Use design system from FRONTEND.md exactly.
```

### Mission 3 — Orders Module
```
Mission: Build the complete Orders module for SkyFrame CRM.
Read CONTEXT.md, SUPABASE.md, FRONTEND.md.
Build:
- /orders page: orders list with status, airline, payment status summary
- /orders/:id page with:
  - Order status timeline strip (FRONTEND.md Section 5)
  - Payment tracker: booking (50 AED), balance, shipping fee — each with paid/unpaid toggle
  - Material checklist: 6 materials, in_stock toggle, bottleneck flag if any missing
  - Production timestamps
  - Link back to lead
- Create order form (can be created from lead detail page)
- Orders list filterable by status
```

### Mission 4 — Finance Module
```
Mission: Build the Finance module for SkyFrame CRM.
Read CONTEXT.md, SUPABASE.md, FRONTEND.md.
Build:
- /finance page with two sections:
  1. Cost Tracker: add/list costs by category (raw_materials, consumables, ad_spend, 
     shipping_error, waste, miscellaneous), date, amount AED, description
  2. Monthly P&L: revenue (sum of all payments from delivered orders this month) 
     vs costs (sum of costs table this month). Show net margin. Use Recharts bar chart.
- Filter costs by month and category
```

### Mission 5 — Content & Post Log Module
```
Mission: Build the Content module for SkyFrame CRM.
Read CONTEXT.md, SUPABASE.md, FRONTEND.md.
Build:
- /content page:
  1. Weekly content calendar view (7 days, each day shows planned posts)
  2. Post log below: list all posts with platform, type, status, boosted flag, budget, notes
  3. Add post form: date, platform, content_type, caption, image_notes, boosted toggle, budget
  4. Status toggle per post: planned → drafted → posted (or skipped)
- Filter post log by platform and month
```

### Mission 6 — AI Agency Module
```
Mission: Build the AI Agency module for SkyFrame CRM.
Read AGENTS.md (Section 3 and 4 especially), CONTEXT.md, FRONTEND.md.
Build:
- /content/agency page:
  1. Input section: upload 1-4 screenshots + text label per screenshot
  2. "Launch Agency" button triggers 4-agent pipeline
  3. Agent progress display (FRONTEND.md Section 5: Agent Pipeline Progress)
  4. Results display: analyst summary, strategy brief, 5 captions, 7-day calendar
  5. "Save to Content Calendar" button: saves planner output posts to Supabase posts table
  6. Past sessions list: load previous analytics sessions
Use orchestrator.ts pattern from AGENTS.md Section 4.
Handle errors per AGENTS.md Section 6.
Save full session to analytics_sessions table.
```

### Mission 7 — Dashboard
```
Mission: Build the Dashboard for SkyFrame CRM.
Read CONTEXT.md, FRONTEND.md Section 7.
Build:
- / page:
  1. Today's follow-ups strip (leads with follow_up_date = today, sorted by priority)
  2. KPI cards: total revenue this month, active leads count, orders in production, follow-ups due
  3. Recent leads (last 5, with source + stage)
  4. Material alerts (any order_materials with in_stock = false)
  5. This week's content calendar mini view (7 day strip, today highlighted)
Use design from FRONTEND.md Section 7 layout exactly.
Use Bebas Neue for all KPI numbers.
```

### Mission 8 — Settings Page
```
Mission: Build the Settings page for SkyFrame CRM.
Build:
- /settings page with editable config:
  1. Product prices (Standard AED, Custom AED) — stored in Supabase settings table (key-value)
  2. Airlines list (add/remove airlines for dropdown menus across app)
  3. Lead sources list (add/remove custom sources)
  4. Material list (informational — the 6 materials)
Create a simple `settings` table: key text, value text. 
Load settings into app context on startup.
```

### Mission 9 — Polish + Validation
```
Mission: Polish and validate SkyFrame CRM.
- Run browser subagent on every route. Fix all console errors.
- Verify all empty states render.
- Verify all forms submit and save correctly.
- Verify Supabase RLS blocks unauthenticated access.
- Add Supabase Auth (email + password, single user). 
  Wrap app in auth check — redirect to /login if not authenticated.
- Check all amounts display as AED X,XXX.XX format.
- Check all dates display in DD/MM/YYYY format (GST timezone).
- Ensure sidebar navigation active state highlights current route.
```

---

## Phase 4 — Deploy

```bash
# Vercel deploy
npm i -g vercel
vercel

# Add env vars in Vercel dashboard:
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_ANTHROPIC_API_KEY

vercel --prod
```

Done. SkyFrame CRM is live.
