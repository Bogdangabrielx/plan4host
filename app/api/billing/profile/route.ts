// app/api/billing/profile/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("account_billing_profiles")
    .select("*")
    .eq("account_id", uid)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: data ?? null });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await req.json().catch(() => ({}));
  const buyer_type = String(payload?.buyer_type || "").toLowerCase();
  if (buyer_type !== "b2b" && buyer_type !== "b2c") {
    return NextResponse.json({ error: "Invalid buyer_type (expected 'b2b' or 'b2c')" }, { status: 400 });
  }

  // Enforce: cannot flip buyer_type once set
  const { data: existing } = await supabase
    .from("account_billing_profiles")
    .select("buyer_type")
    .eq("account_id", uid)
    .maybeSingle();
  if (existing?.buyer_type && existing.buyer_type !== buyer_type) {
    return NextResponse.json({ error: "Cannot change buyer type for this account." }, { status: 400 });
  }

  const base = {
    account_id: uid,
    buyer_type,
    email: payload?.email ?? null,
    phone: payload?.phone ?? null,
    street: payload?.street ?? null,
    city: payload?.city ?? null,
    county: payload?.county ?? null,
    postal_code: payload?.postal_code ?? null,
    country: payload?.country ?? "RO",
  } as any;

  if (buyer_type === "b2c") {
    base.full_name = payload?.full_name ?? null;
    base.cnp = payload?.cnp ?? null;
    base.legal_name = null;
    base.tax_id = null;
    base.vat_registered = null;
    base.reg_no = null;
    base.iban = null;
  } else {
    base.legal_name = payload?.legal_name ?? null;
    base.tax_id = payload?.tax_id ?? null;
    base.vat_registered = !!payload?.vat_registered;
    base.reg_no = payload?.reg_no ?? null;
    base.iban = payload?.iban ?? null;
    base.full_name = null;
    base.cnp = null;
  }

  const { data, error } = await supabase
    .from("account_billing_profiles")
    .upsert(base, { onConflict: "account_id" })
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: data });
}

