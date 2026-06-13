-- ============================================================
-- SkyFrame CRM — Units Per Frame Migration
-- Run this in Supabase SQL Editor if you already ran inventory_migration.sql
-- ============================================================

-- Add units_per_frame column (how many of this item are needed for ONE completed frame)
alter table inventory add column if not exists units_per_frame integer not null default 1;

-- Set the correct per-frame consumption rates
update inventory set units_per_frame = 3 where item_key = 'nail_and_drill';
update inventory set units_per_frame = 2 where item_key = 'nail_drill_process';

-- All other items default to 1 (already set by the default above)
