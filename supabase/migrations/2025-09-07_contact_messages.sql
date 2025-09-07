-- Contact messages log table
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  message text not null,
  user_agent text null,
  ip text null
);

-- RLS: enable and allow inserts from anon (no read by default)
alter table public.contact_messages enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='contact_messages' and policyname='p_contact_messages_insert_public'
  ) then
    create policy p_contact_messages_insert_public on public.contact_messages
      for insert
      with check (true);
  end if;
end $$;

create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);

