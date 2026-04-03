alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_endpoint_key;

drop index if exists public.uq_push_subscriptions_user_endpoint_property;
create unique index if not exists uq_push_subscriptions_user_endpoint_property
  on public.push_subscriptions(user_id, endpoint, property_id)
  where property_id is not null;

drop index if exists public.uq_push_subscriptions_user_endpoint_global;
create unique index if not exists uq_push_subscriptions_user_endpoint_global
  on public.push_subscriptions(user_id, endpoint)
  where property_id is null;
