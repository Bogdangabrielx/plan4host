# Public Schema Policy Catalog

Status:
- inventariere de policies pornită din snapshot-ul `MAY 2026`
- bazată pe `pg_policies`
- document de referință, nu migration

Query sursă:

```sql
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
```

## High-Level Pattern

Din snapshot se văd câteva familii clare de policies:

1. `self access`
- pe baza `account_id = auth.uid()` sau `user_id = auth.uid()`

2. `membership access`
- pe baza `is_account_member(...)`

3. `scope-based access`
- pe baza:
  - `account_can_read_scope(...)`
  - `account_can_write_scope(...)`
  - `property_account_id(...)`

4. `account_users join access`
- verificări cu `exists (...) from account_users`

5. `service-only access`
- policies de tip `ALL` pentru `service_role`

6. `public-read/reference`
- pentru lookup/reference sau pentru unele zone tratate cu `roles = {public}`

## Policy Patterns By Area

### Self Policies

#### `account_billing_profiles`
- `abp_select_self`
  - `SELECT`
  - `authenticated`
  - `qual: account_id = auth.uid()`

- `abp_insert_self`
  - `INSERT`
  - `authenticated`
  - `with_check: account_id = auth.uid()`

- `abp_update_self`
  - `UPDATE`
  - `authenticated`
  - `qual + with_check: account_id = auth.uid()`

#### `account_onboarding_events`
- `aoe_self_select`
- `aoe_self_insert`

Pattern:
- onboarding events sunt vizibile și inserabile doar pe propriul account

#### `account_onboarding_state`
- `aos_self_select`
- `aos_self_insert`
- `aos_self_update`

Pattern:
- model similar cu onboarding events, dar completat și cu update

#### `push_subscriptions`
- `ps_sel_own`
  - `auth.uid() = user_id`
- `ps_ins_own`
  - `with_check: auth.uid() = user_id`
- `ps_del_own`
  - `auth.uid() = user_id`

Pattern:
- subscription-urile push sunt controlate strict per user

### Membership-Based Policies

#### `accounts`
- `p_accounts_select_member`
  - `SELECT`
  - `authenticated`
  - `qual: is_account_member(id)`

#### `calendar_settings`
- `p_cals_select`
  - `SELECT`
  - `qual: is_account_member(property_account_id(property_id))`

#### `cleaning_task_defs`
- `p_ctd_select`
  - `SELECT`
  - `qual: is_account_member(property_account_id(property_id))`

#### `room_detail_checks`
- `p_rdc_select`

#### `room_detail_text_fields`
- `p_rdt_select`

#### `room_types`
- `p_roomtypes_select_own`

#### `rooms`
- `p_rooms_select_own`

Pattern:
- read access în zonele de setup / structură este adesea bazat pe membership de account

### Scope-Based Policies

Acesta este cel mai important pattern din schema voastră.

#### Calendar scope

`bookings`
- `p_bookings_select_scope`
  - `account_can_read_scope(property_account_id(property_id), 'calendar')`
- `p_bookings_insert_scope`
  - `with_check: account_can_write_scope(property_account_id(property_id), 'calendar')`
- `p_bookings_update_scope`
  - `qual + with_check: account_can_write_scope(...)`
- `p_bookings_delete_scope`
  - `qual: account_can_write_scope(...)`

`booking_check_values`
- select/write prin booking -> property -> `calendar`

`booking_text_values`
- select/write prin booking -> property -> `calendar`

Pattern:
- toate datele auxiliare de booking moștenesc scope-ul din booking-ul părinte

#### Guest overview scope

`booking_contacts`
- select și write prin:
  - booking -> property -> `guest_overview`

`booking_documents`
- select și write prin:
  - booking -> property -> `guest_overview`

`checkin_forms`
- select și write direct pe:
  - `account_can_read_scope(property_account_id(property_id), 'guest_overview')`
  - `account_can_write_scope(...)`

Pattern:
- zona guest/contact/documents e foarte clar separată de calendar

#### Property setup scope

