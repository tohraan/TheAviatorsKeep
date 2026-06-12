# GEMINI.md — Antigravity Directives (SkyFrame CRM)
> Antigravity-specific overrides. Takes precedence over AGENTS.md when rules conflict.
> This file tunes agent behavior for Antigravity's multi-agent, mission-based workflow.

---

## 1. Before Any Mission

Always load these files before starting any task:
1. `CONTEXT.md` — business logic, order flow, pricing, lead sources
2. `ARCHITECTURE.md` — routing, file structure, tech stack
3. `SUPABASE.md` — DB schema, query patterns, RLS rules
4. `FRONTEND.md` — design system, colors, typography, components
5. `AGENTS.md` — coding rules, AI agent prompts

Do not start writing code until all 5 are loaded and understood.

---

## 2. Mission Scoping Rules

When assigned a mission:
- Decompose into subtasks BEFORE coding.
- Surface any ambiguity about business logic → ask operator before proceeding.
- Do not invent requirements. If unclear → ask.
- Complete one module fully (working UI + DB + error states) before starting next.
- Browser subagent must validate each route before marking mission complete.

---

## 3. Agent Parallelism Rules

Safe to run in parallel:
- Frontend components that don't share state
- Supabase table creation (separate tables)
- Static page scaffolding

Must run sequentially:
- DB schema → then RLS → then client code → then UI
- Agent 1 → Agent 2 → Agent 3 → Agent 4 (AI content pipeline always sequential)
- Any migration that modifies existing tables

---

## 4. Antigravity-Specific Coding Preferences

- Prefer **Vite** over CRA or Next.js (this is a SPA, not SSR).
- Use `import.meta.env` for env vars (Vite standard) — NOT `process.env`.
- Supabase client: singleton pattern in `src/lib/supabase.ts` — never re-instantiate.
- React Router: use `createBrowserRouter` (v6 data router API).
- Zustand stores: one store per module (`leadsStore`, `ordersStore`, `contentStore`).
- shadcn/ui components: always import from `@/components/ui/` path alias.

---

## 5. Browser Subagent Validation Checklist

For each page/route completed, browser subagent must verify:
- [ ] Page loads without console errors
- [ ] Empty state renders when no data
- [ ] Form submits and saves to Supabase
- [ ] Error state shows if Supabase call fails
- [ ] Loading state visible during async operations
- [ ] Navigation to/from page works
- [ ] Mobile viewport (375px) doesn't break layout critically

---

## 6. What NOT to Build (Scope Guard)

Do not build anything not in this list — scope creep wastes operator time.

**In scope (v1):**
- Lead CRUD + Kanban pipeline
- Order management + payment tracking
- Material checklist per order
- Cost tracker + monthly P&L
- Content calendar + post log
- AI agency 4-agent pipeline (manual screenshot input)
- Settings page (prices, airlines, material list)
- Dashboard summary

**Not in scope (v1):**
- WhatsApp integration
- Instagram/Facebook API
- Customer-facing portal
- Multi-user auth
- Email notifications
- Mobile app
- Payment gateway

If operator asks for out-of-scope feature mid-mission, flag it and log to `MAINTENANCE.md` under "Future Features" — do not implement.

---

## 7. File Creation Checklist

When creating a new component file:
```
src/components/[module]/ComponentName.tsx
```
- [ ] TypeScript types imported from `src/types/index.ts`
- [ ] Supabase calls via custom hook in `src/hooks/`
- [ ] Loading state handled
- [ ] Error state handled
- [ ] Empty state handled
- [ ] Tailwind classes only (no inline styles)
- [ ] Component exported as default

---

## 8. Commit After Each Milestone

Antigravity agents should commit working code at each of these points:
```
git commit -m "feat: scaffold project + install dependencies"
git commit -m "db: supabase schema + RLS + indexes"
git commit -m "feat: leads module — list, kanban, CRUD"
git commit -m "feat: orders module — detail, payments, materials"
git commit -m "feat: finance module — costs + P&L"
git commit -m "feat: content module — calendar + post log"
git commit -m "feat: agency module — 4-agent pipeline"
git commit -m "feat: dashboard — KPIs + summary widgets"
git commit -m "feat: settings page"
```
