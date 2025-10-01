-- push_subscriptions table for Web Push
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  account_id uuid null,
  property_id uuid null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  ua text null,
  os text null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_subscriptions' and policyname = 'ps_all_service'
  ) then
    create policy ps_all_service on public.push_subscriptions for all to service_role using (true) with check (true);
  end if;
end $$;

-- Optional: allow authenticated users to manage their own subscriptions
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_subscriptions' and policyname = 'ps_ins_own'
  ) then
    create policy ps_ins_own on public.push_subscriptions for insert to authenticated with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_subscriptions' and policyname = 'ps_sel_own'
  ) then
    create policy ps_sel_own on public.push_subscriptions for select to authenticated using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_subscriptions' and policyname = 'ps_del_own'
  ) then
    create policy ps_del_own on public.push_subscriptions for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

