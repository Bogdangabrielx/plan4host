# Plan4Host — Starea actuală SQL și planul țintă

Acest document sumarizează ce este implementat acum în DB (Supabase/Postgres) și unde vrem să ajungem. Servește ca referință pentru migrații, RLS și gating pe planuri/roluri.

## 1) Stare actuală (implementat)

- Identitate tenant pe proprietate
  - Cheie canonică: `properties.admin_id` (UUID către `accounts.id`).
  - Politici și cod actualizate gradual din `owner_id` → `admin_id`.

- Bootstrap tenant & trial (funcții + trigger)
  - `public.account_current_plan()` — planul curent pentru utilizatorul logat (din `accounts.plan`).
  - `public.account_access_mode()` — returnează `full` | `billing_only` | `suspended` (non-admin suspendat când plan ≠ premium).
  - `public.account_grant_trial(account_id, days)` — setează `plan='standard'` + `valid_until` + `trial_used` (opțional).
  - `public.handle_new_user()` + trigger `on_auth_user_created` pe `auth.users`:
    - pentru user normal (signup/OAuth): creează `accounts` + `account_users(admin)` + trial 7 zile;
    - pentru sub-user creat din Team (app_metadata.sub_user=true): NU creează tenant; doar API atașează membership la contul adminului.
  - Backfill rulat pentru utilizatori existenți.

- Membership & scopes
  - `account_users(role: 'admin'|'editor'|'viewer', scopes text[], disabled bool)`. Default: `editor` dacă nu e specificat.
  - Tokeni canonici de scope (UI mapează la titluri):
    - `calendar`, `guest_overview`, `property_setup`, `cleaning`, `channels`.

- Helperi RLS
  - `public.property_account_id(property_id)` → `admin_id` pentru proprietatea dată.
  - `public.is_account_member(account_id)` — membru activ în cont.
  - `public.account_has_scope(user_id, account_id, scope)` — admin are full; editor/viewer pe scope.
  - `public.account_can_read_scope(account_id, scope)`; `public.account_can_write_scope(account_id, scope)`.

- RLS — izolare pe tenant + rol/scope (primul val)
  - Inventar/Calendar:
    - `properties` — SELECT: membership; WRITE: `property_setup`.
    - `rooms`, `room_types` — SELECT: membership; WRITE: `property_setup`.
    - `bookings` — SELECT: `calendar`; WRITE: `calendar` (admin/editor).
    - `booking_check_values`, `booking_text_values` — legate la `bookings` cu aceleași reguli `calendar`.
  - Property Setup:
    - `room_detail_checks`, `room_detail_text_fields`, `calendar_settings` — SELECT: membership; WRITE: `property_setup`.
  - Cleaning:
    - `cleaning_task_defs` — SELECT: membership; WRITE: `property_setup` (permitem definirea checklist-ului pe Basic).
    - `cleaning_progress` — SELECT: `cleaning`; WRITE: `cleaning` + plan ∈ {standard,premium} (gating în policy, fără trigger).
  - Channels (iCal):
    - `ical_type_integrations`, `ical_unassigned_events`, `ical_uid_map` — SELECT: `channels`; WRITE: `channels`.
    - `ical_type_sync_logs` — join la `integrations`; SELECT/WRITE: `channels`.
  - Guests:
    - `checkin_forms`, `booking_contacts`, `booking_documents` — SELECT: `guest_overview`; WRITE: `guest_overview` (admin/editor).
  - Team (`account_users`):
    - SELECT self + SELECT admin.
    - INSERT/UPDATE/DELETE: doar admin și doar când `accounts.plan = 'premium'`. Ținte non-admin; nu-ți poți modifica propria membrie.

- Gating UI corespunzător
  - Team: disponibil doar pentru `admin` + `plan='premium'` (citit direct din `accounts.plan`).
  - Cleaning Board pe Basic: pagina vizibilă, dar UI nu mai încarcă date; DB blochează scrierile.
  - Endpoints și pagini care foloseau `owner_id` sau RPC `account_effective_plan_slug` au fost migrate la `admin_id` și la citire din `accounts.plan` unde a fost necesar (Team, Channels, iCal routes, /api/me).

