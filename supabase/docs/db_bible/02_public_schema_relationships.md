# Public Schema Relationships

Status:
- inventariere relațională pornită din snapshot-ul `MAY 2026`
- bazată pe foreign keys din `information_schema`
- document de referință, nu migration

Query sursă:

```sql
select
  tc.table_name,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name,
  rc.update_rule,
  rc.delete_rule,
  tc.constraint_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
  and ccu.table_schema = tc.table_schema
join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name
  and rc.constraint_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
order by tc.table_name, kcu.column_name;
```

Observații generale:
- `accounts` și `properties` sunt nodurile cele mai importante din schema relațională
- foarte multe relații folosesc `ON DELETE CASCADE`, ceea ce sugerează cleanup automat pe sub-arbori operaționali
- în jurul rezervărilor și al integrărilor iCal există mai multe legături `SET NULL`, semn că istoricul trebuie păstrat chiar dacă obiectul sursă dispare
- există și câteva excepții deliberate, de exemplu `properties.admin_id -> accounts.id` cu `ON DELETE RESTRICT`

## Core Relationship Map

### `accounts`
`accounts` este rădăcina principală pentru zona de account și billing.

Dependenți direcți observați:
- `account_billing_profiles.account_id -> accounts.id` with `DELETE CASCADE`
- `account_login_activity.account_id -> accounts.id` with `DELETE CASCADE`
- `account_onboarding_events.account_id -> accounts.id` with `DELETE CASCADE`
- `account_onboarding_state.account_id -> accounts.id` with `DELETE CASCADE`
- `account_sync_events.account_id -> accounts.id` with `DELETE CASCADE`
- `account_sync_usage.account_id -> accounts.id` with `DELETE CASCADE`
- `account_users.account_id -> accounts.id` with `DELETE CASCADE`
- `billing_invoices.account_id -> accounts.id` with `DELETE CASCADE`
- `properties.account_id -> accounts.id` with `DELETE CASCADE`

Relație specială:
- `properties.admin_id -> accounts.id` with `UPDATE CASCADE` and `DELETE RESTRICT`

Interpretare:
- dacă un `account` dispare, majoritatea datelor satelit se curăță automat
- însă un account folosit ca `admin_id` pe `properties` nu poate fi șters liber cât timp există proprietăți dependente

### `properties`
`properties` este centrul zonei operaționale.

Dependente directe observate:
- `booking_documents.property_id -> properties.id` with `DELETE CASCADE`
- `bookings.property_id -> properties.id` with `DELETE CASCADE`
- `calendar_settings.property_id -> properties.id` with `DELETE CASCADE`
- `checkin_forms.property_id -> properties.id` with `DELETE CASCADE`
- `checkin_consents.property_id -> properties.id` with `DELETE SET NULL`
- `cleaning_progress.property_id -> properties.id` with `DELETE CASCADE`
- `cleaning_task_defs.property_id -> properties.id` with `DELETE CASCADE`
- `form_bookings.property_id -> properties.id` with `DELETE CASCADE`
- `form_documents.property_id -> properties.id` with `DELETE CASCADE`
- `ical_suppressions.property_id -> properties.id` with `DELETE CASCADE`
- `ical_type_integrations.property_id -> properties.id` with `DELETE CASCADE`
- `ical_uid_map.property_id -> properties.id` with `DELETE CASCADE`
- `ical_unassigned_events.property_id -> properties.id` with `DELETE CASCADE`
- `reservation_messages.property_id -> properties.id` with `DELETE CASCADE`
- `reservation_template_blocks.property_id -> properties.id` with `DELETE CASCADE`
- `reservation_template_fields.property_id -> properties.id` with `DELETE CASCADE`
- `reservation_templates.property_id -> properties.id` with `DELETE CASCADE`
- `room_detail_checks.property_id -> properties.id` with `DELETE CASCADE`
- `room_detail_text_fields.property_id -> properties.id` with `DELETE CASCADE`
- `room_types.property_id -> properties.id` with `DELETE CASCADE`
- `room_variable_definitions.property_id -> properties.id` with `DELETE CASCADE`
- `room_variables.property_id -> properties.id` with `DELETE CASCADE`
- `rooms.property_id -> properties.id` with `DELETE CASCADE`

Interpretare:
- ștergerea unei proprietăți taie aproape tot arborele operațional
- `checkin_consents` este tratat mai conservator și își poate păstra rândul cu `property_id = null`

## Domain Relationships

### Accounts And Billing