`properties`
- `p_properties_write_scope`

`calendar_settings`
- `p_cals_write`

`cleaning_task_defs`
- `p_ctd_write`

`room_detail_checks`
- `p_rdc_write`

`room_detail_text_fields`
- `p_rdt_write`

`room_types`
- `p_roomtypes_write_scope`

`rooms`
- `p_rooms_write_scope`

Pattern:
- aproape toată configurația structurală a proprietății se bazează pe `property_setup`

#### Cleaning scope

`cleaning_progress`
- `p_cp_select`
  - `account_can_read_scope(..., 'cleaning')`
- `p_cp_write_scope_plan`
  - `account_can_write_scope(..., 'cleaning')`
  - plus verificare de plan `standard/premium`

`cleaning_marks`
- policies separate, nu doar helper de scope
- dar semantic tot din zona cleaning fac parte

Pattern:
- cleaning are logică proprie și chiar gating pe plan

#### Channels scope

`ical_type_integrations`
- `p_iti_select`
- `p_iti_write`

`ical_type_sync_logs`
- `p_itl_select`
- `p_itl_write`

`ical_uid_map`
- `p_ium_select`
- `p_ium_write`

`ical_unassigned_events`
- `p_iue_select`
- `p_iue_write`

Pattern:
- toată zona iCal/channels este bine standardizată pe scope-ul `channels`

### `account_users` Join Policies

Acest pattern apare în mai multe locuri unde membership-ul sau rolul trebuie verificat mai explicit.

#### `account_sync_usage`
- `asu_sel`
- `asu_ins`
- verifică existența în `account_users`

#### `form_bookings`
- `p_fb_select_access`
- `p_fb_update_access`
- `p_fb_delete_access`
- verifică explicit:
  - `account_users.account_id = property_account_id(...)`
  - `auth.uid()`
  - `disabled = false`
  - `role = admin` sau anumite scopes

Pattern:
- `form_bookings` are un model de access mai explicit și mai “manual” decât multe alte tabele

### Service Role Policies

#### `billing_invoices`
- `bi_all_service`
  - `ALL`
  - `service_role`
  - `qual = true`
  - `with_check = true`

#### `checkin_consents`
- `cc_all_service`

#### `email_outbox`
- `eo_all_service`

#### `push_subscriptions`
- `ps_all_service`

Pattern:
- unele tabele au o cale clară de acces complet pentru automatizări/backend intern

### Public / Reference Policies

#### `billing_plans`
- `bp_select_public`
  - `SELECT`
  - `roles = {public}`
  - `qual = true`

#### `geo_countries`
- `p_geo_countries_select_anon`
- `p_geo_countries_select_auth`

Pattern:
- tabele de catalog / lookup

## Public Policies On Operational Tables

În snapshot apar și politici cu `roles = {public}` pe tabele operaționale.

### `bookings`
- `p_bookings_select_calendar_cleaning`

### `cleaning_marks`
- `p_cm_select`
- `p_cm_write_ins`
- `p_cm_write_upd`

### `reservation_messages`
- `rm_messages_select`
- `rm_messages_modify`

### `reservation_template_blocks`
- `rm_blocks_select`
- `rm_blocks_modify`

### `reservation_template_fields`
- `rm_fields_select`
- `rm_fields_modify`

### `reservation_templates`
- `rm_templates_select`
- `rm_templates_modify`

### `room_variable_definitions`
- `rvd_select`
- `rvd_modify`

### `room_variables`
- `room_vars_select`
- `room_vars_modify`

Interpretare:
- chiar dacă rolul este `public`, expresiile din `qual` folosesc tot `auth.uid()` și membership/scopes
- deci modelul real rămâne dependent de user autentificat și de apartenență
- pentru citire rapidă, e util să tratăm aceste policies ca “operational access via public role semantics”, nu ca acces anonim deschis

## Table-By-Table Summary

### Accounts / Onboarding / Membership
- `account_billing_profiles`
  - self read/insert/update
- `account_onboarding_events`
  - self read/insert
