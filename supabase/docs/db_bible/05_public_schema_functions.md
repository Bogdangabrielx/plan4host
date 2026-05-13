# Public Schema Functions

Status:
- inventariere funcțională pornită din snapshot-ul `MAY 2026`
- bazată pe `pg_proc`
- document de referință, nu migration

Query sursă:

```sql
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  l.lanname as language,
  case
    when p.prokind = 'f' then 'function'
    when p.prokind = 'p' then 'procedure'
    when p.prokind = 'a' then 'aggregate'
    when p.prokind = 'w' then 'window'
    else p.prokind::text
  end as kind
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where n.nspname = 'public'
order by p.proname, pg_get_function_identity_arguments(p.oid);
```

Observații generale:
- lista din `public` conține atât funcții de aplicație, cât și funcții venite din extensii Postgres
- pentru “DB Bible”, contează în primul rând funcțiile care:
  - susțin RLS
  - implementează logică de business
  - sunt apelate de triggere
- funcțiile `language = c` sunt în mare parte infrastructură de extensie și nu reprezintă logică de produs Plan4Host

## Application Functions

### Access And RLS Helpers

Acestea par să fie coloana vertebrală a politicilor și a verificărilor de acces.

#### `_account_self_with_boundary()`
- language: `sql`
- returns: `table(account_id uuid, current_boundary timestamptz)`
- rol probabil:
  - helper intern pentru contextul account-ului curent și eventuale limite/perioade active

#### `account_access_mode()`
- language: `plpgsql`
- returns: `text`
- rol probabil:
  - determină modul de acces al account-ului curent

#### `account_can_read_scope(p_account_id uuid, p_scope text)`
- language: `sql`
- returns: `boolean`
- rol:
  - verificare de citire pe scope
- foarte probabil folosit intens în RLS

#### `account_can_write_scope(p_account_id uuid, p_scope text)`
- language: `sql`
- returns: `boolean`
- rol:
  - verificare de scriere pe scope
- foarte probabil folosit intens în RLS

#### `account_has_scope(p_user_id uuid, p_account_id uuid, p_scope text)`
- language: `sql`
- returns: `boolean`
- rol:
  - helper de membership/scopes la nivel de user și account

#### `is_account_admin(p_account_id uuid)`
- language: `sql`
- returns: `boolean`
- rol:
  - verifică dacă userul curent este admin pe account

#### `is_account_member(p_account_id uuid)`
- language: `sql`
- returns: `boolean`
- rol:
  - verifică membership-ul în account

#### `property_account_id(p_property_id uuid)`
- language: `sql`
- returns: `uuid`
- rol:
  - traduce `property_id` în `account_id`
- funcție cheie pentru multe policies și join-uri logice

### Account, Billing And Lifecycle

#### `account_current_plan()`
- language: `sql`
- returns: `text`
- rol:
  - citește planul curent al account-ului curent

#### `account_is_premium(p_account_id uuid)`
- language: `sql`
- returns: `boolean`
- rol:
  - helper de eligibility pentru feature gating

#### `account_cancel_at_period_end_self(p_cancel boolean)`
- language: `sql`
- returns: `void`
- rol:
  - permite account-ului curent să-și seteze anularea la final de perioadă

#### `account_clear_scheduled_plan_self()`
- language: `sql`
- returns: `void`
- rol:
  - șterge plan change-ul programat pentru account-ul curent

#### `account_schedule_plan_self(p_plan_slug text)`
- language: `plpgsql`
- returns: `void`
- rol:
  - programează schimbarea de plan pentru account-ul curent

#### `account_grant_trial(p_account_id uuid, p_days integer)`
- language: `plpgsql`
- returns: `void`
- rol:
  - acordă trial unui account

#### `account_delete_self()`
- language: `plpgsql`
- returns: `void`
- rol:
  - self-delete de account

#### `account_delete_property_self(p_property_id uuid)`
- language: `plpgsql`
- returns: `void`
- rol:
  - ștergere de proprietate în context self-service

#### `account_delete_property_hard(p_property_id uuid)`
- language: `plpgsql`
- returns: `void`
- rol:
  - variantă mai agresivă / administrativă de delete pentru proprietate

#### `touch_account_activity()`
- language: `plpgsql`
- returns: `void`
- rol:
  - actualizează activitatea recentă a account-ului

### Sync And Limits

#### `account_can_sync_now_v2(p_account_id uuid, p_event_type text)`
- language: `plpgsql`
- returns: `jsonb`
- rol:
  - verifică dacă sync-ul manual sau auto este permis
  - returnând `jsonb`, probabil livrează și motiv/context, nu doar boolean

#### `account_register_sync_usage_v2(p_account_id uuid, p_event_type text)`
- language: `sql`
- returns: `void`
- rol:
  - înregistrează consumul de sync

### Property And Booking Logic

#### `create_property(p_name text, p_country_code text, p_timezone text, p_check_in_time text, p_check_out_time text)`
- language: `plpgsql`
- returns: `void`
- rol:
  - constructor de proprietate cu setup inițial

#### `assign_room_for_type(p_property_id uuid, p_room_type_id uuid, p_start_date date, p_end_date date, p_booking_id uuid)`
- language: `plpgsql`
- returns: `uuid`
- rol:
  - găsește / alocă o cameră pentru un tip de cameră și interval de rezervare
- foarte probabil funcție centrală pentru disponibilitate și room assignment