Relații:
- `account_billing_profiles.account_id -> accounts.id` with `DELETE CASCADE`
- `account_login_activity.account_id -> accounts.id` with `DELETE CASCADE`
- `account_onboarding_events.account_id -> accounts.id` with `DELETE CASCADE`
- `account_onboarding_state.account_id -> accounts.id` with `DELETE CASCADE`
- `account_sync_events.account_id -> accounts.id` with `DELETE CASCADE`
- `account_sync_usage.account_id -> accounts.id` with `DELETE CASCADE`
- `account_users.account_id -> accounts.id` with `DELETE CASCADE`
- `billing_invoices.account_id -> accounts.id` with `DELETE CASCADE`

Concluzie:
- modelul de account e puternic agregat în jurul `accounts`
- aproape tot ce ține de account se șterge împreună cu el

### Properties, Rooms And Custom Room Metadata

Relații:
- `rooms.property_id -> properties.id` with `DELETE CASCADE`
- `rooms.room_type_id -> room_types.id` with `DELETE SET NULL`
- `room_types.property_id -> properties.id` with `DELETE CASCADE`
- `room_variables.property_id -> properties.id` with `DELETE CASCADE`
- `room_variables.room_id -> rooms.id` with `DELETE CASCADE`
- `room_variable_definitions.property_id -> properties.id` with `DELETE CASCADE`
- `room_detail_checks.property_id -> properties.id` with `DELETE CASCADE`
- `room_detail_text_fields.property_id -> properties.id` with `DELETE CASCADE`

Concluzie:
- `property -> room_types -> rooms` este una dintre axele structurale centrale
- când dispare un `room_type`, camerele pot rămâne, dar cu `room_type_id = null`

### Bookings, Contacts And Booking Metadata

Relații:
- `bookings.property_id -> properties.id` with `DELETE CASCADE`
- `bookings.room_id -> rooms.id` with `DELETE SET NULL`
- `bookings.room_type_id -> room_types.id` with `DELETE SET NULL`
- `bookings.form_id -> form_bookings.id` with `DELETE SET NULL`
- `bookings.ota_integration_id -> ical_type_integrations.id` with `DELETE SET NULL`
- `booking_contacts.booking_id -> bookings.id` with `DELETE CASCADE`
- `booking_documents.booking_id -> bookings.id` with `DELETE CASCADE`
- `booking_documents.property_id -> properties.id` with `DELETE CASCADE`
- `booking_text_values.booking_id -> bookings.id` with `DELETE CASCADE`
- `booking_text_values.field_id -> room_detail_text_fields.id` with `DELETE CASCADE`
- `booking_check_values.booking_id -> bookings.id` with `DELETE CASCADE`
- `booking_check_values.check_id -> room_detail_checks.id` with `DELETE CASCADE`

Concluzie:
- `bookings` este hub-ul central pentru datele unei rezervări
- dacă o rezervare dispare, contactele, documentele și valorile dinamice merg și ele în `CASCADE`
- dacă dispar entități auxiliare precum camera, tipul de cameră sau integrarea OTA, rezervarea poate supraviețui prin `SET NULL`

### Forms And Check-In

Relații:
- `form_bookings.property_id -> properties.id` with `DELETE CASCADE`
- `form_bookings.room_id -> rooms.id` with `DELETE SET NULL`
- `form_bookings.room_type_id -> room_types.id` with `DELETE SET NULL`
- `form_documents.form_id -> form_bookings.id` with `DELETE CASCADE`
- `form_documents.property_id -> properties.id` with `DELETE CASCADE`
- `checkin_forms.property_id -> properties.id` with `DELETE CASCADE`
- `checkin_forms.booking_id -> bookings.id` with `DELETE SET NULL`
- `checkin_forms.requested_room_id -> rooms.id` with `DELETE SET NULL`
- `checkin_forms.requested_room_type_id -> room_types.id` with `DELETE SET NULL`
- `checkin_consents.booking_id -> bookings.id` with `DELETE SET NULL`
- `checkin_consents.property_id -> properties.id` with `DELETE SET NULL`

Concluzie:
- formularele țin de proprietate și pot avea legături mai moi către booking / room / room type
- `form_documents` este strâns cuplat de `form_bookings`
- consimțămintele sunt păstrate mai defensiv, fără cascade agresive pe booking/property

### Cleaning

Relații:
- `cleaning_task_defs.property_id -> properties.id` with `DELETE CASCADE`
- `cleaning_progress.property_id -> properties.id` with `DELETE CASCADE`
- `cleaning_progress.room_id -> rooms.id` with `DELETE CASCADE`
- `cleaning_progress.task_id -> cleaning_task_defs.id` with `DELETE CASCADE`

Concluzie:
- zona de cleaning este atașată clar de proprietate și cameră
- progresul depinde de task definition, deci dispariția task-ului curăță și progresul asociat

### Reservation Messages

