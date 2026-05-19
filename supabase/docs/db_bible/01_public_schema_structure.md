# Public Schema Structure

Status:
- inventariere inițială pornită din snapshot-ul `MAY 2026`
- bazată pe query-ul din `information_schema.columns`
- document de referință, nu migration

Query sursă:

```sql
select
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
order by c.table_name, c.ordinal_position;
```

Observații generale:
- schema `public` are tabele operaționale pentru conturi, proprietăți, camere, rezervări, formulare, billing, push, mesaje și integrări iCal
- în snapshot apar și obiecte de tip view, de exemplu `accounts_local_time` și `accounts_overview_admin`
- acest document rezumă structura observată și scoate în evidență coloanele cheie, nu înlocuiește auditul SQL brut

## Accounts And Team

### `accounts`
- nucleul de account / subscription
- coloane cheie:
  - `id uuid`
  - `plan plan_tier default 'basic'`
  - `valid_until timestamptz`
  - `created_at timestamptz default now()`
  - `trial_used boolean default false`
  - `trial_ends_at timestamptz`
  - `suspended boolean default false`
  - `status text`
  - `current_period_start timestamptz`
  - `current_period_end timestamptz`
  - `cancel_at_period_end boolean default false`
  - `pending_plan text`
  - `pending_effective_at timestamptz`
  - `stripe_customer_id text`
  - `stripe_subscription_id text`
  - `stripe_schedule_id text`
  - `email text`
  - `last_activity_at timestamptz`
  - `company text`
  - `phone text`
  - `name text`

### `account_users`
- membership și drepturi în cadrul account-ului
- coloane cheie:
  - `account_id uuid`
  - `user_id uuid`
  - `role text default 'editor'`
  - `created_at timestamptz default now()`
  - `scopes text[] default '{}'`
  - `disabled boolean default false`
  - `disabled_by_billing boolean default false`
  - `name text`
  - `phone text`
  - `avatar_url text`
  - `preferred_lang text`
  - `email text`

### `account_login_activity`
- jurnal de login / signup și mod de folosire app vs browser
- coloane cheie:
  - `id uuid default gen_random_uuid()`
  - `account_id uuid`
  - `user_id uuid`
  - `email text`
  - `event_type text default 'login'`
  - `occurred_at timestamptz default now()`
  - `app_mode text`
  - `display_mode text`
  - `device_type text`
  - `os_name text`
  - `browser_name text`
  - `user_agent text`
  - `path text`
  - `metadata jsonb default '{}'`

### `account_billing_profiles`
- profil de facturare per account
- coloane importante:
  - `account_id uuid`
  - `buyer_type text`
  - `full_name text`
  - `cnp text`
  - `legal_name text`
  - `tax_id text`
  - `vat_registered boolean default false`
  - `reg_no text`
  - `iban text`
  - `email text`
  - `phone text`
  - `street text`
  - `city text`
  - `county text`
  - `postal_code text`
  - `country text default 'RO'`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`

### `account_onboarding_events`
- evenimente de onboarding
- coloane importante:
  - `id uuid default gen_random_uuid()`
  - `account_id uuid`
  - `event text`
  - `step_id text`
  - `meta jsonb default '{}'`
  - `created_at timestamptz default now()`
  - `account_email text`

### `account_onboarding_state`
- stare persistentă a onboarding-ului
- coloane importante:
  - `account_id uuid`
  - `dismissed_steps text[] default '{}'`
  - `completed_at timestamptz`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`
  - `steps jsonb default '{}'`
  - `last_seen_at timestamptz`

### `account_sync_events`
- log simplu pentru sync events
- coloane:
  - `id bigint`
  - `account_id uuid`
  - `event_type text`
  - `created_at timestamptz default now()`

### `account_sync_usage`
- usage tracking pentru acțiuni de sync
- coloane:
  - `id uuid default gen_random_uuid()`
  - `account_id uuid`
  - `event text`
  - `created_at timestamptz default now()`
  - `kind text default 'sync_now'`

## Billing

### `billing_plans`
- catalogul intern de planuri
- coloane:
  - `slug text`
  - `name text`
  - `description text default ''`
  - `max_properties int`
  - `max_rooms_per_property int`
  - `sync_interval_minutes int`
  - `allow_sync_now boolean default false`
  - `features jsonb default '{}'`
  - `created_at timestamptz default now()`

