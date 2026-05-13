# Public Schema Known Notes

Status:
- capitol de note și observații construit din auditul `MAY 2026`
- fără query nou dedicat
- document de memorie operațională, nu de verdict definitiv

Scop:
- să adunăm într-un singur loc ce a ieșit în evidență în timpul inventarierii
- să știm ce merită reverificat când revenim la DB
- să separăm clar:
  - observații
  - outliers
  - posibile redundanțe
  - puncte bune de audit viitor

## Major Outliers

### `form_documents`

Observat:
- `RLS enabled = false`
- `policy_count = 0`
- grants largi pe `anon`, `authenticated`, `service_role`

De reținut:
- este cel mai clar outlier din schema `public`
- iese din modelul dominant al aplicației, unde aproape tot restul este protejat prin RLS + policies

Notă:
- această observație nu înseamnă automat că fluxul este greșit
- înseamnă doar că, în snapshot-ul actual, `form_documents` nu urmează modelul dominant al restului schemei

### Tabele cu `RLS enabled = true` dar `policy_count = 0`

Observate:
- `account_login_activity`
- `account_sync_events`
- `ical_suppressions`
- `stripe_events_processed`

De reținut:
- aceste tabele intră într-o categorie separată față de restul
- când revenim pe zona de acces, merită citite împreună cu modul concret în care sunt folosite din aplicație / service role

## Grants Notes

### Pattern dominant: grants foarte largi

Pe majoritatea tabelelor:
- `anon`
- `authenticated`
- `service_role`

au grants aproape complete.

De reținut:
- modelul actual pare să se bazeze în principal pe:
  - `RLS`
  - `policies`
  - helper functions de access

Interpretare practică:
- dacă analizăm un acces permis sau respins, grants-urile rareori vor fi explicația principală
- punctul cheie va fi mai des în policies și funcțiile de scope

### `accounts` este excepția clară

Observat:
- `anon = -`
- `authenticated = SELECT`
- `service_role = full`

De reținut:
- `accounts` are un model de grants mai strict decât restul
- este una dintre cele mai “speciale” tabele din schema `public`

### Impactul rollout-ului Supabase despre `GRANT`

Din auditul existent:
- tabelele actuale au grants deja prezente
- nu apare în snapshot cazul clasic:
  - tabel existent
  - folosit prin Data API
  - fără grants

Concluzie de memorie:
- riscul legat de acel rollout pare să fie mai ales pentru tabele noi viitoare, nu pentru inventarul curent

## Constraint Notes

### `account_sync_usage_kind_check`

Observat:
- numele sugerează validare pe `kind`
- clauza returnată în snapshot validează:
  - `event in ('sync_now', 'autosync')`

De reținut:
- merită reverificat când revenim la migrations sau la structura exactă a tabelului
- nu este un verdict de bug, doar un semnal de consistență semantică

### `account_users.role`

Observat în constraints:
- `role in ('admin', 'editor', 'viewer')`

Dar observat în indexuri:
- `account_users_one_owner_per_account`
  - index parțial pe `role = 'owner'`

De reținut:
- există o tensiune aparentă între:
  - valorile permise în check constraint
  - rolul sugerat de indexul parțial

Aceasta este una dintre cele mai importante note de consistență semantică din tot auditul.

## Index Notes

### Posibil duplicat pe `accounts.stripe_schedule_id`

Observate:
- `accounts_schedule_idx`
- `accounts_stripe_schedule_idx`

Ambele par să indexeze aceeași coloană:
- `stripe_schedule_id`

De reținut:
- merită verificat ulterior dacă sunt într-adevăr redundante
- nu schimbăm nimic acum

### Familie densă de indexuri pe `account_sync_usage`

Observate:
- `account_sync_usage_acc_evt_created_idx`
- `account_sync_usage_acc_kind_time`
- `idx_account_sync_usage_account_created`
- `idx_account_sync_usage_kind_created`

De reținut:
- merită privite împreună dacă ajungem la audit de performanță / redundanță

### `bookings` este una dintre cele mai sofisticate tabele din punct de vedere indexare

Observat:
- `GiST` pe overlap
- indexuri pe room/date
- lookup pe OTA/iCal
- unique parțial pe `property_id + ical_uid`

De reținut:
- dacă apar probleme de performanță sau comportament pe rezervări, `bookings` este primul loc bun de inspectat

## Policy Notes

