# RLS Audit And Fixes

Documentam aici fiecare schimbare de RLS facuta pentru tabelele flaguite de Supabase, ca sa stim clar:
- de ce am intervenit
- cine foloseste tabelul
- ce SQL am rulat
- de ce consideram fixul safe
- ce ar trebui verificat daca apare un regres

## Tabele flaguite initial de Supabase

- `public.room_detail_checks`
- `public.ical_suppressions`
- `public.account_sync_usage`
- `public.billing_plans`
- `public.account_sync_events`
- `public.form_bookings`
- `public.form_documents`
- `public.stripe_events_processed`

---

## `public.billing_plans`

### De ce era flaguit

- Supabase semnala ca tabelul este in schema `public`, dar RLS nu era activ.

### La ce este folosit

- Catalog read-only pentru planuri.
- Citit direct in pagina de subscription:
  - `app/app/subscription/page.tsx`
- Folosit indirect de functii / politici care au nevoie de metadata despre plan:
  - sync interval
  - `allow_sync_now`
  - alte limite/features descrise in documentatie
- Runtime-ul principal al planului curent ramane bazat pe:
  - `accounts.plan`
  - `account_current_plan()`

Referinte utile:
- `app/app/subscription/page.tsx`
- `supabase/migrations/2025-09-13_drop_account_plan_and_quotas.sql`
- `supabase/docs/plan_policies_overview.sql`

### Risc daca porneam RLS prost

- Pagina de subscription nu mai putea incarca lista de planuri.
- Functiile/RPC-urile care citesc metadata din `billing_plans` puteau pica.
- UI-ul care afiseaza detalii despre planuri / limite putea deveni inconsistent.

### Ce am decis

- Activam RLS.
- Pastram `SELECT` public pentru ca tabelul functioneaza ca un catalog read-only.
- Nu adaugam politici de write.

### SQL rulat

Fisier migrare:
- `supabase/migrations/2026-04-01_billing_plans_enable_rls.sql`

Continut:

```sql
alter table public.billing_plans enable row level security;

drop policy if exists bp_select_public on public.billing_plans;

create policy bp_select_public
on public.billing_plans
for select
to public
using (true);
```

### De ce consideram fixul safe

- Nu schimba logica de business a planurilor.
- Nu schimba sursa de adevar pentru planul curent.
- Permite in continuare toate citirile legitime din app/RPC pentru catalog.
- Blocheaza doar accesul fara policy la alte operatii decat `SELECT`.

### Ce verificam daca apare un regres

- Pagina `/app/subscription` mai incarca lista de planuri.
- Badge-urile si etichetele de plan continua sa apara corect.
- Flow-urile de sync care depind de metadata din plan continua sa functioneze normal.

### Status

- Pregatit in migrare.
- Urmeaza sa continuam documentul pe masura ce rezolvam si celelalte tabele flaguite.

---

## `public.account_sync_usage`

### De ce era flaguit

- Supabase semnala ca tabelul este in schema `public`, dar RLS nu era activ.

### La ce este folosit

- Jurnal de usage pentru sincronizari, folosit la cooldown / throttling.
- Scris de:
  - cronul de autosync
    - `app/api/cron/ical/autosync/route.ts`
  - sync-urile manuale din app
    - `app/api/ical/sync/route.ts`
    - `app/api/ical/sync/type/route.ts`
    - `app/api/ical/sync/all/route.ts`
- Citit de:
  - `public.account_can_sync_now_v2(...)`
  - pentru a calcula cooldown-ul si slot gating-ul

Referinte utile:
- `supabase/migrations/2025-09-02_plan_limits.sql`
- `supabase/migrations/2025-10-06_account_can_sync_slots_5min.sql`
- `supabase/docs/plan_policies_overview.sql`

### Risc daca porneam RLS prost

- Sync Now putea incepe sa pice pentru userii autentificati.
- Cooldown-ul putea deveni inconsistent daca nu se mai scriau randurile de usage.
- Cronul putea parea afectat daca confundam accesul lui cu accesul userilor normali.

### Ce am decis

- Activam RLS.
- Pastram `INSERT` si `SELECT` pentru userii autentificati doar pe conturile din care fac parte.
- Folosim verificarea minima si stabila din `account_users`, fara dependinta de functii auxiliare care pot lipsi in unele medii.
- Nu adaugam politici publice.

### SQL rulat

Fisier migrare:
- `supabase/migrations/2026-04-01_account_sync_usage_enable_rls.sql`

Continut:

