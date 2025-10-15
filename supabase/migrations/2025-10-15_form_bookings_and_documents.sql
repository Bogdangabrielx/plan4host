-- form_bookings and form_documents schema + gating
-- Run this in Supabase SQL editor or via CLI migrations

-- Create table: form_bookings
create table if not exists public.form_bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  room_id uuid null references public.rooms(id) on delete set null,
  room_type_id uuid null references public.room_types(id) on delete set null,
  guest_first_name text null,
  guest_last_name  text null,
  guest_email      text null,
  guest_phone      text null,
  guest_address    text null,
  submitted_at     timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  state text not null default 'open' check (state in ('open','linked','cancelled')),
  ota_provider_hint text null
);

create index if not exists form_bookings_prop_dates_idx
  on public.form_bookings(property_id, start_date, end_date);
create index if not exists form_bookings_prop_state_idx
  on public.form_bookings(property_id, state);
create index if not exists form_bookings_room_idx on public.form_bookings(room_id);
create index if not exists form_bookings_room_type_idx on public.form_bookings(room_type_id);

-- Create table: form_documents (documents submitted with the form, before booking is linked)
create table if not exists public.form_documents (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.form_bookings(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  doc_type text null check (doc_type in ('id_card','passport')),
  storage_bucket text not null,
  storage_path text not null,
  mime_type text null,
  size_bytes bigint null,
  uploaded_at timestamptz not null default now(),
  doc_series text null,
  doc_number text null,
  doc_nationality text null
);

create index if not exists form_documents_form_idx on public.form_documents(form_id);
create index if not exists form_documents_prop_idx on public.form_documents(property_id);

-- Link from bookings to form_bookings
alter table public.bookings
  add column if not exists form_id uuid null references public.form_bookings(id) on delete set null;

-- Ensure a booking can be linked to at most one form and cannot be relinked once set
create unique index if not exists bookings_form_id_unique
  on public.bookings(form_id) where form_id is not null;

create or replace function public.bookings_prevent_relink_form()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and NEW.form_id is distinct from OLD.form_id then
    if OLD.form_id is not null then
      raise exception 'Booking already linked to a form. Relinking is not allowed.' using errcode = 'P0001';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_bookings_prevent_relink_form on public.bookings;
create trigger trg_bookings_prevent_relink_form
  before update of form_id on public.bookings
  for each row execute function public.bookings_prevent_relink_form();

-- Note: RLS policies to be defined per-tenant if RLS is enabled for these tables.
-- For now, keep RLS disabled or mirror policies from `bookings` in a follow-up migration.

