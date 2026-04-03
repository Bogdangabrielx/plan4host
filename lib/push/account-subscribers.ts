export async function resolvePropertyAccountId(admin: any, propertyId: string): Promise<string | null> {
  const { data, error } = await admin
    .from("properties")
    .select("account_id,admin_id")
    .eq("id", propertyId)
    .maybeSingle();

  if (error || !data) return null;

  const accountId =
    ((data as { account_id?: string | null; admin_id?: string | null }).account_id ||
      (data as { account_id?: string | null; admin_id?: string | null }).admin_id ||
      null) as string | null;

  return accountId;
}

export async function listActiveAccountUserIds(admin: any, accountId: string): Promise<string[]> {
  const { data, error } = await admin
    .from("account_users")
    .select("user_id")
    .eq("account_id", accountId)
    .eq("disabled", false)
    .eq("disabled_by_billing", false);

  if (error) return [];

  return Array.from(new Set((data || []).map((row: any) => String(row.user_id)).filter(Boolean)));
}

export async function listSubscriptionsForUsers(
  admin: any,
  userIds: string[],
  propertyId?: string | null,
): Promise<Array<{ endpoint: string; p256dh: string; auth: string; user_id: string }>> {
  if (!userIds.length) return [];

  let q = admin
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth,user_id")
    .in("user_id", userIds);

  if (propertyId) {
    q = q.or(`property_id.eq.${propertyId},property_id.is.null`);
  }

  const { data, error } = await q;

  if (error) return [];

  return (data || []) as Array<{ endpoint: string; p256dh: string; auth: string; user_id: string }>;
}
