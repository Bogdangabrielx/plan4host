-- Indexes to keep checkin_consents fast (audit/select)

-- Fast lookup by booking
create index if not exists ix_cc_booking
  on public.checkin_consents(booking_id);

-- Common queries: by property + purpose ordered by time (latest first)
create index if not exists ix_cc_property_purpose_created
  on public.checkin_consents(property_id, purpose, created_at desc);

-- Optional: find by email quickly (nullable)
create index if not exists ix_cc_email
  on public.checkin_consents(email);

