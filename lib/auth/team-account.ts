import type { SupabaseClient } from "@supabase/supabase-js";

type TeamRole = "admin" | "editor" | "viewer";

export type TeamMembershipRow = {
  account_id: string;
  role: TeamRole;
  disabled: boolean | null;
  scopes: string[] | null;
};

export async function resolveTeamAccountContext(
  supa: SupabaseClient<any, any, any>,
  userId: string,
): Promise<{
  ownAccountId: string | null;
  membership: TeamMembershipRow | null;
  accountId: string | null;
}> {
  const { data: ownAccount } = await supa
    .from("accounts")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  const ownAccountId = ownAccount?.id ? String(ownAccount.id) : null;

  const { data: memberships } = await supa
    .from("account_users")
    .select("account_id, role, disabled, scopes")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const activeRows = ((memberships ?? []) as TeamMembershipRow[]).filter((row) => !row.disabled);
  const externalMembership =
    ownAccountId ? activeRows.find((row) => String(row.account_id) !== ownAccountId) ?? null : null;
  const ownMembership =
    ownAccountId ? activeRows.find((row) => String(row.account_id) === ownAccountId) ?? null : null;
  const membership = externalMembership ?? ownMembership ?? activeRows[0] ?? null;

  return {
    ownAccountId,
    membership,
    accountId: membership?.account_id ? String(membership.account_id) : ownAccountId,
  };
}
