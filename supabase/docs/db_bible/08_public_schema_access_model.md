# Public Schema Access Model

Status:
- inventariere de access model pornită din snapshot-ul `MAY 2026`
- bazată pe grants, RLS flags și număr de policies
- document de referință, nu migration

Query sursă:

```sql
with public_tables as (
  select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced
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
),
policy_counts as (
  select
    tablename as table_name,
    count(*)::int as policy_count
  from pg_policies
  where schemaname = 'public'
  group by tablename
)
select
  t.table_name,
  t.rls_enabled,
  t.rls_forced,
  coalesce(a.privileges, '-') as anon_grants,
  coalesce(au.privileges, '-') as authenticated_grants,
  coalesce(s.privileges, '-') as service_role_grants,
  coalesce(p.policy_count, 0) as policy_count
from public_tables t
left join grants_agg a
  on a.table_name = t.table_name and a.grantee = 'anon'
left join grants_agg au
  on au.table_name = t.table_name and au.grantee = 'authenticated'
left join grants_agg s
  on s.table_name = t.table_name and s.grantee = 'service_role'
left join policy_counts p
  on p.table_name = t.table_name
order by t.table_name;
```

## High-Level Summary

Din snapshot:
- `42` tabele în `public`
- `41` cu `RLS enabled = true`
- `1` cu `RLS enabled = false`
- `0` cu `rls_forced = true`

Pe grants:
- aproape toate tabelele au grants foarte largi pentru:
  - `anon`
  - `authenticated`
  - `service_role`
- excepția clară este `accounts`
- excepția parțială este `geo_countries`

Pe tema rollout-ului Supabase despre `GRANT`:
- toate tabelele existente din snapshot au grants relevante deja prezente
- deci modelul actual nu arată ca scenariul “tabel existent fără grants explicite”

## Grant Pattern

### Dominant pattern
Pe majoritatea tabelelor:
- `anon_grants = DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE`
- `authenticated_grants = DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE`
- `service_role_grants = DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE`

Interpretare:
- grants-urile sunt largi
- controlul real al accesului pare să fie lăsat în principal pe:
  - `RLS`
  - `policies`
  - funcțiile helper de acces

### `accounts`
Pattern special:
- `anon = -`
- `authenticated = SELECT`
- `service_role = full`

Interpretare:
- `accounts` este mult mai restrâns decât restul
- este una dintre puținele tabele unde grants-urile par intenționat mai controlate

### `geo_countries`
Pattern special:
- `anon = REFERENCES, SELECT, TRIGGER, TRUNCATE`
- `authenticated = REFERENCES, SELECT, TRIGGER, TRUNCATE`
- `service_role = full`

Interpretare:
- comportament de tabel de referință publică / semi-publică
- nu are write grants pentru `anon`/`authenticated`

## RLS Coverage

### RLS enabled
Tabelele cu `RLS = true` sunt practic toată schema operațională:
- accounts / membership / onboarding / usage
- billing
- bookings / booking data
- forms / checkin
- cleaning
- iCal
- templates / reservation messages
- push

### RLS disabled
Singurul tabel din snapshot:
- `form_documents`

Interpretare:
- este un outlier clar în modelul de acces
- în acest snapshot, `form_documents` nu se bazează pe RLS

## Policy Count Overview

### Tabele cu policies numeroase
Acestea par să aibă model de acces mai bogat și mai nuanțat:
- `booking_contacts` -> `6`
- `booking_documents` -> `6`
- `bookings` -> `5`
- `booking_check_values` -> `4`
- `booking_text_values` -> `4`
- `checkin_forms` -> `4`
- `properties` -> `4`
- `push_subscriptions` -> `4`

Interpretare:
- sunt zone unde accesul este diferențiat mai fin pe read/write/scope

### Tabele cu policies moderate
Exemple:
- `account_billing_profiles` -> `3`
- `account_onboarding_state` -> `3`
- `form_bookings` -> `3`
- `cleaning_marks` -> `3`
- multe altele -> `2`

Interpretare:
- model de acces prezent, dar mai simplu

### Tabele cu o singură policy
Exemple:
- `account_users`
- `accounts`
- `billing_plans`
- `checkin_consents`
- `email_outbox`

Interpretare:
- fie sunt tabele cu rol foarte simplu
- fie accesul real este concentrat într-o singură regulă puternică

### Tabele cu `policy_count = 0`
Observate:
- `account_login_activity`
- `account_sync_events`
- `form_documents`
- `ical_suppressions`
- `stripe_events_processed`

