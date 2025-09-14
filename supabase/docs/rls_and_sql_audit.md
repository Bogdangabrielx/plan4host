# Plan4Host — RLS and SQL Audit Workbook

This document is a practical checklist + query pack you can paste into the SQL editor (or `psql`) to capture a complete snapshot of Row‑Level Security and important SQL objects (policies, triggers, functions, constraints, grants). Use it to debug RLS errors and to document the current DB state.

Tip: For a full dump you can also run Supabase CLI or `pg_dump` (see the last section), but these focused queries are faster to read and share.

---

## 0) Environment & How To Run

- Supabase SQL Editor: paste blocks below and run.
- `psql`: connect and paste blocks. Optional: `\x on` for expanded output.

```sql
-- Optional: pretty on
SET client_min_messages TO WARNING;
\x on
```

---

## 1) Tables With RLS and Their Policies

List all RLS-enabled tables in `public` and policies attached to them.

```sql
-- a) Tables with RLS enabled
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public'
   AND c.relkind = 'r'
   AND c.relrowsecurity = true
 ORDER BY 1;

-- b) Policies per table (USING / WITH CHECK)
SELECT schemaname,
       tablename,
       policyname,
       cmd,
       roles,
       pg_get_expr(qual,  polrelid)  AS using_expr,
       pg_get_expr(withcheck, polrelid) AS check_expr
  FROM pg_policies
 WHERE schemaname = 'public'
 ORDER BY tablename, policyname;
```

Focus tables that affect the app:

```sql
-- Bookings policies (INSERT/UPDATE/DELETE/SELECT)
SELECT policyname, cmd, roles,
       pg_get_expr(qual,  polrelid)  AS using_expr,
       pg_get_expr(withcheck, polrelid) AS check_expr
  FROM pg_policies
 WHERE schemaname='public' AND tablename='bookings'
 ORDER BY cmd, policyname;

-- Cleaning definitions and progress (if present)
SELECT * FROM pg_policies WHERE schemaname='public' AND tablename IN ('cleaning_task_defs','cleaning_progress') ORDER BY tablename, policyname;
```

If you see legacy roles like `owner/manager/member` in `using_expr` or `check_expr`, update them to the new `admin/editor/viewer` model.

---

## 2) Account & Plan Helpers (RPC/Functions)

These helpers drive plan gating in API/UI. Verify they exist and are what you expect.

```sql
-- Function definitions (if any are missing, adjust gating in API/UI)
SELECT proname, pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND proname IN (
     'account_effective_plan_slug',
     'account_current_plan',
     'account_access_mode',
     'account_set_plan',
     'account_set_plan_self'
   )
 ORDER BY proname;
```

Current plan resolution (should reflect `account_plan.plan_slug` when present):

```sql
-- Effective plan for a given account
SELECT public.account_effective_plan_slug('<ACCOUNT_ID>');

-- Current plan for the logged-in user (if function is defined that way)
SELECT public.account_current_plan();
```

---

## 3) Triggers That Gate Writes (Plan/Features)

Team/Cleaning triggers are expected to block writes on lower tiers.

```sql
SELECT event_object_table   AS table_name,
       trigger_name,
       action_timing,
       event_manipulation
  FROM information_schema.triggers
 WHERE trigger_schema='public'
   AND trigger_name IN ('trg_enforce_team_plan','trg_enforce_cleaning_plan')
 ORDER BY event_object_table, trigger_name;

-- Full trigger function source (if custom)
SELECT proname, pg_get_functiondef(p.oid)
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname='public'
   AND proname IN ('enforce_team_plan')
 ORDER BY proname;
```

---

## 4) Membership Model (Role/Scopes/Disabled)

Check `account_users` contents and constraints to ensure mapping to `admin/editor/viewer` and scopes.

```sql
-- Sample rows
SELECT account_id, user_id, role, scopes, disabled, created_at
  FROM public.account_users
 ORDER BY account_id, created_at;

-- Role check constraint and defaults
SELECT conname, pg_get_constraintdef(c.oid) AS def
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
 WHERE t.relname = 'account_users'
 ORDER BY conname;
```

---

## 5) Grants and Access (Table Privileges)

Ensure `authenticated`/`anon` don’t have unexpected privileges that bypass RLS.

```sql
SELECT table_schema, table_name, grantee, privilege_type, is_grantable
  FROM information_schema.role_table_grants
 WHERE table_schema='public'
 ORDER BY table_name, grantee, privilege_type;
```

---

## 6) Quick RLS Simulation (Troubleshooting)

Use this to reproduce UI errors in SQL and learn which policy fails.

```sql
-- 1) Simulate the auth JWT (adjust sub to your user.id)
SELECT set_config(
  'request.jwt.claims',
  json_build_object('role','authenticated','sub','<USER_ID>')::text,
  true
);

-- 2) Try the exact write the client makes (INSERT/UPDATE/DELETE)
INSERT INTO public.bookings (property_id, room_id, start_date, end_date, status, source)
VALUES ('<PROPERTY_ID>','<ROOM_ID>','2025-01-10','2025-01-11','confirmed','manual');

-- 3) Inspect error details (RLS USING/WITH CHECK failure)
-- If it fails here too, it’s a policy/trigger mismatch, not client-side.
```

Common reasons for a `bookings` RLS failure:
- `account_users.role` is `viewer` (no write); needs `admin` or `editor` with the right scope (e.g., `calendar`).
- `disabled=true` for the member.
- Policies still reference legacy roles (`owner/manager/member`) or the join uses `properties.owner_id` while schema uses `properties.admin_id`.
- `property_id` doesn’t belong to the member’s account (admin_id).

Note on account_users recursion:
- Avoid policies on `account_users` that call helper functions reading from `account_users` again (RLS can recurse and cause `stack depth exceeded`).
- Recommended minimal policy: `SELECT` only on self (user_id = auth.uid()); perform admin list/manage via service-role.

---

## 7) Billing/Plans Catalog (handy checks)

```sql
-- Billing plans catalog
SELECT slug, name, description, sync_interval_minutes, allow_sync_now, features
  FROM public.billing_plans
 ORDER BY lower(slug);

-- Account plan slots
SELECT * FROM public.account_plan ORDER BY updated_at DESC NULLS LAST LIMIT 50;

-- Accounts (minimal info)
SELECT id, plan, valid_until, trial_used, created_at
  FROM public.accounts
 ORDER BY created_at;
```

---

## 8) Full Dumps (if you need everything verbatim)

CLI options:

```bash
# Supabase CLI (local dev)
supabase db dump -f supabase_dump.sql --local

# Or pg_dump (adjust connection and schema)
pg_dump \
  --schema=public \
  --no-owner --no-privileges \
  -Fc -f supabase_public.dump \
  "$DATABASE_URL"
```

For quick browsing, you can also dump just policy DDLs:

```sql
SELECT format(
  'CREATE POLICY %I ON %I.%I FOR %s TO %s USING (%s)%s;',
  policyname, schemaname, tablename, cmd,
  array_to_string(roles, ','),
  coalesce(pg_get_expr(qual, polrelid),'TRUE'),
  CASE WHEN withcheck IS NULL THEN ''
       ELSE ' WITH CHECK ('||pg_get_expr(withcheck, polrelid)||')' END
) AS policy_ddl
FROM pg_policies
WHERE schemaname='public'
ORDER BY tablename, policyname;
```

---

## 9) Notes / Paste Findings Here

- Paste the outputs relevant to your failure (bookings INSERT, member row, policy text) and annotate what failed.
