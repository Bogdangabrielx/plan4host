-- plan4host — Properties.account_id migration (mirror + sync)
-- Date: 2025-09-13
-- Purpose:
--   Replace legacy naming 'owner_id' with neutral 'account_id' on public.properties
--   without breaking existing code. We add account_id, backfill, add FK, and
--   keep owner_id in sync via a trigger. Application code can safely migrate to
--   use account_id; later, owner_id can be dropped.

/* 1) Add column + backfill + FK */
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='properties' and column_name='account_id'
  ) then
    alter table public.properties add column account_id uuid;
  end if;
end $$;

update public.properties
   set account_id = coalesce(account_id, owner_id)
 where account_id is null;

-- Add FK (idempotent)
do $$ begin
  begin
    alter table public.properties
      add constraint properties_account_id_fkey
      foreign key (account_id)
      references public.accounts(id)
      on update cascade on delete restrict;
  exception when duplicate_object then null; end;
end $$;

-- Enforce NOT NULL after backfill
do $$ begin
  begin alter table public.properties alter column account_id set not null; exception when others then null; end;
end $$;

/* 2) Keep owner_id <-> account_id in sync (compat window) */
create or replace function public.properties_sync_account_id()
returns trigger
language plpgsql
as $fn$
begin
  new.account_id := coalesce(new.account_id, new.owner_id);
  new.owner_id   := coalesce(new.owner_id,   new.account_id);
  return new;
end;
$fn$;

do $$ begin
  begin drop trigger if exists trg_properties_sync_account on public.properties; exception when others then null; end;
  begin
    create trigger trg_properties_sync_account
    before insert or update on public.properties
    for each row execute function public.properties_sync_account_id();
  exception when duplicate_object then null; end;
end $$;

/* 3) Helper for tenant key from property id */
create or replace function public.property_account_id(p_property_id uuid)
returns uuid
language sql
stable
security invoker
as $$
  select coalesce(account_id, owner_id) from public.properties where id = p_property_id
$$;

-- End of migration

