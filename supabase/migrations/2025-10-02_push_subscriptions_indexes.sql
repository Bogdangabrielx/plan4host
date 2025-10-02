-- Indexes to speed up push_subscriptions access patterns
-- 1) Fast per-user lookups (status checks, send flows)
create index if not exists ix_push_subscriptions_user_id
  on public.push_subscriptions(user_id);

-- 2) Covering index for send/select (avoids heap fetch for endpoint/p256dh/auth)
create index if not exists ix_push_subscriptions_user_cover
  on public.push_subscriptions(user_id) include (endpoint, p256dh, auth);

-- 3) Compound index for per-property filtering by user (optional but helpful)
create index if not exists ix_push_subscriptions_user_property
  on public.push_subscriptions(user_id, property_id);

-- 4) Account-level aggregations/broadcasts (optional)
create index if not exists ix_push_subscriptions_account_id
  on public.push_subscriptions(account_id);