- `account_onboarding_state`
  - self read/insert/update
- `account_sync_usage`
  - membership-based select/insert
- `account_users`
  - self select only
- `accounts`
  - member select only

### Billing
- `billing_invoices`
  - service all
  - authenticated own select
- `billing_plans`
  - public select

### Booking Family
- `bookings`
  - select read scope
  - write scope on calendar
  - extra select policy for calendar/cleaning visibility
- `booking_check_values`
  - calendar scope via booking
- `booking_text_values`
  - calendar scope via booking
- `booking_contacts`
  - guest_overview scope via booking
- `booking_documents`
  - guest_overview scope via booking

### Forms / Check-in
- `checkin_forms`
  - guest_overview scope
- `checkin_consents`
  - service all
- `form_bookings`
  - explicit account_users-based access

### Cleaning
- `cleaning_marks`
  - public-role policies with auth/membership/plan checks
- `cleaning_progress`
  - cleaning scope + plan gate
- `cleaning_task_defs`
  - member select + property_setup write

### Properties / Rooms / Setup
- `properties`
  - self insert
  - member select
  - property_setup write
- `room_detail_checks`
  - member select + property_setup write
- `room_detail_text_fields`
  - member select + property_setup write
- `room_types`
  - member select + property_setup write
- `rooms`
  - member select + property_setup write
- `room_variable_definitions`
  - public-role select/modify gated by auth/admin
- `room_variables`
  - public-role select/modify gated by auth/admin

### Channels / iCal
- `ical_type_integrations`
  - channels read/write
- `ical_type_sync_logs`
  - channels read/write through integration
- `ical_uid_map`
  - channels read/write
- `ical_unassigned_events`
  - channels read/write

### Messaging / Push
- `push_subscriptions`
  - service all
  - own select/insert/delete
- `reservation_messages`
  - public-role select/modify gated by auth/admin
- `reservation_template_blocks`
  - public-role select/modify gated by auth/admin
- `reservation_template_fields`
  - public-role select/modify gated by auth/admin
- `reservation_templates`
  - public-role select/modify gated by auth/admin

## Policies That Stand Out

### Plan-gated policies
- `p_cm_write_ins`
- `p_cm_write_upd`
- `p_cp_write_scope_plan`

Acestea nu verifică doar membership/scope, ci și planul account-ului.

### Self-only policies
- `abp_*`
- `aos_*`
- `aoe_*`
- `ps_*`

Acestea sunt cele mai simple și mai curate ca model mental.

### Function-heavy policies
Multe dintre politicile centrale depind de:
- `property_account_id(...)`
- `account_can_read_scope(...)`
- `account_can_write_scope(...)`
- `is_account_member(...)`

Asta confirmă foarte bine ce am notat deja în capitolul de funcții.

## Missing Policy Tables

Din snapshot-ul de policy catalog lipsesc tabelele care aveau `policy_count = 0`, de exemplu:
- `account_login_activity`
- `account_sync_events`
- `form_documents`
- `ical_suppressions`
- `stripe_events_processed`

Acestea trebuie citite împreună cu:
- `08_public_schema_access_model.md`

## Practical Notes

- când vrei să înțelegi rapid de ce un ecran vede sau nu vede date:
  1. găsești tabelul aici
  2. vezi familia de policy
  3. te uiți la helper function relevant

- pentru debugging pe scopes:
  - `calendar`
  - `guest_overview`
  - `property_setup`
  - `cleaning`
  - `channels`
  sunt cele mai importante cuvinte-cheie de urmărit

## What This Adds To The Bible

Acest capitol transformă modelul de acces din:
- grants + RLS flags

în:
- reguli concrete de citire/scriere
- grupate pe domenii și pattern-uri

## Next Recommended Chapter

Ca să închidem o versiune foarte bună a “DB Bible”, mai lipsește încă un capitol scurt și valoros:
- `10_public_schema_known_notes.md`

Acolo putem aduna:
- outliers
- observații
- potențiale inconsistențe
- note de audit pentru viitor
