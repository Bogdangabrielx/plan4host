-- Guest AI Assistant — DB support
-- - Adds an optional free‑text column on properties for AI‑ready house rules
-- - Ensures a configurable check‑out time exists on properties

do $$
begin
  -- 1) AI house rules text used by Guest AI assistant
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'properties'
      and column_name  = 'ai_house_rules_text'
  ) then
    alter table public.properties
      add column ai_house_rules_text text null;
  end if;

  -- 2) Check‑out default time (already used in several APIs; guard in case it was created manually)
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'properties'
      and column_name  = 'check_out_time'
  ) then
    alter table public.properties
      add column check_out_time text null;
  end if;
end $$;

