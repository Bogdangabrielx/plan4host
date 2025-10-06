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
    const id = searchParams.get("id");
    const property_id = searchParams.get("property");

    let tplId: string | null = null;
    if (id) {
      const rOne = await supa
        .from("reservation_templates")
        .select("id, property_id, title, status")
        .eq("id", id)
        .maybeSingle();
      if (rOne.error) return bad(400, { error: rOne.error.message });
      if (!rOne.data) return NextResponse.json({ ok: true, template: null });
      tplId = (rOne.data as any).id as string;
    } else if (property_id) {
      // Fallback: latest updated template for property (for backward compatibility)
      const rTpl = await supa
        .from("reservation_templates")
        .select("id, property_id, title, status")
        .eq("property_id", property_id)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (rTpl.error) return bad(400, { error: rTpl.error.message });
      if (!rTpl.data || rTpl.data.length === 0) return NextResponse.json({ ok: true, template: null });
      tplId = (rTpl.data[0] as any).id as string;
    } else {
      return bad(400, { error: "Missing ?id or ?property" });
    }

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

    // Re-fetch template header for completeness
    const rHead = await supa
      .from("reservation_templates")
      .select("id, property_id, title, status, updated_at")
      .eq("id", tplId)
      .maybeSingle();
    if (rHead.error || !rHead.data) return bad(400, { error: rHead.error?.message || "Template not found" });

    return NextResponse.json({ ok: true, template: { ...rHead.data, blocks: rBlocks.data ?? [], fields: rFields.data ?? [] } });
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
    const id: string | undefined = body?.id || undefined;
    const property_id: string | undefined = body?.property_id;
    const title: string = (body?.title || "").toString();
    const status: "draft"|"published" = (body?.status || "draft").toLowerCase();
    const blocks: Array<{ type: string; text?: string }>|undefined = body?.blocks;
    const fields: Array<{ key: string; label: string; required?: boolean; multiline?: boolean; placeholder?: string }>|undefined = body?.fields;
    if (!property_id) return bad(400, { error: "property_id required" });

    let tplId: string;
    if (id) {
      // Update existing template header
      const up = await supa
        .from("reservation_templates")
        .update({ title, status, updated_at: new Date().toISOString() as any })
        .eq("id", id)
        .eq("property_id", property_id)
        .select("id")
        .maybeSingle();
      if (up.error || !up.data) return bad(400, { error: up.error?.message || "Failed to update template" });
      tplId = (up.data as any).id as string;
    } else {
      // Create new template
      const ins = await supa
        .from("reservation_templates")
        .insert({ property_id, title, status })
        .select("id")
        .single();
      if (ins.error || !ins.data) return bad(400, { error: ins.error?.message || "Failed to create template" });
      tplId = (ins.data as any).id as string;
    }

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

export async function DELETE(req: NextRequest) {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const user = auth.user; if (!user) return bad(401, { error: "Not authenticated" });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return bad(400, { error: "Missing ?id" });

    // Delete template; blocks/fields cascade via FK
    const del = await supa.from("reservation_templates").delete().eq("id", id);
    if (del.error) return bad(400, { error: del.error.message });
    return NextResponse.json({ ok: true, deleted: true });
  } catch (e: any) {
    return bad(500, { error: e?.message || "Unexpected error" });
  }
}
