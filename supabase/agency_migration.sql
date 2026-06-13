-- Migration for SkyFrame Media Agency
-- Contains all tables, RLS policies, indexes, triggers, and bucket configurations for the agency branch.
-- This does NOT touch any ERP tables.

-- 1. Table: agency_sops
create table agency_sops (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  agent_name   text not null unique check (agent_name in (
                 'cmo', 'content_manager', 'reel_agent',
                 'carousel_agent', 'fb_post_agent',
                 'paid_media_manager', 'ad_analyst', 'ad_copywriter'
               )),
  role         text not null,
  brand_context text not null,
  kpi          text not null,
  content_pillars text[],
  tone_guidelines text not null,
  platform_rules text,
  what_good_looks_like text,
  never_do     text[],
  output_format text not null,   -- JSON schema description
  full_sop     text not null,    -- complete compiled SOP text sent to agent
  version      integer default 1
);

-- 2. Table: agency_content_sessions
create table agency_content_sessions (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  session_label   text,                    -- operator names the session
  week_of         date,                    -- week this session covers
  text_context    text,                    -- operator typed context
  screenshot_urls text[],                  -- Supabase storage URLs
  history_context text,                    -- auto-loaded from last 3 sessions

  -- Agent outputs (stored as JSONB)
  cmo_output              jsonb,
  content_manager_output  jsonb,
  reel_output             jsonb,
  carousel_output         jsonb,
  fb_post_output          jsonb,

  -- Status
  status          text default 'running' check (status in (
                    'running', 'complete', 'failed', 'partial'
                  )),
  completed_at    timestamptz
);

-- 3. Table: agency_content_log
create table agency_content_log (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  session_id      uuid references agency_content_sessions(id) on delete cascade,

  content_type    text not null check (content_type in (
                    'reel', 'carousel', 'fb_post'
                  )),
  platform        text not null check (platform in (
                    'instagram', 'facebook_page', 'both'
                  )),
  content_pillar  text,
  hook            text,
  body            text,
  cta             text,
  hashtags        text[],
  image_direction text,          -- description of image to use
  scheduled_date  date,
  status          text default 'draft' check (status in (
                    'draft', 'approved', 'posted', 'skipped'
                  )),
  performance_notes text          -- added manually after posting
);

-- 4. Table: agency_calendar
create table agency_calendar (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  session_id      uuid references agency_content_sessions(id) on delete cascade,
  content_log_id  uuid references agency_content_log(id) on delete set null,

  scheduled_date  date not null,
  day_of_week     text,
  platform        text not null,
  content_type    text not null,
  boosted         boolean default false,
  boost_budget_aed numeric(8,2),
  status          text default 'planned' check (status in (
                    'planned', 'drafted', 'posted', 'skipped'
                  )),
  notes           text
);

-- 5. Table: agency_ads_sessions
create table agency_ads_sessions (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  session_label   text,
  period_start    date,
  period_end      date,
  text_context    text,
  screenshot_urls text[],

  -- Agent outputs
  ad_analyst_output       jsonb,
  paid_media_manager_output jsonb,
  ad_copywriter_output    jsonb,

  -- Final recommendations
  budget_recommendation_aed numeric(8,2),
  recommended_daily_budget  numeric(8,2),
  roas_current    numeric(6,2),
  roas_target     numeric(6,2),
  cpo_current     numeric(8,2),
  cpo_target      numeric(8,2),

  status          text default 'running' check (status in (
                    'running', 'complete', 'failed'
                  )),
  completed_at    timestamptz
);

-- 6. Table: agency_ad_copy_log
create table agency_ad_copy_log (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  session_id      uuid references agency_ads_sessions(id) on delete cascade,

  version_number  integer default 1,
  hook            text not null,
  body            text not null,
  cta             text not null,
  target_audience text,
  placement       text check (placement in (
                    'feed', 'story', 'reel', 'all'
                  )),
  rationale       text,          -- why copywriter made these choices
  status          text default 'draft' check (status in (
                    'draft', 'approved', 'live', 'retired'
                  )),
  result_notes    text           -- filled in manually after running ad
);

-- 7. RLS Policies
-- Enable RLS on all agency tables
alter table agency_sops enable row level security;
alter table agency_content_sessions enable row level security;
alter table agency_content_log enable row level security;
alter table agency_calendar enable row level security;
alter table agency_ads_sessions enable row level security;
alter table agency_ad_copy_log enable row level security;

-- Single authenticated user policy (apply to each table)
create policy "Auth user full access" on agency_sops
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Auth user full access" on agency_content_sessions
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Auth user full access" on agency_content_log
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Auth user full access" on agency_calendar
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Auth user full access" on agency_ads_sessions
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Auth user full access" on agency_ad_copy_log
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- 8. Indexes
create index idx_agency_content_sessions_week on agency_content_sessions(week_of);
create index idx_agency_content_log_session on agency_content_log(session_id);
create index idx_agency_content_log_status on agency_content_log(status);
create index idx_agency_content_log_date on agency_content_log(scheduled_date);
create index idx_agency_calendar_date on agency_calendar(scheduled_date);
create index idx_agency_ads_sessions_created on agency_ads_sessions(created_at);
create index idx_agency_ad_copy_status on agency_ad_copy_log(status);

-- 9. Triggers
-- Assumes update_updated_at() function already exists from ERP
create trigger agency_sops_updated_at before update on agency_sops
  for each row execute function update_updated_at();

-- 10. Storage Bucket
insert into storage.buckets (id, name, public)
values ('agency-uploads', 'agency-uploads', false);