## 2) Țintă (unde vrem să ajungem)

- Canonizare cheie tenant
  - `properties.admin_id` devine singura cheie folosită în cod/RLS.
  - Eliminăm complet referințele la `owner_id` în cod și migrații. Ulterior, `owner_id` poate fi drop-uit.

- Consistență scope tokens
  - UI afișează titluri prietenoase (Calendar, Guest Overview, Property Setup, Cleaning Board, Channels & iCal).
  - DB păstrează tokenii canonici: `calendar`, `guest_overview`, `property_setup`, `cleaning`, `channels`.

- Plan & gating
  - Surse unice: `accounts.plan` + `valid_until` (+ `account_current_plan()` pentru comoditate).
  - RLS finalizează matricea rol/scope pentru toate tabelele relevante (acoperite deja conform listei de mai sus).

- Team
  - Gating dublu: API (service role) validează plan; RLS blochează apelurile client.

- Curățare relicve
  - Eliminăm orice mențiune de `owner/manager/member`, `reservations`, `propertySetup`, `inbox` în migrații vechi sau docs.
  - Înlocuim cu `admin/editor/viewer`, `calendar`, `property_setup`, `guest_overview`.

## 3) Pași rămași / de făcut (checklist)

- [ ] Audit repo pentru referințe `owner_id` rămase și migrare la `admin_id` (API, cron, UI — parțial făcut pentru Channels/iCal/Team).
- [ ] Confirmare finală RLS pe toate tabelele secundare (ex. `ical_suppressions`, alte tabele auxiliare, dacă sunt folosite în UI).
- [ ] (Opțional) Drop `owner_id` după ce toate rutele UI/API sunt migrate și validate.
- [ ] (Opțional) Renunțare la RPC-uri vechi (ex. `account_effective_plan_slug`) dacă nu mai sunt folosite în UI; păstrăm pentru compat dacă există integrări.

## 4) Verificări rapide

- Tenant bootstrap (după signup/OAuth):
  ```sql
  select id, plan, valid_until from public.accounts order by created_at desc limit 5;
  select account_id, user_id, role, disabled from public.account_users order by created_at desc limit 5;
  ```

- Mod acces (UI redirects):
  ```sql
  select public.account_access_mode();
  ```

- RLS izolare (simulare):
  ```sql
  select set_config('request.jwt.claims', json_build_object('role','authenticated','sub','<USER_ID>')::text, true);
  select * from public.properties; -- arată doar proprietățile contului userului
  ```

- Gating Cleaning (Basic):
  ```sql
  -- presupunând că <PROP_ID> aparține unui cont 'basic'
  insert into public.cleaning_progress(property_id, room_id, clean_date, task_id, done)
  values ('<PROP_ID>','<ROOM_ID>', current_date, '<TASK_ID>', false);
  -- așteptat: ERROR (plan nu permite)
  ```

- Team (Premium-only):
  ```sql
  -- ca user autenticat non-admin sau plan != premium
  insert into public.account_users(account_id,user_id,role,scopes)
  values ('<ACC_ID>','<USER_ID>','viewer','{}');
  -- așteptat: ERROR
  ```

## 5) Referințe fișiere

- Migrații
  - `supabase/migrations/2025-09-13_tenant_bootstrap_and_access.sql`
    - Funcții: plan + access mode + onboarding + backfill + helperi RLS.
  - `supabase/migrations/2025-09-13_properties_account_id_mirror.sql`
    - (Istoric) Mirror `owner_id` → `account_id`; proiectul folosește acum `admin_id` ca cheie canonică.

- Documentație
  - `supabase/docs/plan_policies_overview.sql` — referință extinsă (planuri, RLS, API map).
  - `supabase/docs/rls_and_sql_audit.md` — checklist pentru audit RLS și snapshots.

---

Dacă vrei, pot adăuga și un script de „health check” SQL care să ruleze automat și să verifice toate punctele cheie (bootstrap, RLS, gating). Spune-mi dacă îl dorești inclus în docs.
