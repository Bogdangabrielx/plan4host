-- 2025-11-29 — Check-in companions JSON columns
-- This migration was applied manually in Supabase to support storing
-- additional guests (companions) in a single JSONB column on both
-- form_bookings and bookings tables.

-- Add guest_companions JSONB to form_bookings (if missing)
alter table public.form_bookings
  add column if not exists guest_companions jsonb not null default '[]'::jsonb;

-- Add guest_companions JSONB to bookings (if missing)
alter table public.bookings
  add column if not exists guest_companions jsonb not null default '[]'::jsonb;