```sql
alter table public.account_sync_usage enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'account_sync_usage'
      and policyname = 'asu_ins'
  ) then
    execute $policy$
      create policy asu_ins
      on public.account_sync_usage
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.account_users au
          where au.account_id = account_sync_usage.account_id
            and au.user_id = auth.uid()
        )
      )
    $policy$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'account_sync_usage'
      and policyname = 'asu_sel'
  ) then
    execute $policy$
      create policy asu_sel
      on public.account_sync_usage
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.account_users au
          where au.account_id = account_sync_usage.account_id
            and au.user_id = auth.uid()
        )
      )
    $policy$;
  end if;
end
$$;
```

### De ce consideram fixul safe

- Se aliniaza cu usage-ul actual din API-uri si cu documentatia mai noua.
- Evita dependinta de `account_is_suspended(...)`, care in mediul tau actual nu exista.
- Cronul foloseste service role, deci nu ar trebui sa fie afectat de RLS.
- Userii autentificati pastreaza exact accessul de care au nevoie:
  - sa poata scrie usage pentru contul lor
  - sa poata citi usage pentru contul lor

### Ce verificam daca apare un regres

- `Sync Now` continua sa functioneze.
- Cronul de autosync continua sa ruleze normal.
- Nu apar erori noi la apelurile catre:
  - `account_can_sync_now_v2`
  - `account_register_sync_usage_v2`

### Status

- Pregatit in migrare.

---

## `public.account_sync_events`

### De ce era flaguit

- Supabase semnala ca tabelul este in schema `public`, dar RLS nu era activ.

### La ce este folosit

- In codul actual, nu am gasit usage activ in:
  - `app/`
  - `lib/`
- In afara documentatiei, apare doar in:
  - `supabase/migrations/2025-09-03_security_fixes.sql`
- In plus, tabelul este gol in mediul tau actual.

### Risc daca porneam RLS prost

- Foarte mic, pentru ca nu exista flow activ in cod care sa depinda de el acum.

### Ce am decis

- Activam doar RLS.
- Nu adaugam politici suplimentare pana cand nu exista un usage real in cod.

### SQL rulat

Fisier migrare:
- `supabase/migrations/2026-04-01_account_sync_events_enable_rls.sql`

Continut:

```sql
alter table public.account_sync_events enable row level security;
```

### De ce consideram fixul safe

- Tabelul este gol.
- Nu apare folosit in pagini sau API-uri.
- Nu adaugam politici care ar putea introduce comportamente nedorite.

### Ce verificam daca apare un regres

- Daca in viitor apare usage real pentru acest tabel, revenim si definim politicile minime necesare.

### Status

- Pregatit in migrare.

---

## `public.ical_suppressions`

### De ce era flaguit

- Supabase semnala ca tabelul este in schema `public`, dar RLS nu era activ.

### La ce este folosit

- Pastreaza perechi `property_id + ical_uid` pentru evenimente iCal sterse manual.
- Scris de:
  - `app/api/bookings/[id]/route.ts`
- Citit de:
  - `app/api/cron/ical/autosync/route.ts`
  - `app/api/ical/sync/all/route.ts`
  - `app/api/ical/sync/type/route.ts`
- Rol:
  - previne reimportul unui eveniment iCal sters manual din calendar

### Bug real descoperit in timpul auditului

- Lookup-ul din sync facea `select("id")`, dar tabelul nu are coloana `id`.
- Asta producea `400` pe requestul catre `ical_suppressions`.
- Efect:
  - suppression exista in DB
  - dar sync-ul o ignora si readucea evenimentul in calendar

Fix de cod aplicat:
- `app/api/cron/ical/autosync/route.ts`
- `app/api/ical/sync/all/route.ts`
- `app/api/ical/sync/type/route.ts`

Corectie:
- `select("id")` -> `select("property_id")`

### Risc daca porneam RLS prost

- Evenimentele iCal sterse manual puteau incepe sa reapara in calendar.
- Cronul si Sync Now puteau ignora suppression-urile reale.

### Ce am decis

- Activam doar RLS.
- Nu adaugam politici publice sau pentru `authenticated`.
- Tabelul este folosit doar server-side, deci varianta minima este cea mai sigura.

### SQL rulat

Fisier migrare:
- `supabase/migrations/2026-04-01_ical_suppressions_enable_rls.sql`

Continut:

```sql
alter table public.ical_suppressions enable row level security;
```

### De ce consideram fixul safe

- Scrierea se face server-side la delete booking.
- Citirea se face server-side in cron/sync.
- UI/browser nu are nevoie de acces direct la acest tabel.

### Ce verificam daca apare un regres

