alter table public.account_sync_usage enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'account_sync_usage'
      and policyname = 'asu_ins'
  ) then
    execute $policy$
      create policy asu_ins
      on public.account_sync_usage
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.account_users au
          where au.account_id = account_sync_usage.account_id
            and au.user_id = auth.uid()
        )
      )
    $policy$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'account_sync_usage'
      and policyname = 'asu_sel'
  ) then
    execute $policy$
      create policy asu_sel
      on public.account_sync_usage
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.account_users au
          where au.account_id = account_sync_usage.account_id
            and au.user_id = auth.uid()
        )
      )
    $policy$;
  end if;
end
$$;
