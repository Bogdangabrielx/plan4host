// app/api/reservation-message/public/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

function bad(status: number, body: any) { return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, max-age=0" } }); }

function escapeHtml(s: string) {
  return (s || "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c] as string));
}
function replaceVarsInHtml(html: string, vars: Record<string,string>) {
  if (!html) return "";
  const withVars = html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => escapeHtml(vars?.[k] ?? `{{${k}}}`));
  // Preserve author newlines as <br/>
  return withVars.replace(/\r?\n/g, '<br/>');
}

// Safely render plain-text (heading) with {{tokens}} replaced by escaped values
function renderHeadingSafe(src: string, vars: Record<string,string>): string {
  const s = src || "";
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let out: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const before = s.slice(last, m.index);
    out.push(escapeHtml(before));
    const key = m[1];
    const val = vars?.[key] ?? `{{${key}}}`;
    out.push(escapeHtml(val));
    last = m.index + m[0].length;
  }
  out.push(escapeHtml(s.slice(last)));
  return out.join("");
}

export async function GET(req: NextRequest, ctx: { params: { token: string } }) {
  try {
    const tok = (ctx.params.token || '').trim();
    if (!tok) return bad(400, { error: 'Missing token' });

    const rMsg = await admin
      .from('reservation_messages')
      .select('id, property_id, booking_id, status, manual_values, expires_at')
      .eq('token', tok)
      .maybeSingle();
    if (rMsg.error) return bad(400, { error: rMsg.error.message });
    if (!rMsg.data) return bad(404, { error: 'Not found' });

    const msg = rMsg.data as any;
    if (msg.status !== 'active') return bad(410, { error: 'Revoked' });
    if (msg.expires_at && new Date(msg.expires_at) < new Date()) return bad(410, { error: 'Expired' });

    // booking + property
    const [rBk, rProp] = await Promise.all([
      admin.from('bookings').select('id, property_id, start_date, end_date, start_time, end_time, room_id, status, guest_first_name, guest_last_name').eq('id', msg.booking_id).maybeSingle(),
      admin.from('properties').select('id, name, timezone, check_in_time, check_out_time').eq('id', msg.property_id).maybeSingle(),
    ]);
    if (rBk.error || !rBk.data) return bad(404, { error: 'Booking not found' });
    if (rProp.error || !rProp.data) return bad(404, { error: 'Property not found' });

    const booking = rBk.data as any;
    const prop = rProp.data as any;

    // all published templates for this property
    const rTpls = await admin.from('reservation_templates').select('id,title,status,schedule_kind,schedule_offset_hours').eq('property_id', msg.property_id).eq('status','published');
    if (rTpls.error) return bad(400, { error: rTpls.error.message });
    const templates = (rTpls.data || []) as Array<{ id:string; title:string; status:string; schedule_kind?:string|null; schedule_offset_hours?:number|null }>;
    const tplIds = templates.map(t => t.id);
    const rBlocks = await admin.from('reservation_template_blocks').select('template_id,type,text,sort_index,lang').in('template_id', tplIds).order('sort_index', { ascending: true });
    if (rBlocks.error) return bad(400, { error: rBlocks.error.message });

    // built-in vars from booking
    const builtins: Record<string,string> = {
      guest_first_name: (booking.guest_first_name || '').toString(),
      guest_last_name: (booking.guest_last_name || '').toString(),
      check_in_date: booking.start_date,
      check_in_time: booking.start_time || '14:00',
      check_out_date: booking.end_date,
      check_out_time: booking.end_time || '11:00',
      room_name: '',
      property_name: prop.name || '',
    };
    if (booking.room_id) {
      try {
        const rRoom = await admin.from('rooms').select('name, room_type_id').eq('id', booking.room_id).maybeSingle();
        if (!rRoom.error) {
          builtins.room_name = (rRoom.data as any)?.name || '';
          const rtId = (rRoom.data as any)?.room_type_id as string | null;
          if (rtId) {
            try {
              const rType = await admin.from('room_types').select('name').eq('id', rtId).maybeSingle();
              if (!rType.error) (builtins as any).room_type = (rType.data as any)?.name || '';
            } catch {}
          }
        }
      } catch {}
    }
    // room label for details card
    let roomLabel: string | null = null;
    if (booking.room_id) {
      try { const rr = await admin.from('rooms').select('name').eq('id', booking.room_id).maybeSingle(); if (!rr.error && rr.data) roomLabel = (rr.data as any)?.name || null; } catch {}
    }
    const vars = { ...builtins, ...(msg.manual_values || {}) } as Record<string,string>;

    const byTpl = new Map<string, any[]>();
    for (const b of (rBlocks.data || []) as any[]) {
      const arr = byTpl.get(b.template_id) || []; arr.push(b); byTpl.set(b.template_id, arr);
    }
    function renderBlocks(arr:any[], lang:'ro'|'en'){
      const filtered = (arr||[]).filter(x => (x.lang || 'ro').toLowerCase() === lang).sort((a:any,b:any)=>(a.sort_index||0)-(b.sort_index||0));
      const parts:string[] = [];
      for (const b of filtered) {
        if (b.type === 'divider') parts.push('<hr style="border:1px solid var(--border); opacity:.6;"/>' );
        else if (b.type === 'heading') parts.push(`<h3 style=\"margin:8px 0 6px;\">${renderHeadingSafe(b.text || '', vars)}</h3>`);
        else if (b.type === 'paragraph') parts.push(`<div style=\"margin:6px 0; line-height:1.5;\">${replaceVarsInHtml(b.text || '', vars)}</div>`);
      }
      return parts.join('\n');
    }

    // Visibility calculations
    const propTz = (prop as any)?.timezone || 'Europe/Bucharest';
    const ciTime = booking.start_time || (prop as any)?.check_in_time || '14:00';
    const coTime = booking.end_time || (prop as any)?.check_out_time || '11:00';
    const now = new Date(); // naive; server timezone, but acceptable for now
    function at(d:string,t:string){ return new Date(`${d}T${t}:00`); }

    const items = templates.map(t => {
      const arr = byTpl.get(t.id) || [];
      const html_ro = renderBlocks(arr, 'ro');
      const html_en = renderBlocks(arr, 'en');
      const kind = (t.schedule_kind || 'none').toLowerCase();
      let visible = false;
      const off = (typeof t.schedule_offset_hours === 'number' && !isNaN(t.schedule_offset_hours)) ? Number(t.schedule_offset_hours) : null;
      if (kind === 'hour_before_checkin') visible = now >= new Date(at(booking.start_date, ciTime).getTime() - (off ?? 1)*60*60*1000);
      else if (kind === 'hours_before_checkout') visible = now >= new Date(at(booking.end_date, coTime).getTime() - (off ?? 12)*60*60*1000);
      else if (kind === 'on_arrival') visible = now >= at(booking.start_date, ciTime);
      else if (kind === 'none') visible = false; // explicit: nu afișăm deloc mesajele fără scheduler
      return { id: t.id, title: t.title || 'Message', schedule_kind: t.schedule_kind || 'none', html_ro, html_en, visible };
    });

    return NextResponse.json(
      { ok: true, property_id: msg.property_id, booking_id: msg.booking_id, expires_at: msg.expires_at, items,
        details: { property_name: (prop as any)?.name || '', guest_first_name: booking.guest_first_name || '', guest_last_name: booking.guest_last_name || '', start_date: booking.start_date, end_date: booking.end_date, room_name: roomLabel }
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (e: any) {
    return bad(500, { error: e?.message || 'Unexpected error' });
  }
}
