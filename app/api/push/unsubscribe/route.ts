// app/api/push/unsubscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

export async function POST(req: NextRequest) {
  try {
    const supa = createSSRClient();
    const { data: auth } = await supa.auth.getUser();
    const user = auth.user;
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const endpoint: string | undefined = body?.endpoint;
    if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 });

    const { error } = await admin
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

