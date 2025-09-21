-- Reservation Message schema (templates, fields, messages)
-- Assumes properties(id, admin_id) and account_users(account_id,user_id,role,disabled) exist.

create table if not exists public.reservation_templates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  status text not null check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id)
);

create table if not exists public.reservation_template_blocks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  template_id uuid not null references public.reservation_templates(id) on delete cascade,
  sort_index integer not null,
  type text not null check (type in ('heading','paragraph','divider')),
  text text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rmtb_template on public.reservation_template_blocks(template_id, sort_index);

create table if not exists public.reservation_template_fields (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  template_id uuid not null references public.reservation_templates(id) on delete cascade,
  sort_index integer not null,
  key text not null,
  label text not null,
  required boolean not null default false,
  multiline boolean not null default false,
  placeholder text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(template_id, key)
);

create index if not exists idx_rmtf_template on public.reservation_template_fields(template_id, sort_index);

create table if not exists public.reservation_messages (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  token text not null unique,
  status text not null default 'active' check (status in ('active','revoked','expired')),
  manual_values jsonb not null default '{}'::jsonb,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, booking_id)
);

alter table public.reservation_templates enable row level security;
alter table public.reservation_template_blocks enable row level security;
alter table public.reservation_template_fields enable row level security;
alter table public.reservation_messages enable row level security;

-- Helpers for RLS
-- member of account owning property
create policy rm_templates_select on public.reservation_templates
  for select using (
    exists (
      select 1
      from public.properties p
      join public.account_users au on au.account_id = p.admin_id
      where p.id = reservation_templates.property_id
        and au.user_id = auth.uid()
        and coalesce(au.disabled,false) = false
    )
  );

create policy rm_templates_modify on public.reservation_templates
  for all using (
    exists (
      select 1
      from public.properties p
      join public.account_users au on au.account_id = p.admin_id
      where p.id = reservation_templates.property_id
        and au.user_id = auth.uid()
        and au.role = 'admin'
        and coalesce(au.disabled,false) = false
    )
  ) with check (
    exists (
      select 1
      from public.properties p
      join public.account_users au on au.account_id = p.admin_id
      where p.id = reservation_templates.property_id
        and au.user_id = auth.uid()
        and au.role = 'admin'
        and coalesce(au.disabled,false) = false
    )
  );

create policy rm_blocks_select on public.reservation_template_blocks
  for select using (
    exists (
      select 1
      from public.properties p
      join public.account_users au on au.account_id = p.admin_id
      where p.id = reservation_template_blocks.property_id
        and au.user_id = auth.uid()
        and coalesce(au.disabled,false) = false
    )
  );

create policy rm_blocks_modify on public.reservation_template_blocks
  for all using (
    exists (
      select 1 from public.properties p
      join public.account_users au on au.account_id = p.admin_id
      where p.id = reservation_template_blocks.property_id
        and au.user_id = auth.uid()
        and au.role = 'admin'
        and coalesce(au.disabled,false) = false
    )
  ) with check (
    exists (
      select 1 from public.properties p
      join public.account_users au on au.account_id = p.admin_id
      where p.id = reservation_template_blocks.property_id
        and au.user_id = auth.uid()
        and au.role = 'admin'
        and coalesce(au.disabled,false) = false
    )
  );

create policy rm_fields_select on public.reservation_template_fields
  for select using (
    exists (
      select 1 from public.properties p
      join public.account_users au on au.account_id = p.admin_id
      where p.id = reservation_template_fields.property_id
        and au.user_id = auth.uid()
        and coalesce(au.disabled,false) = false
    )
  );

create policy rm_fields_modify on public.reservation_template_fields
  for all using (
    exists (
      select 1 from public.properties p
      join public.account_users au on au.account_id = p.admin_id
      where p.id = reservation_template_fields.property_id
        and au.user_id = auth.uid()
        and au.role = 'admin'
        and coalesce(au.disabled,false) = false
    )
  ) with check (
    exists (
      select 1 from public.properties p
      join public.account_users au on au.account_id = p.admin_id
      where p.id = reservation_template_fields.property_id
        and au.user_id = auth.uid()
        and au.role = 'admin'
        and coalesce(au.disabled,false) = false
    )
  );

create policy rm_messages_select on public.reservation_messages
  for select using (
    exists (
      select 1 from public.properties p
      join public.account_users au on au.account_id = p.admin_id
      where p.id = reservation_messages.property_id
        and au.user_id = auth.uid()
        and coalesce(au.disabled,false) = false
    )
  );

create policy rm_messages_modify on public.reservation_messages
  for all using (
    exists (
      select 1 from public.properties p
      join public.account_users au on au.account_id = p.admin_id
      where p.id = reservation_messages.property_id
        and au.user_id = auth.uid()
        and au.role = 'admin'
        and coalesce(au.disabled,false) = false
    )
  ) with check (
    exists (
      select 1 from public.properties p
      join public.account_users au on au.account_id = p.admin_id
      where p.id = reservation_messages.property_id
        and au.user_id = auth.uid()
        and au.role = 'admin'
        and coalesce(au.disabled,false) = false
    )
  );

