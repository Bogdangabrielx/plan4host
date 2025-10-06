-- Switch autosync staggering to 5-minute rounds (finer distribution)
-- Premium: every 10 minutes (slot_mod=2 over 5-minute rounds)
-- Standard: every 30 minutes (slot_mod=6)
-- Basic: every 60 minutes (slot_mod=12)

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

  v_round_index bigint;      -- 5-min rounds since epoch
  v_slot_mod int := 1;       -- slot divisor per plan (1=no staggering)
  v_slot_idx int := 0;       -- deterministic per account
  v_slot_now int := 0;       -- current round bucket
  v_round_seconds int := 300; -- 5 minutes
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

  -- Deterministic staggering for autosync only (no change for sync_now)
  if p_event_type = 'autosync' then
    -- Compute round index: one round every 5 minutes
    v_round_index := floor(extract(epoch from v_now) / v_round_seconds);

    -- Decide slot modulus by plan (over 5-minute rounds)
    if v_plan = 'premium' then
      v_slot_mod := 2;   -- 10 minutes
    elsif v_plan = 'standard' then
      v_slot_mod := 6;   -- 30 minutes
    elsif v_plan = 'basic' then
      v_slot_mod := 12;  -- 60 minutes
    else
      v_slot_mod := 12;  -- default to basic behavior
    end if;

    if v_slot_mod > 1 then
      -- Deterministic per-account slot index in [0 .. v_slot_mod-1]
      v_slot_idx := abs(hashtextextended(p_account_id::text, 0)) % v_slot_mod;
      v_slot_now := (v_round_index % v_slot_mod)::int;

      if v_slot_now <> v_slot_idx then
        -- Not this round; report how many rounds remain until its slot
        return jsonb_build_object(
          'allowed', false,
          'reason', 'slot_wait',
          'cooldown_remaining_sec', 0,
          'remaining_in_window', (case when v_slot_now < v_slot_idx then (v_slot_idx - v_slot_now) else (v_slot_mod - (v_slot_now - v_slot_idx)) end),
          'retry_after_sec', ((case when v_slot_now < v_slot_idx then (v_slot_idx - v_slot_now) else (v_slot_mod - (v_slot_now - v_slot_idx)) end) * v_round_seconds)
        );
      end if;
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

