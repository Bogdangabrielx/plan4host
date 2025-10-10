-- Add default_value to reservation_template_fields for predefined variable values

alter table if exists public.reservation_template_fields
  add column if not exists default_value text;