### Pattern dominant: scope-based access

Scopes văzute clar în policies:
- `calendar`
- `guest_overview`
- `property_setup`
- `cleaning`
- `channels`

De reținut:
- acestea sunt cuvintele-cheie centrale ale modelului vostru de access
- când explicăm un flux de acces, aproape totul se reduce la unul dintre aceste scopes

### `roles = {public}` nu înseamnă neapărat acces anonim efectiv

Observat pe:
- `bookings`
- `cleaning_marks`
- `reservation_messages`
- `reservation_template_blocks`
- `reservation_template_fields`
- `reservation_templates`
- `room_variable_definitions`
- `room_variables`

Dar în expresiile policy apar:
- `auth.uid()`
- joins pe `account_users`
- verificări de admin/scopes

De reținut:
- semantic, multe dintre aceste politici sunt tot gated prin user autenticat și membership
- trebuie interpretate în context, nu doar după `roles = {public}`

### `form_bookings` are un model mai explicit și mai manual

Observat:
- nu se bazează doar pe helper functions simple
- folosește expresii mai lungi cu `account_users`
- combină:
  - role
  - scopes
  - disabled flag

De reținut:
- dacă există un tabel unde access logic pare mai “hand-crafted”, acesta este unul dintre ele

## Functions And Triggers Notes

### Funcții critice pentru modelul de acces

De reținut ca “fundamentale”:
- `account_can_read_scope(...)`
- `account_can_write_scope(...)`
- `is_account_member(...)`
- `is_account_admin(...)`
- `property_account_id(...)`
- `account_has_scope(...)`

Practic:
- când vrem să înțelegem RLS, acestea sunt primele funcții de citit

### `bookings` este nodul cu cea mai multă logică automată

Observat în triggere:
- prevenire relink form
- prevenire delete iCal fără suppression
- snapshot pentru reservation messages
- denormalizare `property_name`

De reținut:
- `bookings` nu este doar un tabel de date, ci și un centru de side-effects

### `property_name` este denormalizat automat

Observat în triggere pe:
- `bookings`
- `rooms`

De reținut:
- anumite valori sunt ținute sincron automat de DB
- când vedem date repetate, nu e neapărat miros de design; poate fi o alegere deliberată pentru UX/reporting

## Views Notes

### `accounts_local_time` este mai mult decât un simplu view

Observat:
- CTE
- lateral joins
- JSON aggregation
- noțiunea de `data_account_id`

De reținut:
- poate explica diferențe între ce pare a fi “owner direct” și ce apare în overview
- este un view de reporting relativ sofisticat

### `accounts_overview_admin` este varianta simplă

De reținut:
- bun pentru listări rapide
- mai ușor de validat manual decât `accounts_local_time`

## Naming / Consistency Notes

### Denumiri mixte

În schemă se văd mai multe stiluri:
- prefixe scurte:
  - `p_`
  - `ps_`
  - `bi_`
  - `rm_`
- prefixe descriptive:
  - `account_*`
  - `reservation_*`
- trigger naming mixt:
  - `trg_*`
  - funcții fără `trg_` dar folosite ca triggers

De reținut:
- schema este coerentă funcțional, dar nu perfect uniformă ca naming
- asta nu e o problemă urgentă, doar o notă de stil arhitectural

## Future Audit Checklist

Când revenim la DB, cele mai bune puncte de reverificat sunt:

1. `form_documents`
2. `account_users.role` vs `account_users_one_owner_per_account`
3. `account_sync_usage_kind_check`
4. posibilul duplicat pe `accounts.stripe_schedule_id`
5. familia de indexuri `account_sync_usage`
6. tabelele cu `RLS enabled = true` și `policy_count = 0`
7. semnătura și body-urile funcțiilor critice de access

## What This Chapter Is For

Acest document nu spune:
- “aici sigur e bug”
- “aici trebuie schimbat imediat”

Spune:
- “astea sunt locurile care merită ținute minte”
- “astea sunt nuanțele care s-au văzut în audit”
- “astea sunt punctele bune de reluare când revenim la DB”

## Bible Status

Cu acest capitol, “DB Bible” are o primă versiune foarte solidă:
- structură
- relații
- constrângeri
- indexuri
- funcții
- triggere
- views
- access model
- policy catalog
- known notes

Practic, pentru schema `public`, există deja o bază serioasă de orientare și memorie tehnică.
