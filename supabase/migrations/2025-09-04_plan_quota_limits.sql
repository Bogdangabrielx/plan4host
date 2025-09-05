-- Quota limits by plan
-- Standard: max 3 properties per account, max 10 rooms per property
-- Premium: unlimited
-- Basic: unchanged (no hard cap here)

-- Helper: preferred plan comes from account_plan + billing_plans; fallback to accounts.plan
create or replace function public.account_effective_plan_slug(p_account_id uuid)
returns text
language sql
stable
as $$
  with ap as (
    select lower(trim(ap.plan_slug)) as slug
    from public.account_plan ap
    where ap.account_id = p_account_id
      and ap.status = 'active'
      and (ap.valid_until is null or ap.valid_until > now())
    order by ap.updated_at desc nulls last
    limit 1
  )
  select coalesce(
           (select slug from ap),
           case
             when a.valid_until is not null and a.valid_until <= now() then 'basic'
             when lower(trim(coalesce(a.plan::text,''))) like 'premium%%'  then 'premium'
             when lower(trim(coalesce(a.plan::text,''))) like 'standard%%' then 'standard'
             else 'basic'
           end
         ) as plan_slug
  from public.accounts a
  where a.id = p_account_id
  limit 1
$$;

-- Helper: limits for an account (reads billing_plans by slug)
create or replace function public.account_plan_limits(p_account_id uuid)
returns table(plan_slug text, max_properties int, max_rooms_per_property int)
language sql
stable
as $$
  select bp.slug::text as plan_slug,
         bp.max_properties,
         bp.max_rooms_per_property
  from public.billing_plans bp
  where lower(bp.slug) = public.account_effective_plan_slug(p_account_id)
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
      v_acc uuid;
      v_max int;
      v_cnt int := 0;
    begin
      -- determine account (prefer explicit account_id, else owner_id)
      v_acc := coalesce(new.account_id, new.owner_id);
      if v_acc is null then return new; end if;

      -- fetch limits (null means unlimited)
      select coalesce(plan_slug,'basic')::text, max_properties
        into v_plan, v_max
      from public.account_plan_limits(v_acc);

      if v_max is not null then
        select count(*) into v_cnt
        from public.properties p
        where coalesce(p.account_id, p.owner_id) = v_acc;
        if v_cnt >= v_max then
          raise exception 'plan_limit_properties: % plan allows up to % properties', v_plan, v_max
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
      v_acc uuid;
      v_plan text := 'basic';
      v_max int;
      v_cnt int := 0;
    begin
      if new.property_id is null then
        return new;
      end if;

      select coalesce(account_id, owner_id) into v_owner from public.properties where id = new.property_id;
      if v_owner is null then
        return new;
      end if;
      v_acc := v_owner;

      select coalesce(plan_slug,'basic')::text, max_rooms_per_property
        into v_plan, v_max
      from public.account_plan_limits(v_acc);

      if v_max is not null then
        select count(*) into v_cnt from public.rooms where property_id = new.property_id;
        if v_cnt >= v_max then
          raise exception 'plan_limit_rooms: % plan allows up to % rooms/property', v_plan, v_max
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
