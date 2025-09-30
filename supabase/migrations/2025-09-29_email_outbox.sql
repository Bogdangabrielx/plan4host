-- Email outbox table to record sent reservation messages
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null,
  property_id uuid,
  to_email text,
  subject text,
  html text,
  status text not null check (status in ('pending','sent','error')),
  error_message text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- Optional indexes
create index if not exists email_outbox_booking_idx on public.email_outbox(booking_id);
create index if not exists email_outbox_created_idx on public.email_outbox(created_at);

-- RLS: allow service role to manage; deny by default to authenticated
alter table public.email_outbox enable row level security;
do $$ begin
  perform 1 from pg_policies where schemaname='public' and tablename='email_outbox' and policyname='eo_all_service';
  if not found then
    create policy eo_all_service on public.email_outbox for all to service_role using (true) with check (true);
  end if;
end $$;

