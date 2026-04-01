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
