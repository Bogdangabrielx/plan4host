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

- Nu exista consum direct din UI.
- Nu exista citiri publice legitime pe acest tabel.
- Tabelul este intern, iar activarea simpla a RLS reduce expunerea fara sa afecteze un flow public.
- Daca un flow intern va folosi ulterior service role, acesta ramane compatibil.

### Ce verificam daca apare un regres

- Stripe webhook continua sa functioneze normal.
- Nu apar erori noi in zona de billing/webhook.
- Daca pe viitor legam webhook-ul la acest tabel, revenim si documentam explicit politica necesara.

### Status

- Pregatit in migrare.
