alter table public.billing_plans enable row level security;

drop policy if exists bp_select_public on public.billing_plans;

create policy bp_select_public
on public.billing_plans
for select
to public
using (true);