Interpretare:
- aici trebuie făcută o separare clară:
  - `form_documents` are `RLS disabled`, deci nu are policies și nici nu se bazează pe ele
  - celelalte au `RLS enabled`, dar `0 policies`

În practică, pentru tabelele cu:
- `RLS enabled = true`
- `policy_count = 0`

accesul prin roluri supuse RLS nu va curge “normal” doar din grants; grants există, dar RLS rămâne poarta principală.

## Access Model By Domain

### Accounts / Membership / Onboarding

Tabele:
- `accounts`
- `account_users`
- `account_billing_profiles`
- `account_login_activity`
- `account_onboarding_events`
- `account_onboarding_state`
- `account_sync_events`
- `account_sync_usage`

Pattern:
- grants aproape complet deschise pe majoritatea
- `accounts` este excepția cea mai restrictivă
- RLS este activ aproape peste tot
- câteva tabele de log/usage au `0 policies`

### Billing

Tabele:
- `billing_invoices`
- `billing_plans`
- `stripe_events_processed`

Pattern:
- grants largi
- RLS activ
- `stripe_events_processed` apare cu `0 policies`
- `billing_plans` pare mai simplu ca model, cu o singură policy

### Bookings / Guest Overview

Tabele:
- `bookings`
- `booking_contacts`
- `booking_documents`
- `booking_text_values`
- `booking_check_values`
- `checkin_forms`
- `checkin_consents`
- `form_bookings`
- `form_documents`

Pattern:
- aici se vede cel mai mult că accesul real este modelat prin policies
- `bookings`, `booking_contacts`, `booking_documents` au policy counts ridicate
- `form_documents` iese în evidență ca excepție cu `RLS disabled`

### Properties / Rooms / Cleaning

Tabele:
- `properties`
- `rooms`
- `room_types`
- `room_detail_checks`
- `room_detail_text_fields`
- `room_variable_definitions`
- `room_variables`
- `calendar_settings`
- `cleaning_marks`
- `cleaning_progress`
- `cleaning_task_defs`

Pattern:
- grants largi
- RLS activ
- policies prezente aproape peste tot

### Channels / iCal

Tabele:
- `ical_suppressions`
- `ical_type_integrations`
- `ical_type_sync_logs`
- `ical_uid_map`
- `ical_unassigned_events`

Pattern:
- grants largi
- RLS activ
- toate au policies, cu excepția `ical_suppressions`

### Push / Messaging

Tabele:
- `push_subscriptions`
- `reservation_messages`
- `reservation_template_blocks`
- `reservation_template_fields`
- `reservation_templates`

Pattern:
- grants largi
- RLS activ
- policies prezente și relativ consistente

## Outliers Worth Remembering

### 1. `form_documents`
- `RLS enabled = false`
- `policy_count = 0`
- grants largi pe toate rolurile relevante

Este cel mai clar outlier din schema `public`.

### 2. `accounts`
- singurul tabel care iese clar din tiparul “full grants peste tot”
- `anon` nu are grant
- `authenticated` are doar `SELECT`

### 3. `geo_countries`
- are model de grants de tip lookup/reference

### 4. Tabele cu `RLS enabled = true` dar `policy_count = 0`
- `account_login_activity`
- `account_sync_events`
- `ical_suppressions`
- `stripe_events_processed`

Acestea merită ținute minte ca pattern separat.

## Supabase Rollout Note

Strict raportat la schimbarea Supabase despre `GRANT` pentru Data API:
- snapshot-ul arată că tabelele existente au deja grants relevante
- nu apare scenariul clasic:
  - tabel din `public`
  - folosit prin Data API
  - fără grants explicite

Concluzie de snapshot:
- riscul de afectare prin lipsă de grants pare să fie pentru tabele noi viitoare, nu pentru inventarul curent

## Practical Notes

- când analizăm “de ce nu vede userul datele”, ordinea bună de gândire este:
  1. are grant?
  2. are RLS activ?
  3. există policies?
  4. funcțiile helper de access (`account_can_read_scope`, `is_account_member`, etc.) permit cazul?

- când analizăm tabelele actuale pentru compatibilitate cu Supabase Data API:
  - grants există deja
  - deci întrebarea principală nu este “lipsește grant?”, ci “cum interacționează grants cu RLS/policies?”

## Recommended Follow-Up Documents

După acest capitol, ar fi utile încă două:
- `09_public_schema_policy_catalog.md`
  Un catalog pe fiecare policy, grupată pe tabel

- `10_public_schema_known_notes.md`
  Pentru outliers, observații, posibile redundanțe și puncte de audit viitoare
