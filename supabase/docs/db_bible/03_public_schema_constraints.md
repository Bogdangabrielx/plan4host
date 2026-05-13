# Public Schema Constraints

Status:
- inventariere de constrângeri pornită din snapshot-ul `MAY 2026`
- bazată pe `PRIMARY KEY`, `UNIQUE` și `CHECK`
- document de referință, nu migration

Query sursă:

```sql
select
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  string_agg(kcu.column_name, ', ' order by kcu.ordinal_position) as columns,
  cc.check_clause
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.table_schema = kcu.table_schema
  and tc.table_name = kcu.table_name
left join information_schema.check_constraints cc
  on tc.constraint_name = cc.constraint_name
where tc.table_schema = 'public'
  and tc.constraint_type in ('PRIMARY KEY', 'UNIQUE', 'CHECK')
group by
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
order by
  tc.table_name,
  tc.constraint_type,
  tc.constraint_name;
```

Observații generale:
- output-ul conține multe constrângeri `CHECK` de forma `2200_..._not_null`; acestea reflectă coloanele `NOT NULL`
- pentru utilizare practică, e mai util să separăm:
  - cheile primare
  - cheile unice
  - regulile de business din `CHECK`
  - faptul că multe tabele impun și `NOT NULL` pe coloane esențiale

## Primary Keys

### Single-column primary keys
- `account_billing_profiles(account_id)`
- `account_login_activity(id)`
- `account_onboarding_events(id)`
- `account_onboarding_state(account_id)`
- `account_sync_events(id)`
- `account_sync_usage(id)`
- `accounts(id)`
- `billing_invoices(id)`
- `billing_plans(slug)`
- `booking_contacts(booking_id)`
- `booking_documents(id)`
- `bookings(id)`
- `calendar_settings(property_id)`
- `checkin_consents(id)`
- `checkin_forms(id)`
- `cleaning_task_defs(id)`
- `email_outbox(id)`
- `form_bookings(id)`
- `form_documents(id)`
- `geo_countries(iso2)`
- `ical_type_integrations(id)`
- `ical_type_sync_logs(id)`
- `ical_uid_map(id)`
- `ical_unassigned_events(id)`
- `properties(id)`
- `push_subscriptions(id)`
- `reservation_messages(id)`
- `reservation_template_blocks(id)`
- `reservation_template_fields(id)`
- `reservation_templates(id)`
- `room_detail_checks(id)`
- `room_detail_text_fields(id)`
- `room_types(id)`
- `room_variable_definitions(id)`
- `room_variables(id)`
- `rooms(id)`
- `stripe_events_processed(event_id)`

### Composite primary keys
- `account_users(account_id, user_id)`
- `booking_check_values(booking_id, check_id)`
- `booking_text_values(booking_id, field_id)`
- `cleaning_marks(property_id, room_id, clean_date)`
- `cleaning_progress(property_id, room_id, clean_date, task_id)`
- `ical_suppressions(property_id, ical_uid)`

Interpretare:
- schema folosește mix de chei surrogate `uuid` și chei compuse pentru tabele de join / facts
- tabelele de tip matrix sau values folosesc corect chei compuse în locul unui `id` artificial

## Unique Constraints

Constrângeri unice observate:
- `billing_invoices(stripe_invoice_id)`
- `ical_uid_map(property_id, uid)`
- `reservation_messages(property_id, booking_id)`
- `reservation_messages(token)`
- `reservation_template_fields(template_id, key)`
- `room_variable_definitions(property_id, key)`
- `room_variables(property_id, room_id, key)`

Interpretare:
- există garduri bune împotriva dublurilor în zonele critice:
  - facturi Stripe
  - token-uri publice de reservation messages
  - chei de template fields
  - chei de variabile custom
  - maparea `property + uid` pentru iCal

## Business Check Constraints

Mai jos sunt regulile de business utile, adică cele care spun ceva despre stările sau valorile permise.

### Accounts And Membership

#### `account_billing_profiles`
- `buyer_type in ('b2b', 'b2c')`