### `billing_invoices`
- facturi sincronizate din Stripe
- coloane importante:
  - `id uuid default gen_random_uuid()`
  - `account_id uuid`
  - `stripe_invoice_id text`
  - `stripe_payment_intent_id text`
  - `stripe_charge_id text`
  - `stripe_customer_id text`
  - `stripe_subscription_id text`
  - `number text`
  - `status text`
  - `currency text`
  - `subtotal int`
  - `tax int`
  - `total int`
  - `price_id text`
  - `plan_slug text`
  - `period_start timestamptz`
  - `period_end timestamptz`
  - `hosted_invoice_url text`
  - `invoice_pdf_url text`
  - `customer_name text`
  - `customer_email text`
  - `customer_tax_id text`
  - `customer_address jsonb`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`

### `stripe_events_processed`
- deduplicare / tracking pentru webhook-uri Stripe
- coloane:
  - `event_id text`
  - `type text`
  - `status text`
  - `processed_at timestamptz default now()`
  - `error_message text`
  - `payload jsonb`

## Properties And Rooms

### `properties`
- obiectul central pentru fiecare proprietate
- coloane importante:
  - `id uuid default gen_random_uuid()`
  - `account_id uuid`
  - `name text`
  - `time_zone text default 'Europe/Bucharest'`
  - `created_at timestamptz default now()`
  - `check_in_time text default '14:00'`
  - `check_out_time text default '11:00'`
  - `country_code text`
  - `timezone text`
  - `admin_id uuid`
  - `listed_at timestamptz default now()`
  - `regulation_pdf_url text`
  - `regulation_pdf_uploaded_at timestamptz`
  - `contact_email text`
  - `contact_phone text`
  - `contact_address text`
  - `presentation_image_url text`
  - `presentation_image_uploaded_at timestamptz`
  - `contact_overlay_position text`
  - `social_facebook text`
  - `social_instagram text`
  - `social_tiktok text`
  - `social_website text`
  - `ai_house_rules_text text`
  - `social_location text`
  - `guest_secondary_language text default 'ro'`
  - `checkin_document_upload_mode text default 'required'`

### `rooms`
- camere individuale
- coloane:
  - `id uuid default gen_random_uuid()`
  - `property_id uuid`
  - `name text`
  - `capacity int default 1`
  - `created_at timestamptz default now()`
  - `sort_index int default 0`
  - `room_type_id uuid`
  - `property_name text`

### `room_types`
- tipuri de camere pe proprietate
- coloane:
  - `id uuid default gen_random_uuid()`
  - `property_id uuid`
  - `name text`
  - `key text`
  - `created_at timestamptz default now()`

### `room_variables`
- valori per cameră pentru variabile custom
- coloane:
  - `id uuid default gen_random_uuid()`
  - `property_id uuid`
  - `room_id uuid`
  - `key text`
  - `value text default ''`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`

### `room_variable_definitions`
- definiții ale variabilelor custom
- coloane:
  - `id uuid default gen_random_uuid()`
  - `property_id uuid`
  - `key text`
  - `label text`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`

### `room_detail_checks`
- checklist boolean pe proprietate
- coloane:
  - `id uuid default gen_random_uuid()`
  - `property_id uuid`
  - `label text`
  - `default_value boolean default false`
  - `sort_index int default 0`
  - `created_at timestamptz default now()`

### `room_detail_text_fields`
- câmpuri text custom pe proprietate
- coloane:
  - `id uuid default gen_random_uuid()`
  - `property_id uuid`
  - `label text`
  - `placeholder text`
  - `sort_index int default 0`
  - `created_at timestamptz default now()`

## Bookings And Calendar

### `bookings`
- tabela centrală de rezervări
- coloane importante:
  - `id uuid default gen_random_uuid()`
  - `booking_number bigint`
  - `property_id uuid`
  - `room_id uuid`
  - `start_date date`
  - `end_date date`
  - `guest_name text`
  - `price numeric default 0`
  - `source text`
  - `status booking_status default 'confirmed'`
  - `created_at timestamptz default now()`
  - `start_time text`
  - `end_time text`
  - `guest_first_name text`
  - `guest_last_name text`
  - `guest_email text`
  - `guest_phone text`
  - `guest_address text`
  - `form_submitted_at timestamptz`
  - `room_type_id uuid`
  - `ical_uid text`
  - `has_ical boolean default false`
  - `ota_event_id text`
  - `ota_reservation_id text`
  - `ota_integration_id uuid`
  - `ota_provider text`
  - `form_id uuid`
  - `guest_companions jsonb default '[]'`
  - `property_name text`

### `calendar_settings`
- setări calendar per proprietate
- coloane:
  - `property_id uuid`
  - `checkin_time time`
  - `checkout_time time`
  - `week_starts_on int default 1`
  - `color_theme text`
  - `ical_export_enabled boolean default true`
  - `ical_export_token text`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`

