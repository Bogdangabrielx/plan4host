-- plan4host: Security fixes for linter warnings
-- - Convert views to SECURITY INVOKER
-- - Enable RLS on public tables flagged by linter
-- - Add minimal RLS policies for account_sync_usage (insert/select by account members)

-- 1) Views → SECURITY INVOKER (Postgres 15+)
do $$
begin
  if to_regclass('public.v_account_effective_plan') is not null then
    execute 'alter view public.v_account_effective_plan set (security_invoker = on)';
  end if;
  if to_regclass('public.account_effective_plan') is not null then
    execute 'alter view public.account_effective_plan set (security_invoker = on)';
  end if;
end $$;

-- 2) Enable RLS on flagged tables (no-op if they don't exist)
do $$
begin
  if to_regclass('public.account_sync_policy') is not null then
    execute 'alter table public.account_sync_policy enable row level security';
  end if;
  if to_regclass('public.account_sync_events') is not null then
    execute 'alter table public.account_sync_events enable row level security';
  end if;
  if to_regclass('public.account_sync_usage') is not null then
    execute 'alter table public.account_sync_usage enable row level security';
  end if;
end $$;

-- 3) Minimal policies for account_sync_usage (insert/select by account members)
--    Safe for manual Sync Now via authenticated users. Cron uses service-role (bypasses RLS).
do $$
begin
  if to_regclass('public.account_sync_usage') is not null then
    -- INSERT policy
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='account_sync_usage' and policyname='p_account_sync_usage_insert_own'
    ) then
      execute $POLICY$
        create policy p_account_sync_usage_insert_own on public.account_sync_usage
        for insert to authenticated
        with check (
          exists (
            select 1 from public.account_users au
            where au.account_id = account_sync_usage.account_id
              and au.user_id = auth.uid()
          )
        )
      $POLICY$;
    end if;

    -- SELECT policy (optional but helpful)
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='account_sync_usage' and policyname='p_account_sync_usage_select_own'
    ) then
      execute $POLICY2$
        create policy p_account_sync_usage_select_own on public.account_sync_usage
        for select to authenticated
        using (
          exists (
            select 1 from public.account_users au
            where au.account_id = account_sync_usage.account_id
              and au.user_id = auth.uid()
          )
        )
      $POLICY2$;
    end if;
  end if;
end $$;
