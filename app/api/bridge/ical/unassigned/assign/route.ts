import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import webpush from 'web-push';

export async function POST(req: Request) {
  const supabase = createClient();
  const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createAdminClient(URL, SERVICE, { auth: { persistSession: false } });
  try {
    const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY!;
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
    const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:office@plan4host.com';
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch { /* ignore VAPID config errors here */ }
  const { eventId, roomId } = await req.json();
  if (!eventId || !roomId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const ev = await supabase.from("ical_unassigned_events").select("*").eq("id", eventId).maybeSingle();
  if (ev.error || !ev.data) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // find provider for this integration (if present)
  let provider: string | null = null;
  if (ev.data.integration_id) {
    const rI = await supabase
      .from("ical_type_integrations")
      .select("provider")
      .eq("id", ev.data.integration_id)
      .maybeSingle();
    if (!rI.error && rI.data) provider = (rI.data as any).provider ?? null;
  }

  // creează booking
  const ins = await supabase.from("bookings").insert({
    property_id: ev.data.property_id,
    room_id: roomId,
    start_date: ev.data.start_date, end_date: ev.data.end_date,
    start_time: ev.data.start_time ?? null, end_time: ev.data.end_time ?? null,
    status: "confirmed",
    source: 'ical',
    ical_uid: ev.data.uid ?? null,
    ota_integration_id: ev.data.integration_id ?? null,
    ota_provider: provider ?? null,
  }).select().maybeSingle();

  if (ins.error || !ins.data) return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });

  // marchează resolved + adaugă în uid_map dacă avem uid
  await supabase.from("ical_unassigned_events").update({ resolved: true }).eq("id", eventId);
  if (ev.data.uid) {
    await supabase.from("ical_uid_map").upsert({
      property_id: ev.data.property_id,
      room_type_id: ev.data.room_type_id,
      room_id: roomId,
      booking_id: ins.data.id,
      uid: ev.data.uid,
      source: provider || "ManualAssign",
      start_date: ev.data.start_date, end_date: ev.data.end_date,
      start_time: ev.data.start_time ?? null, end_time: ev.data.end_time ?? null,
      integration_id: ev.data.integration_id ?? null,
    });
  }

  // Best-effort push broadcast (do not block response)
  try {
    const pid = String(ev.data.property_id);
    // Resolve account admins for this property
    const rProp = await admin.from('properties').select('account_id').eq('id', pid).maybeSingle();
    if (rProp.error || !rProp.data) return NextResponse.json({ ok: true, booking_id: ins.data.id });
    const account_id = (rProp.data as any).account_id as string;
    const rUsers = await admin
      .from('account_users')
      .select('user_id,role,disabled')
      .eq('account_id', account_id)
      .eq('disabled', false)
      .eq('role', 'admin');
    const userIds = (rUsers.data || []).map((u: any) => String(u.user_id));
    if (userIds.length === 0) return NextResponse.json({ ok: true, booking_id: ins.data.id });
    const payload = JSON.stringify({
      title: 'New reservation',
      body: `From ${ev.data.start_date} to ${ev.data.end_date}`,
      url: `/app/guest?property=${encodeURIComponent(pid)}`,
      tag: `guest-${pid}`,
    });
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint,p256dh,auth,user_id')
      .in('user_id', userIds);
    for (const s of subs || []) {
      const subscription = { endpoint: (s as any).endpoint, keys: { p256dh: (s as any).p256dh, auth: (s as any).auth } } as any;
      try { await webpush.sendNotification(subscription, payload); }
      catch (e: any) {
        if (e?.statusCode === 410 || e?.statusCode === 404) {
          try { await admin.from('push_subscriptions').delete().eq('endpoint', (s as any).endpoint); } catch {}
        }
      }
    }
  } catch { /* ignore push errors */ }

  return NextResponse.json({ ok: true, booking_id: ins.data.id });
}
