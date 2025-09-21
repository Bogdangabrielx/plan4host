// app/api/reservation-message/template/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export async function GET(req: NextRequest) {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const user = auth.user; if (!user) return bad(401, { error: "Not authenticated" });

    const { searchParams } = new URL(req.url);
    const property_id = searchParams.get("property");
    if (!property_id) return bad(400, { error: "Missing ?property" });

    // Template
    const rTpl = await supa
      .from("reservation_templates")
      .select("id, property_id, status")
      .eq("property_id", property_id)
      .maybeSingle();
    if (rTpl.error) return bad(400, { error: rTpl.error.message });
    if (!rTpl.data) return NextResponse.json({ ok: true, template: null });
    const tplId = (rTpl.data as any).id as string;

    const [rBlocks, rFields] = await Promise.all([
      supa
        .from("reservation_template_blocks")
        .select("id,sort_index,type,text")
        .eq("template_id", tplId)
        .order("sort_index", { ascending: true }),
      supa
        .from("reservation_template_fields")
        .select("id,sort_index,key,label,required,multiline,placeholder")
        .eq("template_id", tplId)
        .order("sort_index", { ascending: true }),
    ]);
    if (rBlocks.error) return bad(400, { error: rBlocks.error.message });
    if (rFields.error) return bad(400, { error: rFields.error.message });

    return NextResponse.json({ ok: true, template: { ...rTpl.data, blocks: rBlocks.data ?? [], fields: rFields.data ?? [] } });
  } catch (e: any) {
    return bad(500, { error: e?.message || "Unexpected error" });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const user = auth.user; if (!user) return bad(401, { error: "Not authenticated" });

    const body = await req.json().catch(() => ({}));
    const property_id: string | undefined = body?.property_id;
    const status: "draft"|"published" = (body?.status || "draft").toLowerCase();
    const blocks: Array<{ type: string; text?: string }>|undefined = body?.blocks;
    const fields: Array<{ key: string; label: string; required?: boolean; multiline?: boolean; placeholder?: string }>|undefined = body?.fields;
    if (!property_id) return bad(400, { error: "property_id required" });

    // Upsert template (admin RLS enforced)
    const up = await supa
      .from("reservation_templates")
      .upsert({ property_id, status }, { onConflict: "property_id" })
      .select("id")
      .single();
    if (up.error || !up.data) return bad(400, { error: up.error?.message || "Failed to upsert template" });
    const tplId = (up.data as any).id as string;

    if (Array.isArray(blocks)) {
      // Clear + reinsert
      await supa.from("reservation_template_blocks").delete().eq("template_id", tplId);
      const rows = blocks.map((b, i) => ({
        property_id,
        template_id: tplId,
        sort_index: i,
        type: (b.type || '').toLowerCase(),
        text: b.text ?? null,
      }));
      if (rows.length) {
        const ins = await supa.from("reservation_template_blocks").insert(rows).select("id");
        if (ins.error) return bad(400, { error: ins.error.message });
      }
    }

    if (Array.isArray(fields)) {
      await supa.from("reservation_template_fields").delete().eq("template_id", tplId);
      const rows = fields.map((f, i) => ({
        property_id,
        template_id: tplId,
        sort_index: i,
        key: (f.key || '').toLowerCase(),
        label: f.label || f.key || `Field ${i+1}`,
        required: !!f.required,
        multiline: !!f.multiline,
        placeholder: f.placeholder ?? null,
      }));
      if (rows.length) {
        const ins = await supa.from("reservation_template_fields").insert(rows).select("id");
        if (ins.error) return bad(400, { error: ins.error.message });
      }
    }

    return NextResponse.json({ ok: true, template_id: tplId });
  } catch (e: any) {
    return bad(500, { error: e?.message || "Unexpected error" });
  }
}

