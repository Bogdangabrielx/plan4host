-- Cleaning marks: attribution for who marked a room as cleaned on a given date

create table if not exists public.cleaning_marks (
  property_id uuid not null,
  room_id uuid not null,
  clean_date date not null,
  cleaned_by_user_id uuid not null,
  cleaned_by_email text,
  cleaned_at timestamptz not null default now(),
  constraint cleaning_marks_pkey primary key (property_id, room_id, clean_date)
);

alter table public.cleaning_marks enable row level security;

-- SELECT: allowed to members with scope 'cleaning' (or admin), by property membership
drop policy if exists p_cm_select on public.cleaning_marks;
create policy p_cm_select on public.cleaning_marks
  for select using (
    exists (
      select 1
      from public.properties p
      join public.account_users au
        on au.account_id = p.account_id and au.user_id = auth.uid() and coalesce(au.disabled,false) = false
      where p.id = cleaning_marks.property_id
        and (au.role = 'admin' or 'cleaning' = any(au.scopes))
    )
  );

-- INSERT/UPDATE: allowed to members with 'cleaning' scope on Standard/Premium plans
drop policy if exists p_cm_write_ins on public.cleaning_marks;
create policy p_cm_write_ins on public.cleaning_marks
  for insert with check (
    exists (
      select 1
      from public.properties p
      join public.accounts acc on acc.id = p.account_id
      join public.account_users au
        on au.account_id = p.account_id and au.user_id = auth.uid() and coalesce(au.disabled,false) = false
      where p.id = cleaning_marks.property_id
        and (au.role = 'admin' or 'cleaning' = any(au.scopes))
        and lower(coalesce(acc.plan::text,'basic')) in ('standard','premium')
    )
  );

drop policy if exists p_cm_write_upd on public.cleaning_marks;
create policy p_cm_write_upd on public.cleaning_marks
  for update using (
    exists (
      select 1
      from public.properties p
      join public.accounts acc on acc.id = p.account_id
      join public.account_users au
        on au.account_id = p.account_id and au.user_id = auth.uid() and coalesce(au.disabled,false) = false
      where p.id = cleaning_marks.property_id
        and (au.role = 'admin' or 'cleaning' = any(au.scopes))
        and lower(coalesce(acc.plan::text,'basic')) in ('standard','premium')
    )
  );