Relații:
- `reservation_templates.property_id -> properties.id` with `DELETE CASCADE`
- `reservation_template_blocks.property_id -> properties.id` with `DELETE CASCADE`
- `reservation_template_blocks.template_id -> reservation_templates.id` with `DELETE CASCADE`
- `reservation_template_fields.property_id -> properties.id` with `DELETE CASCADE`
- `reservation_template_fields.template_id -> reservation_templates.id` with `DELETE CASCADE`
- `reservation_messages.property_id -> properties.id` with `DELETE CASCADE`
- `reservation_messages.booking_id -> bookings.id` with `DELETE CASCADE`

Concluzie:
- mesajele și template-urile sunt foarte bine ancorate de `properties`
- `reservation_templates` este părinte direct pentru blocks și fields

### iCal And Channel Sync

Relații:
- `ical_type_integrations.property_id -> properties.id` with `DELETE CASCADE`
- `ical_type_integrations.room_type_id -> room_types.id` with `DELETE CASCADE`
- `ical_type_integrations.room_id -> rooms.id` with `DELETE NO ACTION`
- `ical_type_sync_logs.integration_id -> ical_type_integrations.id` with `DELETE CASCADE`
- `ical_uid_map.property_id -> properties.id` with `DELETE CASCADE`
- `ical_uid_map.room_type_id -> room_types.id` with `DELETE CASCADE`
- `ical_uid_map.room_id -> rooms.id` with `DELETE SET NULL`
- `ical_uid_map.booking_id -> bookings.id` with `DELETE SET NULL`
- `ical_uid_map.integration_id -> ical_type_integrations.id` with `DELETE SET NULL`
- `ical_unassigned_events.property_id -> properties.id` with `DELETE CASCADE`
- `ical_unassigned_events.room_type_id -> room_types.id` with `DELETE CASCADE`
- `ical_unassigned_events.room_id -> rooms.id` with `DELETE NO ACTION`
- `ical_unassigned_events.integration_id -> ical_type_integrations.id` with `DELETE SET NULL`
- `ical_suppressions.property_id -> properties.id` with `DELETE CASCADE`

Concluzie:
- integrările iCal sunt strâns ancorate la proprietate și room type
- apar două excepții importante cu `NO ACTION`:
  - `ical_type_integrations.room_id -> rooms.id`
  - `ical_unassigned_events.room_id -> rooms.id`
- aceste relații merită ținute minte pentru că pot bloca anumite ștergeri dacă există date dependente

## Delete Rule Summary

### Relații dominante cu `DELETE CASCADE`
Folosit pentru:
- majoritatea relațiilor de account
- majoritatea relațiilor pornite din `properties`
- child tables pentru `bookings`
- child tables pentru `reservation_templates`
- multe relații din cleaning și iCal

Semnificație:
- modelul DB favorizează cleanup automat și arbori de date bine închiși

### Relații cu `DELETE SET NULL`
Observate în special pentru:
- `bookings.form_id`
- `bookings.ota_integration_id`
- `bookings.room_id`
- `bookings.room_type_id`
- `checkin_consents.booking_id`
- `checkin_consents.property_id`
- `checkin_forms.booking_id`
- `checkin_forms.requested_room_id`
- `checkin_forms.requested_room_type_id`
- `form_bookings.room_id`
- `form_bookings.room_type_id`
- `ical_uid_map.booking_id`
- `ical_uid_map.integration_id`
- `ical_uid_map.room_id`
- `ical_unassigned_events.integration_id`
- `rooms.room_type_id`

Semnificație:
- se preferă păstrarea istoricului sau a înregistrării principale, chiar dacă obiectul referit dispare

### Relații cu `DELETE RESTRICT` / `NO ACTION`
Observate:
- `properties.admin_id -> accounts.id` with `DELETE RESTRICT`
- `ical_type_integrations.room_id -> rooms.id` with `DELETE NO ACTION`
- `ical_unassigned_events.room_id -> rooms.id` with `DELETE NO ACTION`

Semnificație:
- există câteva puncte în care DB-ul nu vrea cleanup automat și cere ordine explicită la ștergere

## Practical Notes

- pentru debugging de delete chains, `accounts` și `properties` sunt primele noduri de urmărit
- pentru istoricul rezervărilor, relațiile `SET NULL` sunt importante: ele explică de ce anumite booking-uri pot rămâne valide chiar după cleanup parțial
- pentru zonele iCal și room mapping, relațiile `NO ACTION` trebuie reținute ca excepții operaționale

## Next Recommended Chapter

Următorul document bun pentru "DB Bible":
- primary keys
- unique constraints
- check constraints
- indexuri

Asta ar completa bine:
- `01_public_schema_structure.md`
- `02_public_schema_relationships.md`
