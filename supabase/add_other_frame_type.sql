-- ============================================================
-- SkyFrame CRM — Add "other" frame type
-- Paste into Supabase SQL Editor and run.
-- ============================================================

-- 1. Drop existing constraints
alter table leads drop constraint if exists leads_frame_type_check;
alter table orders drop constraint if exists orders_frame_type_check;

-- 2. Add new constraints allowing 'other'
alter table leads add constraint leads_frame_type_check 
  check (frame_type in ('standard', 'custom', 'other'));

alter table orders add constraint orders_frame_type_check 
  check (frame_type in ('standard', 'custom', 'other'));
