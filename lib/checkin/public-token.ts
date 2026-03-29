import crypto from "node:crypto";

type CheckinTokenPayload = {
  property_id: string;
  booking_id?: string | null;
  exp: number;
};

function getSecret() {
  const secret =
    process.env.CHECKIN_PUBLIC_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  if (!secret) throw new Error("Missing CHECKIN_PUBLIC_TOKEN_SECRET or SUPABASE_SERVICE_ROLE_KEY");
  return secret;
}

function toBase64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${pad}`, "base64");
}

function signPayload(payloadB64: string) {
  return toBase64Url(crypto.createHmac("sha256", getSecret()).update(payloadB64).digest());
}

export function createCheckinPublicToken(input: {
  property_id: string;
  booking_id?: string | null;
  ttlSeconds?: number;
}) {
  const payload: CheckinTokenPayload = {
    property_id: String(input.property_id),
    booking_id: input.booking_id ? String(input.booking_id) : null,
    exp: Math.floor(Date.now() / 1000) + Math.max(60, input.ttlSeconds ?? 60 * 60 * 24),
  };
  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const sig = signPayload(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifyCheckinPublicToken(token: string | null | undefined) {
  if (!token || typeof token !== "string") return { ok: false as const, error: "Missing check-in token" };
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return { ok: false as const, error: "Invalid check-in token" };

  const expected = signPayload(payloadB64);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return { ok: false as const, error: "Invalid check-in token" };
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadB64).toString("utf8")) as CheckinTokenPayload;
    if (!payload?.property_id || typeof payload.exp !== "number") {
      return { ok: false as const, error: "Invalid check-in token payload" };
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return { ok: false as const, error: "Check-in token expired" };
    }
    return { ok: true as const, payload };
  } catch {
    return { ok: false as const, error: "Invalid check-in token payload" };
  }
}

export function getCheckinTokenFromRequest(req: Request) {
  return (
    req.headers.get("x-checkin-token") ||
    req.headers.get("X-Checkin-Token") ||
    null
  );
}
