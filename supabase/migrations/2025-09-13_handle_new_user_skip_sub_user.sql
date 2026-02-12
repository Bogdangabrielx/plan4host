-- Skip tenant bootstrap for Team-created sub users
-- If auth.users row has app_metadata.sub_user = true, do NOT create
-- accounts/account_users(admin) or grant trial.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_is_sub boolean := false;
begin
  -- Detect sub-user created via Team (set by API using service role)
  begin
    v_is_sub := coalesce((new.raw_app_meta_data ->> 'sub_user')::boolean, false);
  exception when others then v_is_sub := false; end;

  if v_is_sub then
    return new;
  end if;

  -- Owner/admin bootstrap (self-serve signup or OAuth)
  begin
    insert into public.accounts(id, email)
      values (new.id, new.email)
    on conflict (id) do update
      set email = excluded.email;
  exception when others then null; end;

  begin
    insert into public.account_users(account_id, user_id, role, scopes, disabled)
      values (new.id, new.id, 'admin', '{}'::text[], false)
    on conflict (account_id, user_id)
      do update set role = 'admin', disabled = false;
  exception when others then null; end;

  begin
    perform public.account_grant_trial(new.id, 30);
  exception when others then null; end;

  return new;
end;
$fn$;

-- reattach trigger (no-op if already attached)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
