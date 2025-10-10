-- Align bookings SELECT with canonical scope 'calendar' and allow 'cleaning' read

-- Optional: drop legacy policy if needed (kept for compatibility)
-- drop policy if exists p_bookings_reservations_access on public.bookings;

-- Add/replace policy to permit SELECT for admin, or members with 'calendar' OR 'cleaning'
drop policy if exists p_bookings_select_calendar_cleaning on public.bookings;
create policy p_bookings_select_calendar_cleaning on public.bookings
  for select using (
    exists (
      select 1
      from public.properties p
      join public.account_users au
        on au.account_id = p.account_id and au.user_id = auth.uid() and coalesce(au.disabled,false) = false
      where p.id = bookings.property_id
        and (au.role = 'admin' or 'calendar' = any(au.scopes) or 'cleaning' = any(au.scopes))
    )
  );

