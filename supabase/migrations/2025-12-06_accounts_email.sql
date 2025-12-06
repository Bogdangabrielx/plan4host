-- Add email column to accounts for easier identification

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'accounts'
      and column_name  = 'email'
  ) then
    alter table public.accounts
      add column email text;
  end if;
exception
  when others then
    null;
end
$$;

create index if not exists accounts_email_idx
  on public.accounts (lower(coalesce(email, '')));

