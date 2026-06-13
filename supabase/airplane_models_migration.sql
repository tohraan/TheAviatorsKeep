-- ============================================================
-- SkyFrame CRM — Airplane Model Stock Migration
-- Run this AFTER inventory_migration.sql
-- ============================================================

-- Tracks specific airplane models in stock (per airline + aircraft type)
create table if not exists airplane_model_stock (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  airline    text not null,       -- e.g. Emirates, Etihad, Qatar
  model      text not null,       -- e.g. A380, B777, A350
  quantity   integer not null default 0,
  notes      text,
  unique(airline, model)          -- one row per airline+model combo
);

-- Auto-update trigger
drop trigger if exists airplane_model_stock_updated_at on airplane_model_stock;
create trigger airplane_model_stock_updated_at before update on airplane_model_stock
  for each row execute function update_updated_at();

-- RLS
alter table airplane_model_stock enable row level security;

create policy "Authenticated full access" on airplane_model_stock for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Index
create index if not exists idx_airplane_model_stock_airline on airplane_model_stock(airline);
