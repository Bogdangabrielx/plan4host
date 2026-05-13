# Public Schema Views

Status:
- inventariere de views pornită din snapshot-ul `MAY 2026`
- bazată pe `information_schema.views`
- document de referință, nu migration

Query sursă:

```sql
select
  table_name as view_name,
  view_definition
from information_schema.views
where table_schema = 'public'
order by table_name;
```

Observații generale:
- în snapshot apar două views în `public`
- ambele sunt orientate spre overview / reporting administrativ
- ambele folosesc agregări pe `accounts`, `properties`, `bookings` și formatează timpul în fusul `Europe/Bucharest`

## View Catalog

### `accounts_local_time`

Scop probabil:
- dashboard administrativ sau intern cu perspectivă extinsă asupra activității unui account
- agregă nu doar date brute de account, ci și indicatori operaționali derivați

Elemente importante din definiție:
- pornește dintr-un CTE numit `account_scope`
- pentru fiecare account, încearcă să determine un `data_account_id`
  - fie account-ul în sine
  - fie primul `account_users.account_id` activ în care acel user apare ca membru și care este diferit de `a.id`

Coloane expuse:
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

Agregări importante:
- număr de proprietăți
- număr de rezervări
- număr de reservation templates
- număr total de formulare
- număr de formulare încă deschise / pending
- număr de integrări iCal
- listă JSON cu provideri iCal distincți

Elemente speciale:
- `last_activity_ro`
  - formatare explicită în `Europe/Bucharest`
- `current_booking_dates`
  - ia primul booking activ în ziua curentă
- `next_booking_dates`
  - ia primul booking viitor
- `ical_integrations`
  - construiește JSONB cu provideri distincți

Interpretare:
- este un view bogat, orientat spre ops/admin
- nu este doar o proiecție simplă, ci un mini-raport agregat per account
- faptul că folosește `data_account_id` sugerează că încearcă să acopere și scenarii în care userul este membru într-un alt account

Posibile utilizări:
- CRM intern
- dashboard operațional
- customer success
- suport / debugging rapid pe usage

### `accounts_overview_admin`

Scop probabil:
- overview administrativ mai simplu decât `accounts_local_time`
- focus pe date de account + câțiva indicatori de volum

Coloane expuse:
- `id`
- `email`
- `plan`
- `company`
- `last_activity_at`
- `last_activity_ro`
- `properties_count`
- `bookings_count`

Agregări importante:
- număr de proprietăți per `admin_id`
- număr de bookings per `admin_id`

Elemente speciale:
- și aici `last_activity_ro` este formatat în `Europe/Bucharest`
- view-ul este mult mai simplu decât `accounts_local_time`

Interpretare:
- acesta pare un overview administrativ mai “light”
- probabil potrivit pentru listări rapide și management comercial / billing / success

## Comparison Between Views

### `accounts_local_time`
- mai bogat
- include forms, templates, iCal, booking windows
- tratează explicit și noțiunea de `data_account_id`
- potrivit pentru analiză operațională mai detaliată

### `accounts_overview_admin`
- mai simplu
- include doar plan, company, activity, properties, bookings
- potrivit pentru listă scurtă de admin/accounts

## Shared Patterns

Ambele views:
- pornesc din `accounts`
- agregă prin `properties.admin_id`
- folosesc `to_char(... AT TIME ZONE 'Europe/Bucharest', 'DD-MM-YYYY HH24:MI:SS')`
- folosesc `COALESCE(...)` pentru a evita `NULL` în rezultate numerice

Concluzie:
- există un pattern clar de reporting intern centrat pe account
- aceste views par construite pentru consum direct în admin / backoffice

## Practical Notes

- dacă vedem diferențe între numerele din admin și numerele brute din tabele, aceste două views sunt primele locuri bune de verificat
- `accounts_local_time` este mai sensibil la complexitate, pentru că are:
  - CTE
  - multiple left joins agregate
  - lateral joins
  - JSON aggregation

- `accounts_overview_admin` este mai simplu și mai ușor de validat manual

## Data Modeling Notes

### `data_account_id` in `accounts_local_time`
Acesta este probabil cel mai interesant element din tot view-ul:
- pentru un account, dacă există membership activ într-un alt `account_id`, view-ul poate folosi acel account pentru agregări
- asta înseamnă că view-ul nu este strict “despre account ca owner”, ci poate fi și “despre user în contextul account-ului în care operează”

Această nuanță merită ținută minte, pentru că poate explica de ce unele totaluri din `accounts_local_time` nu sunt 1:1 cu `accounts.id` ca owner direct.

## Performance Notes

Din definiții:
- ambele views agregă prin `properties.admin_id`
- `accounts_local_time` mai citește și:
  - `form_bookings`
  - `reservation_templates`
  - `ical_type_integrations`
  - `bookings`

Din capitolul de indexuri, aceste views beneficiază în special de:
- `properties_account_active_idx`
- `idx_rm_templates_property`
- `form_bookings_prop_dates_idx`
- `form_bookings_prop_state_idx`
- `idx_ical_type_integrations_pt`
- indexurile din `bookings` și `accounts`

## What We Have Now

După acest capitol, “DB Bible” acoperă:
- tabele
- relații
- constrângeri
- indexuri
- funcții
- triggere
- views

Asta înseamnă că aproape toate obiectele DB principale din `public` sunt deja inventariate într-o formă ușor de recitit.

## Next Recommended Chapter

Cele mai valoroase continuări ar fi:
- `08_public_schema_access_model.md`
  Pentru grants, RLS, policies și helper functions de acces

- `09_public_schema_known_notes.md`
  Pentru observații, outliers, redundanțe și puncte de audit viitoare

Dacă vrei utilitate practică imediată, următorul pas cel mai bun este:
- `access model`