- Dupa stergerea unui eveniment iCal, `Sync now` nu il mai readuce.
- Autosync respecta suppression-ul pentru acelasi `property_id + ical_uid`.

### Status

- Pregatit in migrare.

---

## `public.room_detail_checks`

### De ce era flaguit

- Supabase semnala doua lucruri:
  - tabelul este in schema `public`, dar RLS nu era activ
  - existau deja policies create pe tabel, fara ca RLS sa fie pornit

### La ce este folosit

- Tabel activ de UI pentru checklist-ul per proprietate/camera.
- Citit de:
  - `app/app/propertySetup/ui/PropertySetupClient.tsx`
  - `app/app/calendar/ui/RoomDetailModal.tsx`
- Scris de:
  - `app/app/propertySetup/ui/PropertySetupClient.tsx`
    - insert
    - rename
    - toggle default
    - delete
    - reorder

### Ce exista deja in Supabase-ul real

- Tabelul are schema normala:
  - `id`
  - `property_id`
  - `label`
  - `default_value`
  - `sort_index`
  - `created_at`
- Exista deja policies:
  - `p_rdc_select`
  - `p_rdc_write`

Interpretare functionala:
- `p_rdc_select`
  - permite citire membrilor contului proprietatii
- `p_rdc_write`
  - permite scriere celor care au drept de write pe scope-ul `property_setup`

### Risc daca porneam RLS prost

- Property Setup nu mai putea incarca checklist-ul.
- Room Detail Modal nu mai putea afisa check-urile.
- Adminii sau membrii cu scope corect puteau pierde write access.

### Ce am decis

- Nu inventam politici noi.
- Activam doar RLS, pentru ca politicile exista deja in mediul real.

### SQL rulat

Fisier migrare:
- `supabase/migrations/2026-04-01_room_detail_checks_enable_rls.sql`

Continut:

```sql
alter table public.room_detail_checks enable row level security;
```

### De ce consideram fixul safe

- Nu schimba modelul de acces deja definit.
- Doar activeaza politicile existente.
- Se potriveste cu usage-ul real din UI.

### Ce verificam daca apare un regres

- In Property Setup se incarca lista de checks.
- Se poate adauga / redenumi / sterge / reordona un check.
- In Room Detail Modal se afiseaza check-urile proprietatii.

### Status

- Pregatit in migrare.

---

## `public.stripe_events_processed`

### De ce era flaguit

- Supabase semnala ca tabelul este in schema `public`, dar RLS nu era activ.

### La ce este folosit

- Tabel gandit ca jurnal de idempotency pentru evenimentele Stripe.
- Documentatia il descrie ca audit log pentru webhook:
  - `docs/ABONAMENTE_BILLING.md`
  - `supabase/migrations/2025-11-05_stripe_event_guards.sql`

Observatie importanta:
- In codul actual, webhook-ul Stripe nu pare sa scrie in acest tabel:
  - `app/api/billing/webhook/route.ts`
- Deci, in starea actuala a aplicatiei, tabelul pare mai degraba pregatit pentru safeguard-uri viitoare decat folosit activ la runtime.

### Risc daca porneam RLS prost

- Daca ulterior webhook-ul sau un job intern incepe sa scrie in tabel prin cai care nu ocolesc RLS, am putea bloca acea scriere.
- Daca am adauga politici inutile sau prea permisive, am complica fara motiv un tabel intern.

### Ce am decis

- Activam doar RLS.
- Nu adaugam politici publice de `SELECT`.
- Nu adaugam politici de write pentru useri normali.

### SQL rulat

Fisier migrare:
- `supabase/migrations/2026-04-01_stripe_events_processed_enable_rls.sql`

Continut:

```sql
alter table public.stripe_events_processed enable row level security;
```

### De ce consideram fixul safe

- In codul actual nu exista usage runtime confirmat pentru acest tabel.
- Nu schimbam niciun flow functional activ.
- Inchidem doar un tabel intern expus inutil in schema `public`.

### Ce verificam daca apare un regres

- Billing webhook continua sa functioneze normal.
- Nu apar erori noi in zona Stripe / subscriptions.

### Status

- Pregatit in migrare.

---

## `public.form_bookings`

### Starea initiala in Supabase

- `RLS = off`
- `0 policies`
- Foreign keys:
  - `property_id -> properties.id`
  - `room_id -> rooms.id`
  - `room_type_id -> room_types.id`
- Triggers:
  - niciun trigger pe tabelul `form_bookings`

### La ce este folosit

- Guestul scrie aici cand trimite formularul:
  - `app/api/checkin/submit/route.ts`
