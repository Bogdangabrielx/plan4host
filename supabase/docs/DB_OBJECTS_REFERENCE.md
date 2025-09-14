# Plan4Host — Referință Obiecte DB (funcții, RLS, triggere, RPC, tabele)

Ultima actualizare: 2025‑09‑13

Acest document descrie obiectele principale din schema `public` (și `auth` acolo unde e cazul), modelul de izolare pe tenant, regulile de acces (RLS) și fluxurile de onboarding/trial. Este un companion practic pentru debugging și evoluții ulterioare.

## 0) Decizii de model (canonice)
- Cheie tenant: `properties.admin_id` (UUID → `accounts.id`). Nu folosim `owner_id`.
- Planuri: sursa unică este `accounts.plan` (+ `valid_until`, `trial_ends_at`).
- Roluri: `admin | editor | viewer`; scope‑uri canonice: `calendar`, `guest_overview`, `property_setup`, `cleaning`, `channels`.
- Sub‑useri (Team): rând doar în `account_users` (NU au tenant propriu în `accounts`).

## 1) Funcții principale (public)
- `account_current_plan() -> text`
  - Planul curent pentru utilizatorul logat (derivat din `accounts.plan`).
- `account_access_mode() -> text`
  - Returnează `full | billing_only | suspended` în funcție de rol, plan și expirare.
- `account_grant_trial(p_account_id uuid, p_days int default 7)`
  - Setează plan=standard și ajustează `valid_until` și `trial_ends_at` cu +N zile. Marchează `trial_used` când coloana există.
- `handle_new_user() RETURNS trigger` (apelată din `auth.users`)
  - Onboarding admin: creează `accounts(id=new.id)`, rând admin în `account_users` și acordă trial 7 zile.
  - Skip pentru sub‑useri: dacă `raw_app_meta_data` sau `raw_user_meta_data` conțin `sub_user=true`.
- `property_account_id(p_property_id uuid) -> uuid`
  - Returnează `admin_id` pentru proprietatea dată; folosit în RLS.
- `is_account_member(p_account_id uuid) -> boolean`
  - Testează membership activ (auth.uid) în contul dat.
- `account_has_scope(p_user_id uuid, p_account_id uuid, p_scope text) -> boolean`
  - `admin` are full; altfel scope explicit.
- `account_can_read_scope(p_account_id uuid, p_scope text) -> boolean`
- `account_can_write_scope(p_account_id uuid, p_scope text) -> boolean`
  - Scriere permisă doar `admin` sau `editor` cu scope.
- iCal/sync:
  - `account_can_sync_now_v2(p_account_id uuid, p_event_type text) -> jsonb`
  - `account_register_sync_usage_v2(p_account_id uuid, p_event_type text) -> void`

## 2) Tabele cheie
- `accounts(id, plan, valid_until, trial_ends_at, created_at, …)`
- `account_users(account_id, user_id, role, scopes[], disabled, created_at)`
- `billing_plans(slug, sync_interval_minutes, allow_sync_now, features, …)`
- Inventar: `properties(admin_id, name, …)`, `rooms(property_id, …)`, `room_types(property_id, …)`
- Calendar: `bookings(property_id, …)`, `booking_check_values`, `booking_text_values`
- Property Setup: `room_detail_checks`, `room_detail_text_fields`, `calendar_settings`
- Cleaning: `cleaning_task_defs`, `cleaning_progress`
- iCal/Channels: `ical_type_integrations`, `ical_unassigned_events`, `ical_uid_map`, `ical_type_sync_logs`
- Guests: `checkin_forms`, `booking_contacts`, `booking_documents`

## 3) RLS (izolare pe tenant + rol/scope)
- Principii:
  - SELECT minim pe membership (`is_account_member()` sau prin join la `properties.admin_id`).
  - WRITE pe scope: `account_can_write_scope()`.
  - Cleaning write: plan ∈ {standard, premium} (policy dedicată pe `cleaning_progress`).

- Izolare de bază (membership):
  - `properties` — SELECT: member; WRITE: `property_setup`.
  - `rooms`, `room_types` — SELECT: member; WRITE: `property_setup`.
  - `bookings` — SELECT: `calendar`; WRITE: `calendar` (admin/editor cu scope).
  - `booking_check_values`, `booking_text_values` — la fel ca bookings.

- Property Setup:
  - `room_detail_checks`, `room_detail_text_fields`, `calendar_settings` — SELECT: member; WRITE: `property_setup`.

- Cleaning:
  - `cleaning_task_defs` — SELECT: member; WRITE: `property_setup` (definirea checklistului permisă și pe Basic).
  - `cleaning_progress` — SELECT: `cleaning`; WRITE: `cleaning` + plan ∈ {standard, premium} (policy p_cp_write_scope_plan).

- Channels:
  - `ical_type_integrations`, `ical_unassigned_events`, `ical_uid_map` — SELECT: `channels`; WRITE: `channels`.
  - `ical_type_sync_logs` — join la `integrations` → `property_id`; SELECT/WRITE: `channels`.

- Guests (Guest Overview):
  - `checkin_forms`, `booking_contacts`, `booking_documents` — SELECT/WRITE pe `guest_overview`.

- Team:
  - `account_users` — Simplificat pentru a evita recursivitatea: policy minimă `SELECT self`.
    Operațiile de listare/gestionare pentru admin se fac prin API cu service‑role (bypass RLS).
    Dacă în viitor permiți scrieri din client, adaugă politici strict locale care NU citesc din `account_users` în USING/WITH CHECK.

## 4) Triggere active
- `auth.users` → `public.handle_new_user()` (AFTER INSERT)
  - Creează tenant + admin + trial pentru user nou (signup/OAuth), sare pentru sub_users.
- (Nu folosim triggere custom pentru Team sau Cleaning; gatingul e în RLS).

## 5) RPC / Endpoints (server)
- Convenabile UI:
  - `account_current_plan()`
  - iCal: `account_can_sync_now_v2`, `account_register_sync_usage_v2`
  - Proprietăți: `create_property(...)`, `account_delete_property_self(property_id)`
- Restul endpointurilor sunt în App Router (Next.js) și folosesc Supabase client cu RLS.

## 6) Query-uri utile
- Plan și trial:
```sql
select id, plan, valid_until, trial_ends_at from public.accounts where id = '<ACC>';
```
- Membership (pentru un user):
```sql
select account_id, role, scopes, disabled from public.account_users where user_id = '<USER>' order by created_at;
```
- Simulare RLS pentru un user (în sesiunea curentă):
```sql
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub','<USER>')::text, true);
select * from public.properties limit 5;
```

## 7) Changelog (scurt)
- 2025‑09‑13
  - Eliminat `public.account_plan` și funcțiile derivate; consolidat pe `accounts.plan`.
  - Adăugat `accounts.trial_ends_at` și actualizat `account_grant_trial()`.
  - Canonizat `properties.admin_id` ca legătură de tenant; RLS/endpointuri actualizate.
  - Onboarding sub_user: triggerul (handle_new_user) nu creează tenant pentru Team.
  - Cleaning/Team gating prin RLS, fără triggere dedicate.
  - Simplificat RLS pe `account_users`: numai `SELECT self`; Team admin rulează prin service-role.

---
Acest document se sincronizează cu `supabase/docs/plan_policies_overview.sql`. Pentru un audit complet (politici/expr), folosește și `supabase/docs/rls_and_sql_audit.md`.
