-- Allow multiple templates per property and add a title field

-- 1) Drop old unique constraint (single template per property)
alter table public.reservation_templates
  drop constraint if exists reservation_templates_property_id_key;

-- 2) Add title column (non-null, default empty). Keep status as-is (draft/published)
alter table public.reservation_templates
  add column if not exists title text not null default '';

-- 3) Helpful indexes
create index if not exists idx_rm_templates_property on public.reservation_templates(property_id, updated_at desc);

