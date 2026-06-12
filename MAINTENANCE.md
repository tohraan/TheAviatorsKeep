# MAINTENANCE.md — SkyFrame CRM
> Project setup, dev commands, deployment, and maintenance rules.
> Agents: follow setup order exactly.

---

## 1. Initial Setup

### Prerequisites
- Node.js 20+
- npm or pnpm
- Supabase account (free tier sufficient)
- Anthropic API key
- Vercel account (for deployment) OR run locally

### Step 1 — Clone and install
```bash
git init skyframe-crm
cd skyframe-crm
npm create vite@latest . -- --template react-ts
npm install
```

### Step 2 — Install dependencies
```bash
# Core
npm install @supabase/supabase-js
npm install react-router-dom
npm install zustand
npm install react-hook-form zod @hookform/resolvers
npm install date-fns

# UI
npm install tailwindcss postcss autoprefixer
npm install lucide-react
npm install recharts
npm install class-variance-authority clsx tailwind-merge

# shadcn/ui (run init then add components as needed)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input label select textarea badge dialog sheet tabs
```

### Step 3 — Environment setup
```bash
# Create .env.local in project root
touch .env.local
```

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_ANTHROPIC_API_KEY=your_anthropic_key_here
```

### Step 4 — Supabase setup
1. Create project at supabase.com
2. Run all SQL from `SUPABASE.md` in Supabase SQL editor (in order):
   - Tables
   - RLS policies
   - Indexes
   - Triggers
3. Create storage bucket `analytics-screenshots` (set to private)
4. Copy project URL and anon key to `.env.local`

### Step 5 — Run dev server
```bash
npm run dev
# Opens at http://localhost:5173
```

---

## 2. Dev Commands

```bash
npm run dev          # Start dev server with HMR
npm run build        # Production build → /dist
npm run preview      # Preview production build locally
npm run lint         # ESLint check
npx tsc --noEmit    # TypeScript type check (no build)
```

---

## 3. Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# First deploy
vercel

# Set env vars in Vercel dashboard or CLI:
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_ANTHROPIC_API_KEY

# Subsequent deploys
vercel --prod
```

**Or:** Connect GitHub repo to Vercel for auto-deploy on push.

---

## 4. Maintenance Rules for Agents

### Adding a new feature
1. Read `CONTEXT.md` — does feature align with business logic?
2. Read `ARCHITECTURE.md` — check routing + file structure.
3. If DB change needed — update `SUPABASE.md` schema + run migration in Supabase.
4. Create component in correct `/src/components/[module]/` folder.
5. Create page in `/src/pages/` if new route.
6. Add route to `App.tsx`.
7. Update Zustand store if new state needed.
8. Update `CONTEXT.md` if business logic changed.

### Modifying DB schema
- NEVER drop columns — add nullable columns or new tables.
- Run migrations in Supabase SQL editor.
- Update `SUPABASE.md` to reflect change.
- Update TypeScript types in `src/types/index.ts`.

### Updating AI agent prompts
- All agent prompts live in `src/lib/agents/` — one file per agent.
- Change prompt in file, test, then update `AGENTS.md` with summary of change.

---

## 5. Git Workflow

```bash
# Feature branch
git checkout -b feature/lead-kanban
# ... develop ...
git add .
git commit -m "feat: add kanban drag-drop for lead pipeline"
git push origin feature/lead-kanban

# Merge to main
git checkout main
git merge feature/lead-kanban
git push origin main
```

### Commit message format
```
feat:     new feature
fix:      bug fix
refactor: code change, no feature/fix
style:    UI/CSS only
db:       schema change
docs:     markdown file update
agent:    AI agent prompt change
```

---

## 6. TypeScript Types (source of truth)

```typescript
// src/types/index.ts — keep in sync with SUPABASE.md schema

export type LeadSource = 'facebook_marketplace' | 'facebook_page' | 'instagram' | 'other'
export type FunnelStage = 'inquiry' | 'contacted' | 'interested' | 'booking_paid' |
  'in_production' | 'ready_pending' | 'balance_paid' | 'shipping_paid' | 'delivered' |
  'cold' | 'lost'
export type Priority = 'low' | 'normal' | 'high' | 'urgent'
export type OrderStatus = 'pending' | 'booking_confirmed' | 'in_production' | 'ready' |
  'awaiting_shipping_payment' | 'shipped' | 'delivered' | 'cancelled'
export type Material = 'box_frame' | 'model_plane' | 'printout_plaque' |
  'frame_extension' | 'nail' | 'pvc_tape'
export type CostCategory = 'raw_materials' | 'consumables' | 'ad_spend' |
  'shipping_error' | 'waste' | 'miscellaneous'
export type PostPlatform = 'instagram' | 'facebook_page' | 'facebook_marketplace' | 'both'
export type PostStatus = 'planned' | 'drafted' | 'posted' | 'skipped'

export interface Lead {
  id: string
  created_at: string
  name: string
  phone?: string
  source: LeadSource
  source_ad?: string
  source_detail?: string
  plane_interest?: string
  frame_type?: 'standard' | 'custom'
  notes?: string
  funnel_stage: FunnelStage
  priority: Priority
  follow_up_date?: string
  follow_up_type?: string
  last_contacted_at?: string
  has_order: boolean
  order_id?: string
}

export interface Order {
  id: string
  created_at: string
  lead_id?: string
  frame_type: 'standard' | 'custom'
  airline: string
  plane_model?: string
  plaque_color?: string
  custom_notes?: string
  price_aed: number
  booking_paid: boolean
  booking_paid_at?: string
  balance_paid: boolean
  balance_paid_at?: string
  shipping_fee_aed?: number
  shipping_paid: boolean
  shipping_paid_at?: string
  order_status: OrderStatus
  courier?: string
  tracking_number?: string
}

export interface OrderMaterial {
  id: string
  order_id: string
  material: Material
  in_stock: boolean
  notes?: string
}

export interface Cost {
  id: string
  created_at: string
  date: string
  category: CostCategory
  amount_aed: number
  description?: string
  order_id?: string
  ad_platform?: string
}

export interface Post {
  id: string
  created_at: string
  date: string
  platform: PostPlatform
  content_type?: string
  caption?: string
  image_notes?: string
  boosted: boolean
  boost_budget_aed?: number
  status: PostStatus
  performance_notes?: string
}
```

---

## 7. .gitignore

```
node_modules/
dist/
.env.local
.env
*.local
.DS_Store
```