- Guest QR / retained data este citit server-side:
  - `app/r/ci/[id]/page.tsx`
- Guest Overview foloseste direct tabela din client:
  - `app/app/guest/ui/GuestOverviewClient.tsx`
- Link/edit prin UI trece prin:
  - `app/form-bookings/[id]/route.ts`
- Calendarul sincronizeaza datele spre formularul linkuit:
  - `app/app/calendar/ui/RoomDetailModal.tsx`
- Alte flow-uri server-side citesc/folosesc datele din formular:
  - `app/api/guest-overview/route.ts`
  - `app/api/checkin/confirm/route.ts`
  - `app/api/reservation-message/confirm-room/route.ts`
  - `app/api/bookings/[id]/contact/route.ts`

### Ce am decis

- Activam RLS.
- Adaugam politici doar pentru `authenticated`.
- Nu adaugam policy de `INSERT` pentru userii autentificati.
  - motiv: guest submission scrie server-side cu `service role`
- Permitem:
  - `SELECT`
  - `UPDATE`
  - `DELETE`
- Scope-uri permise:
  - `admin`
  - `guest_overview`
  - `calendar`
  - `reservations` (compat legacy)

### De ce modelul asta este safe

- Nu deschidem tabela catre guest/public prin RLS.
- Guest flow-ul public ramane prin rutele server-side existente.
- Pastram functionale exact flow-urile client-side confirmate in cod:
  - Guest Overview citeste direct
  - Guest Overview poate sterge formularul
  - Calendar poate actualiza datele formularului linkuit
- Nu dam `INSERT` direct din client, unde nu exista nevoie reala confirmata.

### SQL rulat

Fisier migrare:
- `supabase/migrations/2026-04-01_form_bookings_enable_rls.sql`

Continut:

```sql
alter table public.form_bookings enable row level security;

drop policy if exists p_fb_select_access on public.form_bookings;
create policy p_fb_select_access
on public.form_bookings
for select
to authenticated
using (
  exists (
    select 1
    from public.account_users au
    where au.account_id = public.property_account_id(form_bookings.property_id)
      and au.user_id = auth.uid()
      and coalesce(au.disabled, false) = false
      and (
        au.role = 'admin'
        or 'guest_overview' = any(au.scopes)
        or 'calendar' = any(au.scopes)
        or 'reservations' = any(au.scopes)
      )
  )
);

drop policy if exists p_fb_update_access on public.form_bookings;
create policy p_fb_update_access
on public.form_bookings
for update
to authenticated
using (
  exists (
    select 1
    from public.account_users au
    where au.account_id = public.property_account_id(form_bookings.property_id)
      and au.user_id = auth.uid()
      and coalesce(au.disabled, false) = false
      and (
        au.role = 'admin'
        or 'guest_overview' = any(au.scopes)
        or 'calendar' = any(au.scopes)
        or 'reservations' = any(au.scopes)
      )
  )
)
with check (
  exists (
    select 1
    from public.account_users au
    where au.account_id = public.property_account_id(form_bookings.property_id)
      and au.user_id = auth.uid()
      and coalesce(au.disabled, false) = false
      and (
        au.role = 'admin'
        or 'guest_overview' = any(au.scopes)
        or 'calendar' = any(au.scopes)
        or 'reservations' = any(au.scopes)
      )
  )
);

drop policy if exists p_fb_delete_access on public.form_bookings;
create policy p_fb_delete_access
on public.form_bookings
for delete
to authenticated
using (
  exists (
    select 1
    from public.account_users au
    where au.account_id = public.property_account_id(form_bookings.property_id)
      and au.user_id = auth.uid()
      and coalesce(au.disabled, false) = false
      and (
        au.role = 'admin'
        or 'guest_overview' = any(au.scopes)
        or 'calendar' = any(au.scopes)
        or 'reservations' = any(au.scopes)
      )
  )
);
```

### Revert rapid

```sql
drop policy if exists p_fb_select_access on public.form_bookings;
drop policy if exists p_fb_update_access on public.form_bookings;
drop policy if exists p_fb_delete_access on public.form_bookings;
alter table public.form_bookings disable row level security;
```

### Ce verificam daca apare un regres

- Guest Overview continua sa incarce formularele.
- Guest Overview poate edita / confirma / sterge formularul din modal.
- Calendar poate actualiza datele unui booking legat si poate oglindi datele in `form_bookings`.
- Guest submit continua sa creeze formulare noi.
- Pagina publica `app/r/ci/[id]/page.tsx` continua sa functioneze.

### Status

- Pregatit in migrare.
