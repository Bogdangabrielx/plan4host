# Public Schema Indexes

Status:
- inventariere de indexuri pornită din snapshot-ul `MAY 2026`
- bazată pe `pg_indexes`
- document de referință, nu migration

Query sursă:

```sql
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;
```

Observații generale:
- fiecare tabel important are indexul de `PRIMARY KEY`
- există mai multe `UNIQUE INDEX` care dublează regulile de integritate deja surprinse în capitolul de constraints
- schema folosește și indexuri mai avansate:
  - `partial indexes`
  - `expression indexes`
  - `GIN`
  - `GiST`
  - `INCLUDE`

Acest capitol e util mai ales pentru:
- înțelegerea query-urilor rapide vs lente
- identificarea lookup-urilor intenționate de produs
- observarea pattern-urilor de filtrare și sortare din aplicație

## Structural Indexes

Acestea sunt indexurile de bază care susțin `PRIMARY KEY` și multe `UNIQUE`.

Exemple:
- `accounts_pkey`
- `properties_pkey`
- `rooms_pkey`
- `bookings_pkey`
- `form_bookings_pkey`
- `reservation_messages_pkey`
- `push_subscriptions_pkey`
- `ical_type_integrations_pkey`
- `stripe_events_processed_pkey`

Chei compuse importante:
- `account_users_pkey(account_id, user_id)`
- `booking_check_values_pkey(booking_id, check_id)`
- `booking_text_values_pkey(booking_id, field_id)`
- `cleaning_marks_pkey(property_id, room_id, clean_date)`
- `cleaning_progress_pkey(property_id, room_id, clean_date, task_id)`
- `ical_suppressions_pkey(property_id, ical_uid)`

Interpretare:
- modelul relațional este susținut corect de indexuri pentru chei simple și compuse

## Unique Indexes With Business Meaning

### Accounts, Billing And Identity
- `billing_invoices_stripe_invoice_id_key(stripe_invoice_id)`
- `account_users_one_owner_per_account(account_id) WHERE role = 'owner'`

Notă:
- `account_users_one_owner_per_account` este foarte interesant, pentru că sugerează intenția de "un singur owner per account"
- merită reținut că aceasta folosește `role = 'owner'`, deși în snapshot-ul de constraints pe `account_users.role` apăreau doar `admin`, `editor`, `viewer`
- asta nu înseamnă automat bug, dar este un punct foarte bun de reverificat când facem audit fin

### Bookings And Messaging
- `bookings_booking_number_key(booking_number)`
- `bookings_form_id_unique(form_id) WHERE form_id IS NOT NULL`
- `uq_bookings_property_ical(property_id, ical_uid) WHERE ical_uid IS NOT NULL`
- `reservation_messages_property_id_booking_id_key(property_id, booking_id)`
- `reservation_messages_token_key(token)`

### Templates And Variables
- `reservation_template_fields_template_id_key_key(template_id, key)`
- `room_variable_definitions_property_id_key_key(property_id, key)`
- `room_variables_property_id_room_id_key_key(property_id, room_id, key)`

### iCal And Push
- `ical_uid_map_property_id_uid_key(property_id, uid)`
- `uniq_iti_room_url(room_id, url) WHERE room_id IS NOT NULL`
- `uniq_iti_type_url(room_type_id, url) WHERE room_type_id IS NOT NULL`
- `uq_push_subscriptions_user_endpoint_global(user_id, endpoint) WHERE property_id IS NULL`
- `uq_push_subscriptions_user_endpoint_property(user_id, endpoint, property_id) WHERE property_id IS NOT NULL`

Interpretare:
- există protecții bune împotriva dublurilor în zonele cele mai sensibile:
  - Stripe
  - iCal mapping
  - public message tokens
  - push subscriptions
  - custom variables

## Timeline And Audit-Friendly Indexes

Acestea arată clar că multe ecrane sau joburi citesc "cele mai recente evenimente".

### Login / Onboarding / Usage
- `account_login_activity_account_time_idx(account_id, occurred_at desc)`
- `account_login_activity_user_time_idx(user_id, occurred_at desc)`
- `account_login_activity_mode_time_idx(app_mode, occurred_at desc)`
- `account_login_activity_os_mode_time_idx(os_name, app_mode, occurred_at desc)`
- `aoe_account_created_at_idx(account_id, created_at desc)`
- `account_sync_events_account_created_idx(account_id, created_at desc)`
- `account_sync_events_type_created_idx(event_type, created_at desc)`
- `account_sync_usage_acc_evt_created_idx(account_id, event, created_at desc)`
- `account_sync_usage_acc_kind_time(account_id, kind, created_at desc)`
- `idx_account_sync_usage_account_created(account_id, created_at desc)`
- `idx_account_sync_usage_kind_created(event, created_at desc)`

