import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type Doc = { id:string; doc_type:string|null; mime_type:string|null; url:string|null };

export default async function CheckinQrView({ params }: { params: { id: string } }) {
  const bookingId = params.id;
  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

  let booking: any = null;
  let contact: any = null;
  let property: any = null;
  let docs: Doc[] = [];
  try {
    const rB = await admin
      .from('bookings')
      .select('id, property_id, start_date, end_date, guest_first_name, guest_last_name, guest_email, room_id, room_type_id')
      .eq('id', bookingId)
      .maybeSingle();
    booking = rB.data || null;

    if (booking?.property_id) {
      const rP = await admin.from('properties').select('id,name').eq('id', booking.property_id).maybeSingle();
      property = rP.data || null;
    }
    const rC = await admin.from('booking_contacts').select('email,phone,address,city,country').eq('booking_id', bookingId).maybeSingle();
    contact = rC.data || null;
    // documents
    const rD = await admin.from('booking_documents').select('id,doc_type,mime_type,storage_bucket,storage_path').eq('booking_id', bookingId).order('uploaded_at', { ascending: false });
    const arr = rD.data || [];
    // sign URLs
    const bucket = (process.env.NEXT_PUBLIC_DEFAULT_DOCS_BUCKET || 'guest_docs').toString();
    for (const d of arr) {
      const path = (d as any).storage_path as string | null;
      let url: string | null = null;
      if (path) {
        try {
          const s = await admin.storage.from((d as any).storage_bucket || bucket).createSignedUrl(path, 600);
          url = s.data?.signedUrl || null;
        } catch { url = null; }
      }
      docs.push({ id: String((d as any).id), doc_type: (d as any).doc_type || null, mime_type: (d as any).mime_type || null, url });
    }
  } catch {}

  const name = [booking?.guest_first_name, booking?.guest_last_name].filter(Boolean).join(' ');
  const checkinUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/r/ci/${bookingId}`;

  function Thumb({ doc, label }: { doc: Doc|null, label: string }) {
    if (!doc || !doc.url) return <div style={{ color:'var(--muted)' }}>No file</div>;
    const img = (doc.mime_type || '').startsWith('image/');
    return (
      <div>
        <div style={{ fontSize:12, color:'var(--muted)', fontWeight:800, marginBottom:6 }}>{label}</div>
        {img ? (
          // same size as RoomDetailModal
          <img src={doc.url!} alt={label} style={{ width:160, height:110, objectFit:'contain', objectPosition:'center', borderRadius:8, border:'1px solid var(--border)', background:'#fff' }} />
        ) : (
          <a href={doc.url!} target="_blank" rel="noreferrer" className="sb-btn">View file</a>
        )}
      </div>
    );
  }

  const idDoc = docs.find(d => (d.doc_type||'').toLowerCase()==='id_card' || (d.doc_type||'').toLowerCase()==='passport') || docs.find(d => (d.mime_type||'').startsWith('image/')) || null;
  const sigDoc = docs.find(d => (d.doc_type||'').toLowerCase()==='signature') || docs.find(d => (!d.doc_type || d.doc_type===null) && (d.mime_type||'').startsWith('image/') && d.id !== (idDoc?.id||'')) || null;

  return (
    <main style={{ minHeight:'100dvh', display:'grid', placeItems:'start center', background:'var(--bg)', color:'var(--text)' }}>
      <div style={{ width:'min(860px, calc(100vw - 32px))', padding:16, display:'grid', gap:12 }}>
        <h1 style={{ margin:0, fontSize:20 }}>Check-in confirmation</h1>
        <div className="sb-card" style={{ padding:12, border:'1px solid var(--border)', borderRadius:12, background:'var(--panel)', display:'grid', gap:10 }}>
          <div><strong>Property:</strong> {property?.name || '—'}</div>
          <div><strong>Guest:</strong> {name || contact?.name || '—'}</div>
          <div><strong>Stay:</strong> {booking?.start_date} → {booking?.end_date}</div>
          <div><strong>Email:</strong> {booking?.guest_email || contact?.email || '—'}</div>
          <div><strong>Phone:</strong> {contact?.phone || '—'}</div>
          <div><strong>Address:</strong> {contact?.address || '—'}, {contact?.city || ''} {contact?.country || ''}</div>
        </div>
        <div className="sb-card" style={{ padding:12, border:'1px solid var(--border)', borderRadius:12, background:'var(--panel)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Thumb doc={idDoc} label="ID Document" />
            <Thumb doc={sigDoc} label="Signature" />
          </div>
        </div>
        <div style={{ display:'grid', gap:6 }}>
          <div style={{ fontSize:12, color:'var(--muted)' }}>Scan to view this page:</div>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(checkinUrl)}`} alt="QR code" width={240} height={240} />
          <div style={{ color:'var(--muted)', wordBreak:'break-all' }}>{checkinUrl}</div>
        </div>
      </div>
    </main>
  );
}

