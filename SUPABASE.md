# SUPABASE.md — SkyFrame CRM Backend
> All table schemas, relationships, RLS rules, and query patterns.
> Agents: match all DB operations exactly to this schema.

---

## 1. Database Schema

### Table: `leads`
```sql
create table leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),

  -- Identity
  name          text not null,
  phone         text,

  -- Attribution
  source        text not null check (source in ('facebook_marketplace', 'facebook_page', 'instagram', 'other')),
  source_ad     text,            -- which specific ad/post/listing they came from
  source_detail text,            -- any extra attribution note

  -- Interest
  plane_interest text,           -- which airline/model they want
  frame_type    text check (frame_type in ('standard', 'custom')),
  notes         text,

  -- Pipeline
  funnel_stage  text not null default 'inquiry'
                check (funnel_stage in (
                  'inquiry', 'contacted', 'interested',
                  'booking_paid', 'in_production',
                  'ready_pending', 'balance_paid',
                  'shipping_paid', 'delivered', 'cold', 'lost'
                )),
  priority      text default 'normal'
                check (priority in ('low', 'normal', 'high', 'urgent')),

  -- Follow-up
  follow_up_date date,
  follow_up_type text check (follow_up_type in (
                  'hot_gone_cold', 'price_ghost', 'unread',
                  'post_delivery', 'general'
                )),
  last_contacted_at timestamptz,

  -- Link
  has_order     boolean default false,
  order_id      uuid references orders(id) on delete set null
);
```

### Table: `lead_notes`
```sql
create table lead_notes (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid references leads(id) on delete cascade,
  created_at timestamptz default now(),
  note       text not null,
  type       text default 'general' check (type in ('general', 'whatsapp', 'call', 'system'))
);
```

### Table: `orders`
```sql
create table orders (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  lead_id       uuid references leads(id) on delete set null,

  -- Product
  frame_type    text not null check (frame_type in ('standard', 'custom')),
  airline       text not null,
  plane_model   text,
  plaque_color  text,
  custom_notes  text,

  -- Pricing
  price_aed     numeric(8,2) not null,  -- 249 or 300 or custom

  -- Payments
  booking_paid      boolean default false,
  booking_paid_at   timestamptz,
  balance_paid      boolean default false,
  balance_paid_at   timestamptz,
  shipping_fee_aed  numeric(8,2),
  shipping_paid     boolean default false,
  shipping_paid_at  timestamptz,

  -- Status
  order_status  text not null default 'pending'
                check (order_status in (
                  'pending', 'booking_confirmed', 'in_production',
                  'ready', 'awaiting_shipping_payment',
                  'shipped', 'delivered', 'cancelled'
                )),
  shipped_at    timestamptz,
  delivered_at  timestamptz,
  courier       text,
  tracking_number text,

  -- Production timeline
  production_started_at timestamptz,
  production_completed_at timestamptz
);
```

### Table: `order_materials`
```sql
create table order_materials (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references orders(id) on delete cascade,
  material    text not null check (material in (
                'box_frame', 'model_plane', 'printout_plaque',
                'frame_extension', 'nail', 'pvc_tape'
              )),
  in_stock    boolean default true,
  notes       text
);
```

### Table: `costs`
```sql
create table costs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  date        date not null default current_date,
  category    text not null check (category in (
                'raw_materials', 'consumables', 'ad_spend',
                'shipping_error', 'waste', 'miscellaneous'
              )),
  amount_aed  numeric(8,2) not null,
  description text,
  order_id    uuid references orders(id) on delete set null,  -- optional link
  ad_platform text check (ad_platform in (
                'facebook_marketplace', 'facebook_page', 'instagram', null
              ))
);
```