### Billing / Accounts
- `bi_account_created_idx(account_id, created_at desc)`
- `accounts_last_activity_at_idx(last_activity_at desc nulls last)`
- `accounts_pending_effective_idx(pending_effective_at)`

### Forms / Messages / Sync Logs
- `idx_ical_type_sync_logs_integ(integration_id, started_at desc)`
- `idx_rm_templates_property(property_id, updated_at desc)`
- `booking_documents_prop_time(property_id, uploaded_at desc)`
- `ix_cc_property_purpose_created(property_id, purpose, created_at desc)`

Interpretare:
- produsul pare construit în jurul dashboard-urilor și listelor cronologice
- `desc` pe coloanele de timp este foarte frecvent și arată citirea "ultimelor activități"

## Lookup Indexes

Acestea susțin ecrane, filtre și joburi care caută rapid după o cheie funcțională.

### Accounts
- `accounts_email_idx(lower(coalesce(email, '')))`
- `accounts_schedule_idx(stripe_schedule_id)`
- `accounts_stripe_schedule_idx(stripe_schedule_id)`

Notă:
- există două indexuri aparent duplicate pe `stripe_schedule_id`
  - `accounts_schedule_idx`
  - `accounts_stripe_schedule_idx`
- foarte probabil merită notat ca posibilă redundanță, fără să schimbăm nimic acum

### Billing
- `bi_payment_intent_idx(stripe_payment_intent_id)`
- `abp_email_idx(lower(coalesce(email, '')))`
- `abp_tax_id_idx(coalesce(tax_id, ''))`

### Bookings
- `idx_bookings_ota_integration_id(ota_integration_id)`
- `ix_bookings_ical_uid(ical_uid)`
- `ix_bookings_ota_event(ota_event_id)`
- `ix_bookings_ota_res(ota_reservation_id)`
- `ix_bookings_source(source)`
- `idx_bookings_dates(start_date, end_date)`

### Check-in / Forms / Documents
- `ix_cc_booking(booking_id)`
- `ix_cc_email(email)`
- `form_bookings_room_idx(room_id)`
- `form_bookings_room_type_idx(room_type_id)`
- `form_documents_form_idx(form_id)`
- `form_documents_prop_idx(property_id)`
- `email_outbox_booking_idx(booking_id)`

### iCal / Cleaning / Variables
- `idx_ical_uid_map_integration_id(integration_id)`
- `idx_ical_unassigned_events_integration_id(integration_id)`
- `idx_unassigned_room_id(room_id)`
- `idx_iti_room_id(room_id)`
- `cp_lookup_idx(property_id, room_id, clean_date)`
- `idx_rvd_property(property_id, created_at)`
- `idx_room_vars_property(property_id)`
- `idx_room_vars_room(room_id)`
- `idx_room_vars_key(key)`

## Partial Indexes

Acestea sunt valoroase pentru că optimizează cazuri foarte specifice, fără cost complet pe toate rândurile.

Observate:
- `account_users_one_owner_per_account(account_id) WHERE role = 'owner'`
- `au_acc_role_active_idx(account_id, role) WHERE disabled = false`
- `au_acc_user_active_idx(account_id, user_id) WHERE disabled = false`
- `au_scopes_active_gin(scopes) WHERE disabled = false`
- `bookings_form_id_unique(form_id) WHERE form_id IS NOT NULL`
- `bookings_room_dates_idx(room_id, start_date, end_date) WHERE status <> 'cancelled'`
- `bookings_no_overlap ... WHERE status = 'confirmed'`
- `uq_bookings_property_ical(property_id, ical_uid) WHERE ical_uid IS NOT NULL`
- `uniq_iti_room_url(room_id, url) WHERE room_id IS NOT NULL`
- `uniq_iti_type_url(room_type_id, url) WHERE room_type_id IS NOT NULL`
- `uq_push_subscriptions_user_endpoint_global(user_id, endpoint) WHERE property_id IS NULL`
- `uq_push_subscriptions_user_endpoint_property(user_id, endpoint, property_id) WHERE property_id IS NOT NULL`

