-- checkin_consents — store acknowledgements/consents related to check-in
create table if not exists public.checkin_consents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid null references public.properties(id) on delete set null,
  booking_id uuid null references public.bookings(id) on delete set null,
  email text null,
  purpose text not null check (purpose in ('privacy_ack','house_rules_ack')),
  granted boolean not null default true,
  text_version text null,
  text_hash text null,
  ip inet null,
  ua text null,
  created_at timestamptz not null default now()
);

alter table public.checkin_consents enable row level security;

-- Service role full access for server-side inserts
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'checkin_consents' and policyname = 'cc_all_service'
  ) then
    create policy cc_all_service on public.checkin_consents for all to service_role using (true) with check (true);
  end if;
end $$;

