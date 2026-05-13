# Public Schema Triggers

Status:
- inventariere de triggere pornită din snapshot-ul `MAY 2026`
- bazată pe `information_schema.triggers`
- document de referință, nu migration

Query sursă:

```sql
select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  action_orientation,
  action_statement
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table, trigger_name;
```

Observații generale:
- triggerele observate sunt puține, ceea ce e bine pentru lizibilitate operațională
- ele se concentrează pe:
  - `updated_at`
  - onboarding bootstrap
  - sincronizare de date denormalizate
  - protecții pe booking / iCal
  - snapshot logic pentru reservation messages

## Trigger Map

### `account_billing_profiles`

#### `trg_abp_touch`
- timing: `BEFORE UPDATE`
- orientation: `ROW`
- function: `trg_touch_updated_at()`
- scop probabil:
  - actualizează `updated_at` înainte de update

### `account_onboarding_state`

#### `trg_account_onboarding_touch`
- timing: `BEFORE UPDATE`
- orientation: `ROW`
- function: `trg_account_onboarding_touch()`
- scop probabil:
  - face housekeeping pe starea de onboarding la update

### `accounts`

#### `trg_accounts_create_onboarding_state`
- timing: `AFTER INSERT`
- orientation: `ROW`
- function: `trg_accounts_create_onboarding_state()`
- scop probabil:
  - creează automat onboarding state la apariția unui account nou

#### `trg_sync_account_email_to_account_users`
- timing:
  - `AFTER INSERT`
  - `AFTER UPDATE`
- orientation: `ROW`
- function: `sync_account_email_to_account_users()`
- scop probabil:
  - propagă email-ul account-ului în `account_users`

### `billing_invoices`

#### `trg_bi_touch`
- timing: `BEFORE UPDATE`
- orientation: `ROW`
- function: `trg_touch_updated_at()`
- scop probabil:
  - actualizează `updated_at` pentru facturi

### `bookings`

#### `trg_bookings_prevent_relink_form`
- timing: `BEFORE UPDATE`
- orientation: `ROW`
- function: `bookings_prevent_relink_form()`
- scop probabil:
  - împiedică relink-uri nedorite sau invalide între `bookings` și `form_bookings`

#### `trg_bookings_property_name`
- timing:
  - `BEFORE INSERT`
  - `BEFORE UPDATE`
- orientation: `ROW`
- function: `set_property_name_from_properties()`
- scop probabil:
  - umple sau sincronizează coloana denormalizată `property_name`

#### `trg_prevent_ical_delete`
- timing: `BEFORE DELETE`
- orientation: `ROW`
- function: `prevent_ical_delete_without_suppression()`
- scop probabil:
  - protejează ștergerile de booking venite din logica iCal fără suppression/coregrafie corectă

#### `trg_snapshot_rm_on_booking_confirm`
- timing:
  - `AFTER INSERT`
  - `AFTER UPDATE`
- orientation: `ROW`
- function: `trg_snapshot_rm_for_booking()`
- scop probabil:
  - creează sau reîmprospătează snapshot-ul pentru reservation messages când booking-ul se inserează sau se schimbă

### `room_variable_definitions`

#### `trg_rvd_updated_at`
- timing: `BEFORE UPDATE`
- orientation: `ROW`
- function: `set_updated_at()`
- scop:
  - menține `updated_at`

### `room_variables`

#### `trg_room_variables_updated_at`
- timing: `BEFORE UPDATE`
- orientation: `ROW`
- function: `set_updated_at()`
- scop:
  - menține `updated_at`

### `rooms`

#### `trg_rooms_property_name`
- timing:
  - `BEFORE INSERT`
  - `BEFORE UPDATE`
- orientation: `ROW`
- function: `set_property_name_from_properties()`
- scop probabil:
  - sincronizează coloana denormalizată `property_name`

## Grouped By Intent

### 1. `updated_at` maintenance
Triggere:
- `trg_abp_touch`
- `trg_bi_touch`
- `trg_rvd_updated_at`
- `trg_room_variables_updated_at`

Funcții implicate:
- `trg_touch_updated_at()`
- `set_updated_at()`

Interpretare:
- există două căi de maintenance pentru timestamp-uri
- merită reținut că nu toate tabelele folosesc aceeași funcție trigger

### 2. Bootstrap / sync logic
Triggere:
- `trg_accounts_create_onboarding_state`
- `trg_sync_account_email_to_account_users`
- `trg_account_onboarding_touch`

Interpretare:
- onboarding-ul și propagarea email-ului sunt automatizate la nivel de DB

### 3. Denormalized value sync
Triggere:
- `trg_bookings_property_name`
- `trg_rooms_property_name`

Funcție implicată:
- `set_property_name_from_properties()`

Interpretare:
- schema păstrează `property_name` denormalizat în mai multe locuri
- DB-ul se ocupă automat de alimentarea lui

### 4. Booking safety and side effects
Triggere:
- `trg_bookings_prevent_relink_form`
- `trg_prevent_ical_delete`
- `trg_snapshot_rm_on_booking_confirm`

Interpretare:
- `bookings` este unul dintre puținele locuri unde există logică automată cu impact de business direct
- asta confirmă că rezervările sunt un nod operațional critic

## Trigger Density Notes

Din snapshot:
- `bookings` este tabelul cu cea mai multă logică trigger
- `accounts` vine imediat după, pe bootstrap și sincronizare internă
- restul tabelelor au triggere puține și destul de predictibile

Asta e un semn bun:
- logica automată este concentrată în câteva puncte importante
- nu pare să existe o rețea haotică de side-effects ascunse peste tot în DB

## Practical Notes

- când vezi `updated_at` schimbat “din senin”, primele candidate sunt:
  - `trg_touch_updated_at()`
  - `set_updated_at()`

- când vezi `property_name` completat automat, sursa probabilă este:
  - `set_property_name_from_properties()`

- când un booking nu poate fi șters sau nu se comportă cum te-ai aștepta la relink, candidatele principale sunt:
  - `bookings_prevent_relink_form()`
  - `prevent_ical_delete_without_suppression()`

- când apar efecte secundare pe reservation messaging după inserare/update booking, candidatul principal este:
  - `trg_snapshot_rm_for_booking()`

## Relationship To Function Catalog

Acest capitol trebuie citit împreună cu:
- `05_public_schema_functions.md`

Legături cheie:
- `trg_touch_updated_at()` -> maintenance helper
- `set_updated_at()` -> maintenance helper
- `set_property_name_from_properties()` -> denormalization helper
- `bookings_prevent_relink_form()` -> booking safety helper
- `prevent_ical_delete_without_suppression()` -> iCal safety helper
- `trg_snapshot_rm_for_booking()` -> reservation snapshot trigger
- `sync_account_email_to_account_users()` -> account sync helper
- `trg_accounts_create_onboarding_state()` -> onboarding bootstrap

## What We Have Now

După acest capitol, “DB Bible” acoperă deja:
- structura
- relațiile
- constrângerile
- indexurile
- funcțiile
- triggerele

Adică:
- modelul de date
- integritatea
- performanța de bază
- o mare parte din logica automată din DB

## Next Recommended Chapter

Cele mai valoroase continuări ar fi una dintre acestea:
- `07_public_schema_views.md`
- `08_public_schema_access_model.md`
- `09_public_schema_known_notes.md`

Dacă vrei valoare practică imediată, eu aș merge mai departe cu:
- views
și apoi
- access model
