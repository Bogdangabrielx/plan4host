-- Public guest check-in form storage (per property)

create table if not exists public.guest_checkin_forms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  room_type_id uuid null references public.room_types(id) on delete set null,
  room_id uuid null references public.rooms(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text null,
  address text null,
  start_date date not null,
  end_date date not null,
  consent_regulation boolean not null default false,
  consent_gdpr boolean not null default false,
  source text not null default 'public_form',
  created_at timestamptz not null default now()
);

-- Optional RLS: enable but allow only service role to write; owners can read their own via policies (add later if needed).
do $$
begin
  begin
    alter table public.guest_checkin_forms enable row level security;
  exception when others then null; end;
end $$;

