import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";

type ActorRole = "admin" | "editor" | "viewer";

type MembershipRow = {
  account_id: string;
  role: ActorRole;
  scopes: string[] | null;
  disabled: boolean | null;
};

export type ApiActor = {
  userId: string;
  accountId: string | null;
  role: ActorRole;
  scopes: Set<string>;
  disabled: boolean;
  isBaseAdmin: boolean;
};

type PropertyAccess = {
  id: string;
  account_id: string | null;
  admin_id?: string | null;
};

type BookingAccess = {
  id: string;
  property_id: string;
};

const SCOPE_ALIAS: Record<string, string> = {
  inbox: "guest_overview",
  reservations: "calendar",
  propertySetup: "property_setup",
};

function normalizeScope(scope: string): string {
  return SCOPE_ALIAS[scope] ?? scope;
}

export async function getApiActor(): Promise<
  | { ok: true; actor: ApiActor }
  | { ok: false; status: number; error: string }
> {
  const supa = createClient();
  const { data: auth, error } = await supa.auth.getUser();
  if (error || !auth.user) {
    return { ok: false, status: 401, error: "Not authenticated" };
  }

  const userId = String(auth.user.id);
  const admin = getServiceSupabase();

  const { data: memberships, error: membershipError } = await admin
    .from("account_users")
    .select("account_id, role, scopes, disabled")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (membershipError) {
    return { ok: false, status: 500, error: membershipError.message };
  }

  const rows = (memberships ?? []) as MembershipRow[];
  const activeAdmin = rows.find((row) => !row.disabled && row.role === "admin");
  const activeMember = rows.find((row) => !row.disabled);
  const picked = activeAdmin ?? activeMember ?? rows[0] ?? null;

  if (picked) {
    if (picked.disabled) {
      return { ok: false, status: 403, error: "Account membership disabled" };
    }
    return {
      ok: true,
      actor: {
        userId,
        accountId: picked.account_id,
        role: picked.role,
        scopes: new Set(((picked.scopes ?? []) as string[]).map(normalizeScope)),
        disabled: false,
        isBaseAdmin: picked.role === "admin",
      },
    };
  }

  const { data: ownAccount, error: ownAccountError } = await admin
    .from("accounts")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (ownAccountError) {
    return { ok: false, status: 500, error: ownAccountError.message };
  }

  if (!ownAccount?.id) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return {
    ok: true,
    actor: {
      userId,
      accountId: String(ownAccount.id),
      role: "admin",
      scopes: new Set<string>(),
      disabled: false,
      isBaseAdmin: true,
    },
  };
}

export function actorCanRead(actor: ApiActor): boolean {
  return !actor.disabled;
}

export function actorCanWrite(actor: ApiActor, allowedScopes: string[]): boolean {
  if (actor.disabled) return false;
  if (actor.role === "admin" || actor.isBaseAdmin) return true;
  if (actor.role !== "editor") return false;
  return allowedScopes.map(normalizeScope).some((scope) => actor.scopes.has(scope));
}

export async function getPropertyForActor(
  actor: ApiActor,
  propertyId: string,
): Promise<
  | { ok: true; property: PropertyAccess }
  | { ok: false; status: number; error: string }
> {
  const admin = getServiceSupabase();
  const { data, error } = await admin
    .from("properties")
    .select("id, account_id, admin_id")
    .eq("id", propertyId)
    .maybeSingle();

  if (error) return { ok: false, status: 500, error: error.message };
  if (!data) return { ok: false, status: 404, error: "Property not found" };

  const property = data as PropertyAccess;
  const accountMatch =
    !!actor.accountId &&
    !!property.account_id &&
    String(actor.accountId) === String(property.account_id);
  const adminMatch = !!property.admin_id && String(property.admin_id) === String(actor.userId);

  if (!accountMatch && !adminMatch) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, property };
}

export async function getBookingForActor(
  actor: ApiActor,
  bookingId: string,
): Promise<
  | { ok: true; booking: BookingAccess }
  | { ok: false; status: number; error: string }
> {
  const admin = getServiceSupabase();
  const { data, error } = await admin
    .from("bookings")
    .select("id, property_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (error) return { ok: false, status: 500, error: error.message };
  if (!data) return { ok: false, status: 404, error: "Booking not found" };

  const booking = data as BookingAccess;
  const propertyAccess = await getPropertyForActor(actor, String(booking.property_id));
  if (!propertyAccess.ok) return propertyAccess;

  return { ok: true, booking };
}
