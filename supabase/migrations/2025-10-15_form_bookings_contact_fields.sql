-- Add separate contact fields to form_bookings for proper mapping into booking_contacts on link
alter table public.form_bookings
  add column if not exists guest_city text null,
  add column if not exists guest_country text null;

