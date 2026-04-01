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
