-- ============================================================
-- SkyFrame CRM — Inventory Module Migration
-- Paste into Supabase SQL Editor and run.
-- ============================================================

-- 1. Inventory table (current stock levels)
create table if not exists inventory (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  item_key       text not null unique,
  item_name      text not null,
  unit           text not null default 'pcs',
  quantity       integer not null default 0,
<br>  -- How many of this item are consumed per completed frame (default 1)
  units_per_frame integer not null default 1,
<br>  min_threshold  integer not null default 5,
  cost_per_unit  numeric(8,2),
  is_outsourced  boolean not null default false,
  notes          text
);

-- 2. Inventory log (history of every stock change)
create table if not exists inventory_log (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  item_id    uuid references inventory(id) on delete cascade,
  item_key   text not null,
  change     integer not null,  -- positive = added, negative = used/removed
  reason     text,              -- 'restock' | 'order_used' | 'correction'
  note       text
);

-- 3. Auto-update trigger for inventory.updated_at
drop trigger if exists inventory_updated_at on inventory;
create trigger inventory_updated_at before update on inventory
  for each row execute function update_updated_at();

-- 4. RLS
alter table inventory enable row level security;
alter table inventory_log enable row level security;

create policy "Authenticated full access" on inventory for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated full access" on inventory_log for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 5. Indexes
create index if not exists idx_inventory_log_item_id on inventory_log(item_id);
create index if not exists idx_inventory_log_created_at on inventory_log(created_at desc);

-- 6. Seed the 11 required inventory items
--    units_per_frame = how many of this item are needed per completed frame
insert into inventory (item_key, item_name, unit, quantity, units_per_frame, min_threshold, is_outsourced, notes) values
  ('box_frame',          'Box Frame',                 'pcs',    0, 1, 5,  false, 'Main shadow box frame shell'),
  ('airplane_model',     'Airplane Model (20cm)',      'pcs',    0, 1, 5,  false, 'Die-cast 20cm model plane'),
  ('printout_plaque',    'Printout of Plaque',         'pcs',    0, 1, 5,  false, 'Printed airline plaque insert'),
  ('nail_drill_process', 'Nail in Drill (Outsourced)', 'units',  0, 2, 6,  true,  'Outsourced drilling — 2 drills per frame'),
  ('frame_extension',    'Frame Extension',            'pcs',    0, 1, 5,  false, 'Extension bracket for box frame'),
  ('nail_and_drill',     'Nail & Drill',               'nails',  0, 3, 15, false, '3 nails per frame'),
  ('pvc_tape',           'PVC Tape',                   'rolls',  0, 1, 3,  false, 'PVC sealing tape'),
  ('delivery_box',       'Delivery Box',               'pcs',    0, 1, 5,  false, 'Outer shipping carton'),
  ('bubble_wrap',        'Bubble Wrap',                'sheets', 0, 1, 10, false, 'Protective bubble wrap sheets'),
  ('fragile_sticker',    'Fragile Wrap / Sticker',     'pcs',    0, 1, 10, false, 'Fragile warning stickers/wrap'),
  ('delivery_label',     'Delivery Label',             'pcs',    0, 1, 10, false, 'Shipping address label')
on conflict (item_key) do update set
  item_name       = excluded.item_name,
  unit            = excluded.unit,
  units_per_frame = excluded.units_per_frame,
  min_threshold   = excluded.min_threshold,
  is_outsourced   = excluded.is_outsourced,
  notes           = excluded.notes;
