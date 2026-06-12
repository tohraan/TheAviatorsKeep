-- ==========================================
-- SKYFRAME CRM DATABASE SCHEMA
-- ==========================================

-- 1. Create Orders Table (without lead_id FK first)
create table orders (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  lead_id       uuid, -- Will reference leads(id) once leads table exists

  -- Product details
  frame_type    text not null check (frame_type in ('standard', 'custom')),
  airline       text not null,
  plane_model   text,
  plaque_color  text,
  custom_notes  text,

  -- Pricing (Stored in AED as numeric)
  price_aed     numeric(8,2) not null,

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

-- 2. Create Leads Table (referencing orders)
create table leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),

  -- Identity
  name          text not null,
  phone         text,

  -- Attribution
  source        text not null check (source in ('facebook_marketplace', 'facebook_page', 'instagram', 'other')),
  source_ad     text,            -- Specific ad/post/listing identification
  source_detail text,            -- Extra notes on lead source

  -- Interest
  plane_interest text,           -- Airline or plane model customer is interested in
  frame_type    text check (frame_type in ('standard', 'custom')),
  notes         text,

  -- Pipeline stages
  funnel_stage  text not null default 'inquiry'
                check (funnel_stage in (
                  'inquiry', 'contacted', 'interested',
                  'booking_paid', 'in_production',
                  'ready_pending', 'balance_paid',
                  'shipping_paid', 'delivered', 'cold', 'lost'
                )),
  priority      text default 'normal'
                check (priority in ('low', 'normal', 'high', 'urgent')),

  -- Follow-up schedule
  follow_up_date date,
  follow_up_type text check (follow_up_type in (
                  'hot_gone_cold', 'price_ghost', 'unread',
                  'post_delivery', 'general'
                )),
  last_contacted_at timestamptz,

  -- Order association
  has_order     boolean default false,
  order_id      uuid references orders(id) on delete set null
);

-- Add the lead_id constraint to orders now that leads exists
alter table orders 
  add constraint fk_orders_lead_id 
  foreign key (lead_id) references leads(id) on delete set null;

-- 3. Create Lead Notes Table
create table lead_notes (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid references leads(id) on delete cascade,
  created_at timestamptz default now(),
  note       text not null,
  type       text default 'general' check (type in ('general', 'whatsapp', 'call', 'system'))
);

-- 4. Create Order Materials Checklist Table
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

-- 5. Create Financial Costs Table
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
  order_id    uuid references orders(id) on delete set null,  -- Optional linkage
  ad_platform text check (ad_platform in (
                'facebook_marketplace', 'facebook_page', 'instagram', null
              ))
);

-- 6. Create Content Calendar Posts Table
create table posts (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  date          date not null,
  platform      text not null check (platform in ('instagram', 'facebook_page', 'facebook_marketplace', 'both')),
  content_type  text check (content_type in ('carousel', 'single_image', 'reel', 'story', 'listing')),
  caption       text,
  image_notes   text,           -- Describes AI-generated prompts/images used
  boosted       boolean default false,
  boost_budget_aed numeric(8,2),
  boost_platform text,
  status        text default 'planned' check (status in ('planned', 'drafted', 'posted', 'skipped')),
  performance_notes text        -- Performance stats or insights
);

-- 7. Create AI Analytics Sessions Table
create table analytics_sessions (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  session_label text,
  platform      text check (platform in ('instagram', 'facebook_page', 'facebook_marketplace', 'boosted_ad')),
  raw_context   text,           -- Insights provided by operator
  agent_output  jsonb,          -- Multi-agent response payloads stored in JSON
  action_items  text[],         -- Extracted array of actions
  content_ideas text[]          -- Extracted array of copy/visual ideas
);

-- 8. Create Settings Table (key-value store for app configs)
create table settings (
  key           text primary key,
  value         text not null
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

alter table orders enable row level security;
alter table leads enable row level security;
alter table lead_notes enable row level security;
alter table order_materials enable row level security;
alter table costs enable row level security;
alter table posts enable row level security;
alter table analytics_sessions enable row level security;
alter table settings enable row level security;

-- Policies for Authenticated User Full Access
create policy "Authenticated user full access on orders" on orders for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated user full access on leads" on leads for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated user full access on lead_notes" on lead_notes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated user full access on order_materials" on order_materials for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated user full access on costs" on costs for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated user full access on posts" on posts for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated user full access on analytics_sessions" on analytics_sessions for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated user full access on settings" on settings for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ==========================================
-- DATABASE INDEXES
-- ==========================================

create index idx_leads_funnel_stage on leads(funnel_stage);
create index idx_leads_follow_up_date on leads(follow_up_date);
create index idx_orders_status on orders(order_status);
create index idx_orders_lead_id on orders(lead_id);
create index idx_costs_date on costs(date);
create index idx_costs_category on costs(category);
create index idx_posts_date on posts(date);
create index idx_posts_status on posts(status);

-- ==========================================
-- AUTOMATIC UPDATED_AT TRIGGERS
-- ==========================================

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
