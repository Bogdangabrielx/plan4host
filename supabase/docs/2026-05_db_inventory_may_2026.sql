-- ============================================================
-- PLAN4HOST
-- DATABASE INVENTORY — MAY 2026
-- File purpose:
--   Internal audit snapshot for the Supabase grants/Data API review.
--   This file is documentation + rerunnable audit SQL.
--
-- Context reviewed:
--   Supabase notice:
--   Starting May 30, 2026 for new projects, and October 30, 2026 for
--   existing projects, tables created in schema "public" must have
--   explicit GRANTs in order to be accessible through:
--     - supabase-js
--     - PostgREST (/rest/v1)
--     - GraphQL (/graphql/v1)
--
-- Important clarification:
--   This Supabase rollout is about GRANTs, not about RLS itself.
--   RLS remains a separate security topic.
--
-- Inventory status based on May 2026 review:
--   - Total public tables observed: 42
--   - Tables with explicit grants relevant to Data API access: 42 / 42
--   - Tables currently affected by the Supabase GRANT rollout: 0
--   - Notable separate observation:
--       public.form_documents had RLS disabled during this audit.
--       This is NOT the specific issue described in the Supabase notice,
--       but it remains relevant for broader security review.
--
-- Operational conclusion from this audit:
--   Existing Plan4Host tables do not appear to be blocked by the
--   upcoming Supabase GRANT rollout.
--   The main future risk is for NEW tables created in public without
--   explicit GRANT statements.
-- ============================================================

-- ------------------------------------------------------------
-- SECTION 1 — HUMAN-READABLE SNAPSHOT
-- ------------------------------------------------------------
select
  'DB INVENTORY — MAY 2026'::text as audit_name,
  'Supabase Data API grants review'::text as audit_scope,
  42::int as total_public_tables,
  42::int as tables_with_explicit_grants,
  0::int as tables_currently_affected_by_grant_rollout,
  'form_documents had RLS disabled during this audit; separate from the grants rollout topic'::text as note;

-- ------------------------------------------------------------
-- SECTION 2 — PUBLIC TABLE INVENTORY
-- Purpose:
--   List all tables in schema public and show whether RLS is enabled.
-- ------------------------------------------------------------
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

-- ------------------------------------------------------------
-- SECTION 3 — EXPLICIT TABLE GRANTS
-- Purpose:
--   Verify whether anon/authenticated/service_role already have
--   explicit grants on each public table.
--
-- Interpretation for the Supabase policy change:
--   If a future table appears here with "-" for all relevant roles,
--   it is a candidate to break Data API access after the rollout.
-- ------------------------------------------------------------
with public_tables as (
  select c.relname as table_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
),
grants_agg as (
  select
    table_name,
    grantee,
    string_agg(privilege_type, ', ' order by privilege_type) as privileges
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated', 'service_role')
  group by table_name, grantee
)
select
  t.table_name,
  coalesce(a.privileges, '-') as anon_grants,
  coalesce(au.privileges, '-') as authenticated_grants,
  coalesce(s.privileges, '-') as service_role_grants
from public_tables t
left join grants_agg a
  on a.table_name = t.table_name and a.grantee = 'anon'
left join grants_agg au
  on au.table_name = t.table_name and au.grantee = 'authenticated'
left join grants_agg s
  on s.table_name = t.table_name and s.grantee = 'service_role'
order by t.table_name;

-- ------------------------------------------------------------
-- SECTION 4 — RLS POLICIES
-- Purpose:
--   Inspect existing policies per table.
--   This section is useful for broader DB review, although it is NOT the
--   main criterion for the Supabase GRANT rollout.
-- ------------------------------------------------------------
select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- ------------------------------------------------------------
-- SECTION 5 — QUICK ROLLOUT CHECK
-- Purpose:
--   Produce a compact status summary focused on the Supabase grants change.
-- ------------------------------------------------------------
with public_tables as (
  select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
),
grants_agg as (
  select
    table_name,
    grantee,
    string_agg(privilege_type, ', ' order by privilege_type) as privileges
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated', 'service_role')
  group by table_name, grantee
)
select
  t.table_name,
  coalesce(a.privileges, '-') as anon_grants,
  coalesce(au.privileges, '-') as authenticated_grants,
  coalesce(s.privileges, '-') as service_role_grants,
  case
    when coalesce(a.privileges, '-') = '-'
      and coalesce(au.privileges, '-') = '-'
      and coalesce(s.privileges, '-') = '-'
      then 'AFFECTED_BY_GRANT_ROLLOUT'
    else 'NOT_AFFECTED_BY_GRANT_ROLLOUT'
  end as supabase_grant_rollout_status,
  case
    when t.rls_enabled then 'RLS_ENABLED'
    else 'RLS_DISABLED'
  end as rls_status
from public_tables t
left join grants_agg a
  on a.table_name = t.table_name and a.grantee = 'anon'
left join grants_agg au
  on au.table_name = t.table_name and au.grantee = 'authenticated'
left join grants_agg s
  on s.table_name = t.table_name and s.grantee = 'service_role'
order by t.table_name;

-- ------------------------------------------------------------
-- SECTION 6 — OPTIONAL COLUMN INVENTORY
-- Purpose:
--   Helpful if a future review needs table structure snapshots.
-- ------------------------------------------------------------
select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

-- ------------------------------------------------------------
-- SECTION 7 — OPTIONAL APPROX ROW COUNTS
-- Purpose:
--   Quick operational overview by table size.
-- ------------------------------------------------------------
select
  relname as table_name,
  n_live_tup::bigint as approx_rows
from pg_stat_user_tables
where schemaname = 'public'
order by relname;

-- ------------------------------------------------------------
-- SECTION 8 — FUTURE POLICY FOR NEW TABLES
-- Important:
--   For any NEW table created in public after the Supabase change,
--   explicit GRANTs must be part of the creation flow if the table
--   will be accessed through Data API clients.
--
-- Suggested base template for new public tables:
-- ------------------------------------------------------------

-- create table public.your_table (
--   id uuid primary key default gen_random_uuid()
-- );
--
-- grant select
--   on public.your_table
--   to anon;
--
-- grant select, insert, update, delete
--   on public.your_table
--   to authenticated;
--
-- grant select, insert, update, delete
--   on public.your_table
--   to service_role;
--
-- alter table public.your_table
--   enable row level security;
--
-- create policy "users can read their own rows"
--   on public.your_table
--   for select to authenticated
--   using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- SECTION 9 — AUDIT NOTES
-- ------------------------------------------------------------
-- May 2026 takeaway:
--   No existing public table currently appears blocked by the upcoming
--   Supabase explicit-GRANT requirement for Data API usage.
--
-- Follow-up rule for the team:
--   Every NEW table in public should be created with:
--     1. explicit GRANTs
--     2. RLS enablement if appropriate
--     3. matching policies
--
-- This file is intended as a reference baseline for future audits.