#### `snapshot_rm_for_booking(b_id uuid)`
- language: `plpgsql`
- returns: `void`
- rol:
  - face snapshot pentru `reservation_messages` sau datele asociate unei rezervări

## Trigger Functions

Acestea sunt funcții `return trigger` și trebuie corelate ulterior cu triggerele concrete.

### User And Account

#### `handle_new_user()`
- language: `plpgsql`
- returns: `trigger`
- rol probabil:
  - bootstrap la creare user nou

#### `sync_account_email_to_account_users()`
- language: `plpgsql`
- returns: `trigger`
- rol probabil:
  - sincronizează email-ul principal în `account_users`

#### `trg_accounts_create_onboarding_state()`
- language: `plpgsql`
- returns: `trigger`
- rol probabil:
  - creează starea inițială de onboarding la apariția unui account

#### `trg_account_onboarding_touch()`
- language: `plpgsql`
- returns: `trigger`
- rol probabil:
  - actualizează metadata / touch logic pentru onboarding

### Booking / Reservation

#### `bookings_prevent_relink_form()`
- language: `plpgsql`
- returns: `trigger`
- rol probabil:
  - împiedică relink-ul incorect al unui `form_id` pe booking

#### `trg_snapshot_rm_for_booking()`
- language: `plpgsql`
- returns: `trigger`
- rol probabil:
  - declanșează `snapshot_rm_for_booking(...)`

#### `set_property_name_from_properties()`
- language: `plpgsql`
- returns: `trigger`
- rol probabil:
  - denormalizează `property_name` din tabela `properties`

### Generic Maintenance

#### `set_updated_at()`
- language: `plpgsql`
- returns: `trigger`
- rol:
  - helper generic pentru coloana `updated_at`

#### `trg_touch_updated_at()`
- language: `plpgsql`
- returns: `trigger`
- rol probabil:
  - wrapper / adaptor trigger pentru `set_updated_at()`

### iCal / Deletion Safety

#### `prevent_ical_delete_without_suppression()`
- language: `plpgsql`
- returns: `trigger`
- rol probabil:
  - blochează ștergeri iCal fără suppressions/coregrafie corectă

## Likely Core Functions For RLS

Dintre toate, cele mai importante pentru politicile DB par să fie:
- `account_can_read_scope(...)`
- `account_can_write_scope(...)`
- `is_account_member(...)`
- `is_account_admin(...)`
- `property_account_id(...)`
- `account_has_scope(...)`

Acestea merită considerate “fundamentale” pentru înțelegerea accesului în schema `public`.

## Likely Core Functions For Product Logic

Dintre toate, cele mai importante pentru logică de produs par să fie:
- `create_property(...)`
- `assign_room_for_type(...)`
- `account_can_sync_now_v2(...)`
- `account_register_sync_usage_v2(...)`
- `snapshot_rm_for_booking(...)`
- `touch_account_activity()`
- `account_schedule_plan_self(...)`
- `account_delete_self()`

## Extension / Infrastructure Functions

Lista conține foarte multe funcții `language = c`, de exemplu:
- `gbt_*`
- `gbtreekey*_in/out`
- `*_dist`

Interpretare:
- acestea par venite din extensii Postgres, cel mai probabil legate de suportul pentru indexuri de tip `GiST` / `btree_gist`
- nu par a reprezenta logică de business Plan4Host
- pentru “DB Bible”, ele trebuie menționate ca infrastructură, nu documentate individual în profunzime

Exemple observate:
- `gbt_date_*`
- `gbt_int4_*`
- `gbt_uuid_*`
- `gbt_text_*`
- `gbt_ts_*`
- `gbt_tstz_*`
- `gbt_numeric_*`
- `gbtreekey16_in/out`
- `gbtreekey_var_in/out`
- `date_dist`
- `int4_dist`
- `float8_dist`
- `tstz_dist`

## Language Distribution

Din snapshot:
- `sql`
  Folosit mai ales pentru helpers simpli, RLS și operații scurte
- `plpgsql`
  Folosit pentru logică de business și triggere
- `c`
  Folosit pentru funcții de extensie / infrastructură Postgres

Interpretare:
- împărțirea este sănătoasă:
  - `sql` pentru expresii simple și helpers
  - `plpgsql` pentru workflows
  - `c` pentru mecanică internă de extensii

## Practical Notes

- când analizăm de ce un user vede sau nu vede date, primele funcții de verificat sunt cele de scope/membership
- când analizăm probleme pe room assignment sau conflicts, `assign_room_for_type(...)` merită citită prima
- când analizăm billing/sync gating, `account_can_sync_now_v2(...)` și funcțiile de plan sunt candidatele principale
- când vedem efecte “invizibile” la insert/update, trigger functions precum `set_updated_at()`, `handle_new_user()` și `trg_snapshot_rm_for_booking()` devin importante

## Known Notes

- `account_users_one_owner_per_account` din capitolul de indexuri sugerează existența unui rol `owner`, dar în constraints pe `account_users.role` snapshot-ul arăta `admin/editor/viewer`
- aici încă nu vedem toate definițiile funcțiilor, doar semnăturile
- deci pentru audit complet al logicii, un pas viitor util este documentarea body-urilor funcțiilor critice

## Next Recommended Chapter

Următorul capitol foarte bun:
- triggerele efective
- pe ce tabele rulează
- `before/after insert/update/delete`
- ce funcție apelează fiecare

Acolo vom putea lega clar:
- trigger function
- tabelul pe care rulează
- efectul operațional real