#### `account_login_activity`
- `app_mode in ('pwa', 'browser', 'unknown')`
- `device_type is null or in ('mobile', 'tablet', 'desktop', 'unknown')`
- `event_type in ('login', 'signup')`

#### `account_sync_events`
- `event_type in ('autosync', 'sync_now')`

#### `account_sync_usage`
- query-ul returnează constraint-ul `account_sync_usage_kind_check` cu clauza:
  - `event in ('sync_now', 'autosync')`
- numele sugerează că merită reverificat ulterior dacă intenția era pe `kind` sau pe `event`

#### `account_users`
- `role in ('admin', 'editor', 'viewer')`

#### `accounts`
- `pending_plan is null or lower(pending_plan) in ('basic', 'standard', 'premium')`

### Billing

#### `billing_invoices`
- `plan_slug is null or lower(plan_slug) in ('basic', 'standard', 'premium')`

### Bookings And Forms

#### `bookings`
- `start_date <= end_date`

#### `booking_documents`
- `doc_type in ('id_card', 'passport', 'other')`

#### `form_documents`
- `doc_type in ('id_card', 'passport')`

#### `form_bookings`
- `state in ('open', 'linked', 'cancelled')`

#### `checkin_consents`
- `purpose in ('privacy_ack', 'house_rules_ack')`

### Email And Messaging

#### `email_outbox`
- `status in ('pending', 'sent', 'error')`

#### `reservation_messages`
- `status in ('active', 'revoked', 'expired')`

#### `reservation_template_blocks`
- `type in ('heading', 'paragraph', 'divider')`

#### `reservation_templates`
- `status in ('draft', 'published')`

### Properties

#### `properties`
- `checkin_document_upload_mode in ('required', 'optional', 'disabled')`
- `contact_overlay_position in ('top', 'center', 'down')`
- `guest_secondary_language in ('ro', 'es', 'de', 'el', 'fr', 'it', 'pt')`

### Geography

#### `geo_countries`
- `char_length(iso2) = 2`

### iCal And Sync

#### `ical_type_integrations`
- exact unul dintre `room_type_id` sau `room_id` trebuie să fie setat
- clauză:
  - `(room_type_id is not null and room_id is null) or (room_type_id is null and room_id is not null)`

### Stripe Event Tracking

#### `stripe_events_processed`
- `status in ('processed', 'failed')`

## Not Null Coverage

Snapshot-ul arată foarte multe `CHECK` auto-generate pentru coloane `NOT NULL`. Nu le listăm exhaustiv aici pe categorii de business, dar merită reținute câteva tipare:

- majoritatea tabelelor de bază impun `id`, `created_at` și coloanele cheie relaționale ca `NOT NULL`
- tabelele JSON folosite operațional impun frecvent default și `NOT NULL`
  - `metadata`
  - `meta`
  - `steps`
  - `features`
  - `manual_values`
  - `guest_companions`
- multe tabele de status impun și `NOT NULL` pe coloana de stare

Concluzie:
- integritatea nu este lăsată doar pe frontend sau pe API
- DB-ul impune destul de multe reguli structurale și de business direct la nivel de tabel

## Practical Notes

- când vedem erori de insert/update, primul loc bun de verificat este această listă de `CHECK`
- pentru debugging de duplicate data, cheia este secțiunea de `UNIQUE`
- pentru mapping tables, cheile compuse explică de ce anumite upsert-uri trebuie făcute pe perechi sau tuple, nu doar pe `id`

## Things Worth Rechecking Later

- `account_sync_usage_kind_check`
  Numele constraint-ului sugerează validare pe `kind`, dar clauza din snapshot validează `event`

Acest punct nu înseamnă automat bug, dar merită revalidat când documentăm migrations sau când facem audit mai fin.

## Next Recommended Chapter

Următorul document bun pentru "DB Bible":
- indexuri
- triggere
- funcții folosite de RLS și de business logic

Asta ar completa foarte bine:
- structura
- relațiile
- constrângerile