### `booking_contacts`
- contact details per booking
- coloane:
  - `booking_id uuid`
  - `email text`
  - `phone text`
  - `address text`
  - `city text`
  - `country text`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`

### `booking_text_values`
- valori text pentru câmpuri dinamice pe booking
- coloane:
  - `booking_id uuid`
  - `field_id uuid`
  - `value text`

### `booking_check_values`
- valori boolean pentru checklist pe booking
- coloane:
  - `booking_id uuid`
  - `check_id uuid`
  - `value boolean default false`

### `booking_documents`
- documente atașate rezervărilor
- coloane importante:
  - `id uuid default gen_random_uuid()`
  - `property_id uuid`
  - `booking_id uuid`
  - `doc_type text`
  - `storage_bucket text default 'guest_docs'`
  - `storage_path text`
  - `mime_type text`
  - `size_bytes bigint`
  - `uploaded_at timestamptz default now()`
  - `doc_series text`
  - `doc_number text`
  - `doc_nationality text`

## Check-In And Forms

### `form_bookings`
- rezervări colectate prin formular / guest intake
- coloane importante:
  - `id uuid default gen_random_uuid()`
  - `property_id uuid`
  - `start_date date`
  - `end_date date`
  - `room_id uuid`
  - `room_type_id uuid`
  - `guest_first_name text`
  - `guest_last_name text`
  - `guest_email text`
  - `guest_phone text`
  - `guest_address text`
  - `submitted_at timestamptz default now()`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`
  - `state text default 'open'`
  - `ota_provider_hint text`
  - `guest_city text`
  - `guest_country text`
  - `guest_companions jsonb default '[]'`

### `form_documents`
- documente încărcate în fluxul de formular
- coloane importante:
  - `id uuid default gen_random_uuid()`
  - `form_id uuid`
  - `property_id uuid`
  - `doc_type text`
  - `storage_bucket text`
  - `storage_path text`
  - `mime_type text`
  - `size_bytes bigint`
  - `uploaded_at timestamptz default now()`
  - `doc_series text`
  - `doc_number text`
  - `doc_nationality text`

### `checkin_forms`
- formulare de check-in legate de proprietate și eventual booking
- coloane importante:
  - `id uuid default gen_random_uuid()`
  - `property_id uuid`
  - `booking_id uuid`
  - `start_date date`
  - `end_date date`
  - `guest_first_name text`
  - `guest_last_name text`
  - `email text`
  - `phone text`
  - `address text`
  - `city text`
  - `country text`
  - `requested_room_type_id uuid`
  - `requested_room_id uuid`
  - `status text default 'pending'`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`

### `checkin_consents`
- consimțăminte capturate în fluxul de check-in
- coloane importante:
  - `id uuid default gen_random_uuid()`
  - `property_id uuid`
  - `booking_id uuid`
  - `email text`
  - `purpose text`
  - `granted boolean default true`
  - `text_version text`
  - `text_hash text`
  - `ip inet`
  - `ua text`
  - `created_at timestamptz default now()`

## Cleaning

### `cleaning_task_defs`
- definiții de task-uri de cleaning
- coloane:
  - `id uuid default gen_random_uuid()`
  - `property_id uuid`
  - `label text`
  - `sort_index int default 0`
  - `created_at timestamptz default now()`

### `cleaning_progress`
- progres pe task și zi
- coloane:
  - `property_id uuid`
  - `room_id uuid`
  - `clean_date date`
  - `task_id uuid`
  - `done boolean default false`
  - `updated_at timestamptz default now()`

### `cleaning_marks`
- marcaj de finalizare cleaning per cameră / zi
- coloane:
  - `property_id uuid`
  - `room_id uuid`
  - `clean_date date`
  - `cleaned_by_user_id uuid`
  - `cleaned_by_email text`
  - `cleaned_at timestamptz default now()`

## Push And Email

### `push_subscriptions`
- subscriptions pentru Web Push / PWA
- coloane:
  - `id uuid default gen_random_uuid()`
  - `user_id uuid`
  - `account_id uuid`
  - `property_id uuid`
  - `endpoint text`
  - `p256dh text`
  - `auth text`
  - `ua text`
  - `os text`
  - `created_at timestamptz default now()`

### `email_outbox`
- queue / outbox de emailuri
- coloane:
  - `id uuid default gen_random_uuid()`
  - `booking_id uuid`
  - `property_id uuid`
  - `to_email text`
  - `subject text`
  - `html text`
  - `status text`
  - `error_message text`
  - `provider_message_id text`
  - `created_at timestamptz default now()`
  - `sent_at timestamptz`

## Reservation Messages

### `reservation_templates`
- template header / metadata
- coloane:
  - `id uuid default gen_random_uuid()`
  - `property_id uuid`
  - `status text`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`
  - `title text default ''`
  - `schedule_kind text`
  - `schedule_offset_hours int`

