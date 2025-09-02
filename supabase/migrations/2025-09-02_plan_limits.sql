-- plan4host: New plan-based limits (compatible with existing live schema)
-- - Autosync cooldowns only: Basic 60m, Standard 30m, Premium 10m
-- - Sync Now: Premium-only, cooldown 2m, exposes retry_after_sec

-- 1) Ensure usage index on existing schema (uses column 'event')
create index if not exists account_sync_usage_acc_evt_created_idx
  on public.account_sync_usage (account_id, event, created_at desc);

-- 2) Current plan helper (idempotent)
create or replace function public.account_current_plan()
returns text
language sql
stable
as $$
  select lower(coalesce(a.plan::text, 'basic'))::text
  from public.accounts a
  join public.account_users au on au.account_id = a.id
  where au.user_id = auth.uid()
  order by a.created_at asc
  limit 1
$$;

-- 3) Register usage (idempotent)
-- 3) New usage function with stable signature (does not drop old)
create or replace function public.account_register_sync_usage_v2(
  p_account_id uuid,
  p_event_type text
)
returns void
language sql
as $$
  insert into public.account_sync_usage(account_id, event)
  values (p_account_id, p_event_type);
$$;

-- 4) New gating logic (cooldown-only + premium-only for sync_now)
create or replace function public.account_can_sync_now_v2(
  p_account_id uuid,
  p_event_type text
)
returns jsonb
language plpgsql
stable
as $$
declare
  v_plan text;
  v_valid_until timestamptz;
  v_now timestamptz := now();

  v_cooldown_sec int := 0;  -- computed below
  v_last timestamptz;
  v_since_sec int := 0;
  v_remaining_sec int := 0; -- cooldown remaining
begin
  -- Resolve plan with expiry fallback
  select lower(coalesce(plan::text,'basic')), valid_until
  into v_plan, v_valid_until
  from public.accounts where id = p_account_id;

  if v_plan is null then v_plan := 'basic'; end if;
  if v_valid_until is not null and v_valid_until <= v_now then
    v_plan := 'basic';
  end if;

  -- Determine cooldown by event type and plan
  if p_event_type = 'autosync' then
    -- Basic: 60m, Standard: 30m, Premium: 10m
    case v_plan
      when 'premium'  then v_cooldown_sec := 10 * 60;
      when 'standard' then v_cooldown_sec := 30 * 60;
      else                 v_cooldown_sec := 60 * 60; -- basic
    end case;
  elsif p_event_type = 'sync_now' then
    -- Premium only, cooldown 2m
    if v_plan <> 'premium' then
      return jsonb_build_object(
        'allowed', false,
        'reason', 'sync_now_only_on_premium',
        'cooldown_remaining_sec', 0,
        'remaining_in_window', null,
        'retry_after_sec', null
      );
    end if;
    v_cooldown_sec := 2 * 60;
  else
    return jsonb_build_object(
      'allowed', false,
      'reason', 'invalid_event_type',
      'cooldown_remaining_sec', 0,
      'remaining_in_window', null,
      'retry_after_sec', null
    );
  end if;

  -- Cooldown check (based on last accepted usage)
  select max(created_at) into v_last
  from public.account_sync_usage
  where account_id = p_account_id and event = p_event_type;

  if v_last is not null then
    v_since_sec := greatest(0, floor(extract(epoch from (v_now - v_last)))::int);
    v_remaining_sec := greatest(v_cooldown_sec - v_since_sec, 0);
    if v_remaining_sec > 0 then
      return jsonb_build_object(
        'allowed', false,
        'reason', 'cooldown',
        'cooldown_remaining_sec', v_remaining_sec,
        'remaining_in_window', null,
        'retry_after_sec', v_remaining_sec
      );
    end if;
  end if;

  -- Allowed
  return jsonb_build_object(
    'allowed', true,
    'reason', null,
    'cooldown_remaining_sec', 0,
    'remaining_in_window', null,
    'retry_after_sec', 0
  );
end;
$$;
