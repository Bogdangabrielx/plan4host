-- plan4host — Billing invoices/transactions snapshot
-- Date: 2025-11-02

/* =============================================
   1) billing_invoices — per-invoice snapshot
   ============================================= */

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,

  -- Stripe identifiers
  stripe_invoice_id text not null unique,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_customer_id text,
  stripe_subscription_id text,

  -- Display/metadata
  number text,                 -- Stripe invoice number (optional; accounting issues real invoices elsewhere)
  status text,                 -- 'paid' | 'open' | 'void' | 'uncollectible' | 'draft' | 'failed'

  -- Amounts (minor units)
  currency text not null,
  subtotal integer,
  tax integer,
  total integer not null,

  -- Plan mapping
  price_id text,
  plan_slug text,

  -- Period covered
  period_start timestamptz,
  period_end   timestamptz,

  -- Links
  hosted_invoice_url text,
  invoice_pdf_url    text,

  -- Customer snapshot (from invoice)
  customer_name text,
  customer_email text,
  customer_tax_id text,
  customer_address jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Optional CHECK for plan slug values
do $$ begin
  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_schema='public' and table_name='billing_invoices' and constraint_name='billing_invoices_plan_check'
  ) then
    alter table public.billing_invoices
      add constraint billing_invoices_plan_check
      check (plan_slug is null or lower(plan_slug) in ('basic','standard','premium'));
  end if;
exception when others then null; end $$;

create index if not exists bi_account_created_idx on public.billing_invoices(account_id, created_at desc);
create index if not exists bi_payment_intent_idx on public.billing_invoices(stripe_payment_intent_id);

-- updated_at trigger (reuses global helper)
drop trigger if exists trg_bi_touch on public.billing_invoices;
create trigger trg_bi_touch
  before update on public.billing_invoices
  for each row execute function public.trg_touch_updated_at();

-- RLS
alter table public.billing_invoices enable row level security;

-- Service role: full access
do $$ begin
  create policy bi_all_service on public.billing_invoices
    for all to service_role
    using (true)
    with check (true);
exception when duplicate_object then null; end $$;

-- Authenticated users: read own
do $$ begin
  create policy bi_select_own on public.billing_invoices
    for select to authenticated
    using (account_id = auth.uid());
exception when duplicate_object then null; end $$;

-- End of migration
