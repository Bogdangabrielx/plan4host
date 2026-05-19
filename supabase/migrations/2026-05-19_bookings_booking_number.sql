-- Internal booking number, generated once in DB and used only for exports / ops.

begin;

create sequence if not exists public.bookings_booking_number_seq;

alter table public.bookings
  add column if not exists booking_number bigint;

alter table public.bookings
  alter column booking_number set default nextval('public.bookings_booking_number_seq');

alter sequence public.bookings_booking_number_seq
  owned by public.bookings.booking_number;

grant usage, select on sequence public.bookings_booking_number_seq
  to authenticated, service_role;

select setval(
  'public.bookings_booking_number_seq',
  coalesce((select max(booking_number) from public.bookings), 0) + 1,
  false
);

update public.bookings
set booking_number = nextval('public.bookings_booking_number_seq')
where booking_number is null;

alter table public.bookings
  alter column booking_number set not null;

create unique index if not exists bookings_booking_number_key
  on public.bookings (booking_number);

commit;