### Table: `posts`
```sql
create table posts (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  date          date not null,
  platform      text not null check (platform in ('instagram', 'facebook_page', 'facebook_marketplace', 'both')),
  content_type  text check (content_type in ('carousel', 'single_image', 'reel', 'story', 'listing')),
  caption       text,
  image_notes   text,           -- describe the AI image used
  boosted       boolean default false,
  boost_budget_aed numeric(8,2),
  boost_platform text,
  status        text default 'planned' check (status in ('planned', 'drafted', 'posted', 'skipped')),
  performance_notes text        -- manually entered insights
);
```

### Table: `analytics_sessions`
```sql
create table analytics_sessions (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  session_label text,           -- e.g. "IG insights week of June 1"
  platform      text check (platform in ('instagram', 'facebook_page', 'facebook_marketplace', 'boosted_ad')),
  raw_context   text,           -- operator's typed context about the screenshot
  agent_output  jsonb,          -- full multi-agent response stored as JSON
  action_items  text[],         -- extracted action steps array
  content_ideas text[]          -- extracted content ideas array
);
```

### Table: `settings`
```sql
create table settings (
  key   text primary key,
  value text not null
);
```

---

## 2. Row Level Security (RLS)

All tables: enable RLS. Single user auth — policy = user is authenticated.

```sql
-- Enable RLS on all tables
alter table leads enable row level security;
alter table lead_notes enable row level security;
alter table orders enable row level security;
alter table order_materials enable row level security;
alter table costs enable row level security;
alter table posts enable row level security;
alter table analytics_sessions enable row level security;
alter table settings enable row level security;

-- Single-user policy template (apply to each table)
create policy "Authenticated user full access"
  on leads for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
-- Repeat for each table (leads, lead_notes, orders, order_materials, costs, posts, analytics_sessions, settings).
```

---

## 3. Indexes

```sql
create index idx_leads_funnel_stage on leads(funnel_stage);
create index idx_leads_follow_up_date on leads(follow_up_date);
create index idx_orders_status on orders(order_status);
create index idx_orders_lead_id on orders(lead_id);
create index idx_costs_date on costs(date);
create index idx_costs_category on costs(category);
create index idx_posts_date on posts(date);
create index idx_posts_status on posts(status);
```

---

## 4. Triggers (auto-update `updated_at`)

```sql
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_updated_at before update on leads
  for each row execute function update_updated_at();

create trigger orders_updated_at before update on orders
  for each row execute function update_updated_at();
```

---

## 5. Supabase Client Setup

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

---

## 6. Query Patterns

**Leads with follow-up due today:**
```typescript
const { data } = await supabase
  .from('leads')
  .select('*')
  .lte('follow_up_date', new Date().toISOString().split('T')[0])
  .not('funnel_stage', 'in', '("delivered","lost")')
  .order('priority', { ascending: false })
```

**Order with materials + lead:**
```typescript
const { data } = await supabase
  .from('orders')
  .select(`*, lead:leads(*), materials:order_materials(*)`)
  .eq('id', orderId)
  .single()
```

**Monthly P&L:**
```typescript
// Revenue = sum of (booking + balance + shipping) for delivered orders this month
// Costs = sum of costs table for this month
```

**Orders with missing materials (bottleneck):**
```typescript
const { data } = await supabase
  .from('order_materials')
  .select('*, order:orders(*)')
  .eq('in_stock', false)
```

---

## 7. Storage Buckets

```
analytics-screenshots/   ← uploaded insight screenshots per session
```

```typescript
// Upload screenshot
const { data } = await supabase.storage
  .from('analytics-screenshots')
  .upload(`${sessionId}/${Date.now()}.png`, file)
```

---

## 8. Rules for Agents

- NEVER use `select *` in production queries — always specify columns or use explicit joins.
- ALWAYS handle Supabase errors: `if (error) throw error`.
- NEVER store AED amounts as strings — always `numeric(8,2)`.
- All timestamps stored as `timestamptz` (UTC). Display converted to GST (UTC+4) in UI.
- `order_materials` rows auto-created when order is created (one row per material type).
