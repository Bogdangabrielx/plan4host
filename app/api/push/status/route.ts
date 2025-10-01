// app/api/push/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });

export async function GET(req: NextRequest) {
  try {
    const supa = createSSRClient();
    const { data: auth } = await supa.auth.getUser();
    const user = auth.user;
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get('endpoint');

    let q = admin.from('push_subscriptions').select('endpoint', { count: 'exact', head: true }).eq('user_id', user.id);
    if (endpoint) (q as any).eq('endpoint', endpoint);

    const r: any = await q;
    if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 });
    const count: number = r.count ?? 0;
    return NextResponse.json({ ok: true, active: count > 0, count });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
