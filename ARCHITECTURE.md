# ARCHITECTURE.md — SkyFrame CRM
> Tech decisions, system structure, module boundaries.
> Agents: do not deviate from stack without explicit instruction.

---

## 1. Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Frontend framework | React 18 + TypeScript | Type safety, component reuse |
| Styling | Tailwind CSS v3 | Utility-first, fast iteration |
| UI components | shadcn/ui | Accessible, unstyled base |
| Icons | Lucide React | Consistent icon system |
| Routing | React Router v6 | Client-side SPA routing |
| State management | Zustand | Lightweight, no boilerplate |
| Forms | React Hook Form + Zod | Validation + type-safe schemas |
| Date handling | date-fns | Lightweight, no moment.js |
| Charts | Recharts | P&L and analytics visuals |
| Backend | Supabase | Postgres DB + Auth + Storage |
| AI calls | Anthropic API (claude-sonnet-4-20250514) | Multi-agent content + analytics |
| Build tool | Vite | Fast dev server + HMR |
| Hosting | Vercel (or local) | Simple deploy, env vars support |

---

## 2. System Modules

```
┌──────────────────────────────────────────────────────┐
│                   SKYFRAME CRM                       │
│                  (Single Page App)                   │
├─────────────────┬──────────────────┬─────────────────┤
│   MODULE 1      │    MODULE 2      │    MODULE 3     │
│   Lead & CRM    │  Orders &        │  Content &      │
│   Pipeline      │  Finance         │  AI Agency      │
├─────────────────┴──────────────────┴─────────────────┤
│              Supabase (Postgres + Auth)               │
└──────────────────────────────────────────────────────┘
```

### Module 1 — Lead & CRM Pipeline
- Lead cards with full profile
- Kanban pipeline view + list view
- Follow-up scheduler
- Lead source + ad attribution

### Module 2 — Orders & Finance
- Order detail page linked to lead
- Payment stage tracker (booking / balance / shipping)
- Materials checklist + bottleneck flags
- Cost tracker
- Monthly P&L summary

### Module 3 — Content & AI Agency
- Analytics input (screenshot upload + context)
- Multi-agent swarm (roles defined in AGENTS.md)
- Content calendar
- Post log (platform, boosted, budget, result)
- Caption + strategy output display

---

## 3. Routing Structure

```
/                          → Dashboard (summary widgets)
/leads                     → Lead list + Kanban board
/leads/:id                 → Lead detail + order link
/orders                    → All orders list
/orders/:id                → Order detail + payments + materials
/finance                   → Cost tracker + P&L
/content                   → Content calendar + post log
/content/agency            → AI Agency — input insights, launch agents
/content/agency/result     → Agent output display
/settings                  → Business config (prices, materials, sources)
```

---

## 4. Data Flow

```
User input
    ↓
React component (React Hook Form)
    ↓
Zod validation
    ↓
Supabase client (supabase-js)
    ↓
Postgres (RLS enforced)
    ↓
Real-time update or query result
    ↓
Zustand store update
    ↓
UI re-render
```

**AI Agency flow:**
```
User uploads screenshot + label
    ↓
Base64 encoded → sent to Anthropic API
    ↓
Agent 1 (Analyst) → raw output
    ↓
Agent 2 (Strategist) → receives Agent 1 output
    ↓
Agent 3 (Copywriter) → receives Agent 2 output
    ↓
Agent 4 (Planner) → final calendar + action steps
    ↓
Displayed in UI + saved to Supabase
```

---

## 5. File Structure

```
skyframe-crm/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/              ← shadcn components
│   │   ├── leads/
│   │   ├── orders/
│   │   ├── finance/
│   │   └── content/
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Leads.tsx
│   │   ├── LeadDetail.tsx
│   │   ├── Orders.tsx
│   │   ├── OrderDetail.tsx
│   │   ├── Finance.tsx
│   │   ├── Content.tsx
│   │   └── Agency.tsx
│   ├── lib/
│   │   ├── supabase.ts      ← Supabase client init
│   │   ├── anthropic.ts     ← API call helpers
│   │   └── utils.ts
│   ├── stores/
│   │   ├── leadsStore.ts
│   │   ├── ordersStore.ts
│   │   └── contentStore.ts
│   ├── types/
│   │   └── index.ts         ← All shared TypeScript types
│   ├── hooks/
│   │   ├── useLeads.ts
│   │   ├── useOrders.ts
│   │   └── useContent.ts
│   ├── App.tsx
│   └── main.tsx
├── AGENTS.md
├── GEMINI.md
├── CONTEXT.md
├── ARCHITECTURE.md
├── SUPABASE.md
├── FRONTEND.md
├── MAINTENANCE.md
└── .env.local
```

---

## 6. Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_ANTHROPIC_API_KEY=your_anthropic_key
```

**Never commit `.env.local` to git. Always use `.gitignore`.**

---

## 7. Key Constraints

- Single user. No multi-tenancy. No role-based access beyond Supabase Auth.
- All prices in AED.
- No external API integrations (WhatsApp, Instagram, Facebook) in v1.
- AI calls are client-side via Anthropic API — keep prompts under 4000 tokens per agent call.
- Mobile-aware but desktop-primary layout.
