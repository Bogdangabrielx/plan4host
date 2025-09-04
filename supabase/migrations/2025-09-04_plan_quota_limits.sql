-- Quota limits by plan
-- Standard: max 3 properties per account, max 10 rooms per property
-- Premium: unlimited
-- Basic: unchanged (no hard cap here)

-- Helper: effective plan for account (falls back to basic when expired/missing)
create or replace function public.account_effective_plan(p_account_id uuid)
returns text
language sql
stable
as $$
  select case
           when a.valid_until is not null and a.valid_until <= now() then 'basic'
           else lower(coalesce(a.plan::text, 'basic'))
         end
  from public.accounts a
  where a.id = p_account_id
  limit 1
$$;

-- Enforce property quota (before insert on properties)
do $$ begin
  if to_regclass('public.properties') is not null then
    create or replace function public.trg_enforce_property_quota()
    returns trigger
    language plpgsql
    as $PROP$
    declare
      v_plan text := 'basic';
      v_cnt int := 0;
    begin
      if new.owner_id is null then
        return new;
      end if;

      select public.account_effective_plan(new.owner_id) into v_plan;
      if v_plan = 'standard' then
        select count(*) into v_cnt from public.properties where owner_id = new.owner_id;
        if v_cnt >= 3 then
          raise exception 'plan_limit_properties: Standard plan allows up to 3 properties'
            using errcode = 'P0001';
        end if;
      end if;
      return new;
    end
    $PROP$;

    begin
      drop trigger if exists trg_enforce_property_quota on public.properties;
      create trigger trg_enforce_property_quota
        before insert on public.properties
        for each row execute function public.trg_enforce_property_quota();
    exception when others then null; end;
  end if;
end $$;

-- Enforce rooms quota (before insert on rooms)
do $$ begin
  if to_regclass('public.rooms') is not null and to_regclass('public.properties') is not null then
    create or replace function public.trg_enforce_room_quota()
    returns trigger
    language plpgsql
    as $ROOM$
    declare
      v_owner uuid;
      v_plan text := 'basic';
      v_cnt int := 0;
    begin
      if new.property_id is null then
        return new;
      end if;

      select owner_id into v_owner from public.properties where id = new.property_id;
      if v_owner is null then
        return new;
      end if;

      select public.account_effective_plan(v_owner) into v_plan;
      if v_plan = 'standard' then
        select count(*) into v_cnt from public.rooms where property_id = new.property_id;
        if v_cnt >= 10 then
          raise exception 'plan_limit_rooms: Standard plan allows up to 10 rooms per property'
            using errcode = 'P0001';
        end if;
      end if;
      return new;
    end
    $ROOM$;

    begin
      drop trigger if exists trg_enforce_room_quota on public.rooms;
      create trigger trg_enforce_room_quota
        before insert on public.rooms
        for each row execute function public.trg_enforce_room_quota();
    exception when others then null; end;
  end if;
end $$;