### `reservation_template_blocks`
- blocuri de conținut ale template-ului
- coloane:
  - `id uuid default gen_random_uuid()`
  - `property_id uuid`
  - `template_id uuid`
  - `sort_index int`
  - `type text`
  - `text text`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`
  - `lang text default 'ro'`

### `reservation_template_fields`
- câmpuri editabile pentru template
- coloane:
  - `id uuid default gen_random_uuid()`
  - `property_id uuid`
  - `template_id uuid`
  - `sort_index int`
  - `key text`
  - `label text`
  - `required boolean default false`
  - `multiline boolean default false`
  - `placeholder text`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`
  - `default_value text`

### `reservation_messages`
- instanțe/token-uri de mesaje pentru rezervări
- coloane:
  - `id uuid default gen_random_uuid()`
  - `property_id uuid`
  - `booking_id uuid`
  - `token text`
  - `status text default 'active'`
  - `manual_values jsonb default '{}'`
  - `expires_at timestamptz`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`
  - `snapshot_items jsonb`

## iCal And Channel Sync

### `ical_type_integrations`
- integrări iCal per proprietate / tip de cameră / cameră
- coloane:
  - `id uuid default gen_random_uuid()`
  - `property_id uuid`
  - `room_type_id uuid`
  - `provider text`
  - `url text`
  - `is_active boolean default true`
  - `last_sync timestamptz`
  - `created_at timestamptz default now()`
  - `color text`
  - `logo_url text`
  - `room_id uuid`

### `ical_type_sync_logs`
- jurnal de sync per integrare
- coloane:
  - `id uuid default gen_random_uuid()`
  - `integration_id uuid`
  - `started_at timestamptz default now()`
  - `finished_at timestamptz`
  - `status text default 'running'`
  - `added_count int default 0`
  - `updated_count int default 0`
  - `conflicts int default 0`
  - `error_message text`

### `ical_uid_map`
- mapare uid extern -> booking / room / room type
- coloane:
  - `id uuid default gen_random_uuid()`
  - `property_id uuid`
  - `room_type_id uuid`
  - `room_id uuid`
  - `booking_id uuid`
  - `uid text`
  - `source text`
  - `start_date date`
  - `end_date date`
  - `start_time text`
  - `end_time text`
  - `last_seen timestamptz default now()`
  - `integration_id uuid`

### `ical_unassigned_events`
- evenimente iCal care nu au fost alocate complet
- coloane:
  - `id uuid default gen_random_uuid()`
  - `property_id uuid`
  - `room_type_id uuid`
  - `uid text`
  - `summary text`
  - `start_date date`
  - `end_date date`
  - `start_time text`
  - `end_time text`
  - `payload text`
  - `created_at timestamptz default now()`
  - `resolved boolean default false`
  - `integration_id uuid`
  - `room_id uuid`

### `ical_suppressions`
- blacklist / suppressions pentru uid-uri iCal
- coloane:
  - `property_id uuid`
  - `ical_uid text`
  - `created_at timestamptz default now()`
  - `created_by uuid`

## Reference Data

### `geo_countries`
- tabel de referință pentru țări
- coloane:
  - `iso2 text`
  - `name text`
  - `nationality_en text`

## Views Observed In Snapshot

### `accounts_local_time`
- view utilitar pentru overview/admin
- coloane observate:
  - `id`
  - `email`
  - `last_activity_at`
  - `last_activity_ro`
  - `properties_count`
  - `bookings_count`
  - `reservation_templates_count`
  - `forms_count`
  - `forms_pending_count`
  - `ical_integrations_count`
  - `ical_integrations`
  - `current_booking_dates`
  - `next_booking_dates`

### `accounts_overview_admin`
- view administrativ pentru overview de accounts
- coloane observate:
  - `id`
  - `email`
  - `plan`
  - `company`
  - `last_activity_at`
  - `last_activity_ro`
  - `properties_count`
  - `bookings_count`

## Notes For Future Updates

- următorul document ar trebui să acopere relațiile dintre tabele și foreign keys
- după aceea merită documentate indexurile, funcțiile și triggerele
- pentru tabele noi din `public`, păstrăm explicit și regula Supabase:
  - `GRANT`
  - `RLS`
  - `POLICIES`
