-- plan4host — RPC: account_delete_property_self(p_property_id uuid)
-- Thin wrapper to delete a property owned by the caller's account.
-- Relies on RLS: properties delete is allowed for admin/editor with 'property_setup' (admin always allowed).

create or replace function public.account_delete_property_self(
  p_property_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $func$
declare
  v_exists boolean := false;
begin
  -- ensure the row exists (gives a friendlier error than a silent no-op)
  select true into v_exists from public.properties where id = p_property_id;
  if not coalesce(v_exists,false) then
    raise exception 'property_not_found' using errcode = 'P0001';
  end if;

  -- rely on RLS to enforce that caller can delete this row
  delete from public.properties where id = p_property_id;
end;
$func$;

-- Allow authenticated callers to execute
do $$ begin
  grant execute on function public.account_delete_property_self(uuid) to authenticated;
exception when others then null; end $$;

