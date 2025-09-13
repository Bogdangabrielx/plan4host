-- plan4host — Drop account_plan and related functions/quotas
-- Safe/idempotent cleanup. Run in production to consolidate on accounts.plan.

-- 1) Drop quota triggers (rooms/properties) and their functions
do $$ begin
  begin drop trigger if exists trg_enforce_property_quota on public.properties; exception when others then null; end;
  begin drop trigger if exists trg_enforce_room_quota     on public.rooms;      exception when others then null; end;

  begin drop function if exists public.trg_enforce_property_quota(); exception when others then null; end;
  begin drop function if exists public.trg_enforce_room_quota();     exception when others then null; end;
end $$;

-- 2) Drop functions that depended on account_plan
do $$ begin
  begin drop function if exists public.account_plan_limits(uuid);          exception when others then null; end;
  begin drop function if exists public.account_effective_plan_slug(uuid);  exception when others then null; end;
end $$;

-- 3) Drop table account_plan (if present)
do $$ begin
  if to_regclass('public.account_plan') is not null then
    begin
      drop table if exists public.account_plan cascade;
    exception when others then null; end;
  end if;
end $$;

-- Notes:
-- - Runtime reads plan from accounts.plan only.
-- - billing_plans remains as catalog for plan features.
-- - This migration is safe to rerun (guards are in place).

