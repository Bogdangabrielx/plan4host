-- plan4host — Simplify account_users RLS to avoid recursive policy evaluation
-- Context: Policies that referenced helper functions querying account_users
-- could recurse during RLS evaluation (stack depth exceeded). We keep a
-- minimal SELECT self policy and rely on service-role endpoints for admin Team operations.

alter table if exists public.account_users enable row level security;

do $$ begin
  for r in (
    select policyname from pg_policies
    where schemaname='public' and tablename='account_users'
  ) loop
    execute format('drop policy if exists %I on public.account_users;', r.policyname);
  end loop;
end $$;

-- Allow a user to read only their own membership rows
create policy p_au_select_self on public.account_users
  for select to authenticated
  using (account_users.user_id = auth.uid());

-- Note:
--  - Admin list/manage operations use service-role API and are not impacted by RLS.
--  - If in the future client-side writes are required, add narrowly-scoped policies
--    that do not self-reference account_users within their USING/WITH CHECK.