Interpretare:
- schema optimizează clar pentru "active rows", "confirmed rows", "non-null foreign business keys"
- e un semn bun de maturitate pe partea de query design

## Expression Indexes

Observate:
- `abp_email_idx` pe `lower(coalesce(email, ''))`
- `abp_tax_id_idx` pe `coalesce(tax_id, '')`
- `aoe_account_email_idx` pe `lower(coalesce(account_email, ''))`
- `accounts_email_idx` pe `lower(coalesce(email, ''))`
- `properties_account_active_idx` pe `coalesce(account_id, admin_id), coalesce(listed_at, created_at), id`

Interpretare:
- se normalizează textual pentru lookup case-insensitive sau pentru evitarea `NULL`
- `properties_account_active_idx` este unul dintre cele mai interesante indexuri expresive din schemă

## Special Index Types

### GIN
- `au_scopes_active_gin ON account_users USING gin (scopes) WHERE disabled = false`

Semnificație:
- foarte probabil folosit pentru filtre pe array-ul `scopes`
- susține bine modelul vostru de permissions / capabilities

### GiST
- `bookings_no_overlap ON bookings USING gist (room_id, daterange(start_date, end_date, '[)')) WHERE status = 'confirmed'`

Semnificație:
- acesta este unul dintre cele mai importante indexuri din toată schema
- sugerează control sau verificare eficientă pentru overlap de rezervări pe cameră
- foarte util pentru calendar logic și disponibilitate

### INCLUDE / covering index
- `ix_push_subscriptions_user_cover ON push_subscriptions(user_id) INCLUDE (endpoint, p256dh, auth)`

Semnificație:
- optimizat pentru citirea rapidă a detaliilor necesare la trimiterea notificărilor push

## Domain Notes

### Accounts And Team
- zona de accounts are mix bun de:
  - lookup pe email
  - timeline pe activitate
  - indexuri active-only pe memberships
  - GIN pe `scopes`

### Bookings
- zona de bookings este cea mai bogată în indexuri
- combină:
  - date range
  - lookup OTA/iCal
  - form linking
  - reguli de non-overlap

### Push
- `push_subscriptions` este destul de bine optimizat pentru cazuri reale de delivery:
  - user lookup
  - user + property lookup
  - uniqueness per endpoint
  - cover index pentru payload crypto fields

### iCal
- și aici se vede o schemă matură:
  - mapping unic pe `property + uid`
  - unique pe combinații `room/url` și `room_type/url`
  - indexuri dedicate pentru integrare și unassigned flows

## Potential Redundancies Or Audit Notes

Fără să schimbăm nimic acum, merită reținute câteva observații:

- `accounts_schedule_idx` și `accounts_stripe_schedule_idx`
  Par să indexeze aceeași coloană: `stripe_schedule_id`

- `account_sync_usage`
  Există mai multe indexuri apropiate semantic:
  - `account_sync_usage_acc_evt_created_idx`
  - `account_sync_usage_acc_kind_time`
  - `idx_account_sync_usage_account_created`
  - `idx_account_sync_usage_kind_created`

- `bookings_room_dates_idx` și `bookings_room_time_idx`
  Sunt apropiate ca structură, dar nu identice, pentru că unul este partial pe `status <> cancelled`

Aceste note sunt doar pentru memorie viitoare, nu semnalează neapărat o problemă imediată.

## Practical Notes

- pentru performanță pe calendar și booking conflicts, primele indexuri de urmărit sunt:
  - `bookings_no_overlap`
  - `bookings_room_dates_idx`
  - `bookings_room_time_idx`

- pentru analytics pe adoption / devices:
  - `account_login_activity_account_time_idx`
  - `account_login_activity_user_time_idx`
  - `account_login_activity_os_mode_time_idx`

- pentru permissions și membership:
  - `au_acc_user_active_idx`
  - `au_acc_role_active_idx`
  - `au_scopes_active_gin`

- pentru push delivery:
  - `ix_push_subscriptions_user_cover`
  - `uq_push_subscriptions_user_endpoint_global`
  - `uq_push_subscriptions_user_endpoint_property`

## Next Recommended Chapter

Următorul capitol foarte bun pentru "DB Bible" ar fi:
- functions
- triggers
- eventual views

Acolo începem să documentăm și logica efectivă care trăiește în DB, nu doar structura.
