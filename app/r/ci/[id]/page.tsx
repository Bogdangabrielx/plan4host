import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import ExportPdfButton from "../ExportPdfButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type Doc = { id:string; doc_type:string|null; mime_type:string|null; url:string|null };

export default async function CheckinQrView({ params }: { params: { id: string } }) {
  const bookingId = params.id;
  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

  let form: any = null;
  let booking: any = null;
  let property: any = null;
  let bookingContact: any = null;
  let docs: Doc[] = [];
  const DEFAULT_BUCKET = (process.env.NEXT_PUBLIC_DEFAULT_DOCS_BUCKET || "guest_docs").toString();

  async function resolveDocs(
    table: "form_documents" | "booking_documents",
    key: "form_id" | "booking_id",
    id: string,
    prefix: string
  ): Promise<Doc[]> {
    const r = await admin
      .from(table)
      .select("id,doc_type,mime_type,storage_bucket,storage_path")
      .eq(key, id)
      .order("uploaded_at", { ascending: false });
    const rows = r.data || [];
    const out: Doc[] = [];
    for (const d of rows) {
      const path = (d as any).storage_path as string | null;
      let url: string | null = null;
      if (path) {
        try {
          const bucket = ((d as any).storage_bucket || DEFAULT_BUCKET) as string;
          const signed = await admin.storage.from(bucket).createSignedUrl(path, 600);
          url = signed.data?.signedUrl ?? null;
        } catch {
          url = null;
        }
      }
      out.push({
        id: `${prefix}${String((d as any).id)}`,
        doc_type: (d as any).doc_type || null,
        mime_type: (d as any).mime_type || null,
        url,
      });
    }
    return out;
  }

  try {
    const rForm = await admin
      .from("form_bookings")
      .select(
        "id, property_id, start_date, end_date, guest_first_name, guest_last_name, guest_email, guest_phone, guest_address, guest_city, guest_country, room_id, room_type_id, created_at, submitted_at"
      )
      .eq("id", bookingId)
      .maybeSingle();
    form = rForm.data || null;
  } catch {}

  try {
    const rBooking = await admin
      .from("bookings")
      .select(
        "id, property_id, start_date, end_date, guest_first_name, guest_last_name, guest_email, guest_phone, guest_address, room_id, room_type_id, form_id, form_submitted_at, created_at"
      )
      .eq("id", bookingId)
      .maybeSingle();
    booking = rBooking.data || null;

    if (!booking && form?.id) {
      const rLinked = await admin
        .from("bookings")
        .select(
          "id, property_id, start_date, end_date, guest_first_name, guest_last_name, guest_email, guest_phone, guest_address, room_id, room_type_id, form_id, form_submitted_at, created_at"
        )
        .eq("form_id", form.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      booking = rLinked.data || null;
    }
  } catch {}

  const propertyId = form?.property_id ?? booking?.property_id ?? null;
  if (propertyId) {
    try {
      const rP = await admin.from("properties").select("id,name").eq("id", propertyId).maybeSingle();
      property = rP.data || null;
    } catch {}
  }

  if (booking?.id) {
    try {
      const rC = await admin
        .from("booking_contacts")
        .select("email,phone,address,city,country")
        .eq("booking_id", booking.id)
        .maybeSingle();
      bookingContact = rC.data || null;
    } catch {}
  }

  if (form?.id) {
    try {
      docs.push(...(await resolveDocs("form_documents", "form_id", form.id, "form-")));
    } catch {}
  }
  if (booking?.id) {
    try {
      docs.push(...(await resolveDocs("booking_documents", "booking_id", booking.id, "booking-")));
    } catch {}
  }

  const guestFirstName = form?.guest_first_name ?? booking?.guest_first_name ?? null;
  const guestLastName = form?.guest_last_name ?? booking?.guest_last_name ?? null;
  const startDate = form?.start_date ?? booking?.start_date ?? null;
  const endDate = form?.end_date ?? booking?.end_date ?? null;

  const contact = {
    email: form?.guest_email ?? booking?.guest_email ?? bookingContact?.email ?? null,
    phone: form?.guest_phone ?? booking?.guest_phone ?? bookingContact?.phone ?? null,
    city: form?.guest_city ?? bookingContact?.city ?? null,
    country: form?.guest_country ?? bookingContact?.country ?? null,
    address: form?.guest_address ?? booking?.guest_address ?? bookingContact?.address ?? null,
  };

  const checkinUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/r/ci/${bookingId}`;

  // Reuse the same visual language as CheckinClient (dark variant icons)
  function iconPairForForm(key: 'email'|'phone'|'address'|'city'|'country'|'firstname'|'lastname'|'id') {
    return { dark: `/formular_${key}_fordark.png`, light: `/formular_${key}_forlight.png` };
  }
  const ICON_PROPERTY = { dark: '/dashboard_fordark.png', light: '/dashboard_forlight.png' } as const;
  const ICON_NIGHT = { dark: '/night_fordark.png', light: '/night_forlight.png' } as const;
  const ICON_QR = { dark: '/QR_fordark.png', light: '/QR_forlight.png' } as const;

  function Icon({ pair, size = 16 }: { pair: { dark: string; light: string }; size?: number }) {
    return (
      <picture>
        <source media="print" srcSet={pair.light} />
        {/* Force light variant on-screen */}
        <img src={pair.light} alt="" width={size} height={size} />
      </picture>
    );
  }

  // Validity: 30 days after reservation start_date (supports bookings made far in advance)
  function addDays(d: Date, days: number) { const t = new Date(d.getTime()); t.setUTCDate(t.getUTCDate() + days); return t; }
  function ymdToDate(ymd: string): Date { return new Date(`${ymd}T00:00:00Z`); }
  function fmtDate(d: Date): string { const dd = String(d.getUTCDate()).padStart(2,'0'); const mm = String(d.getUTCMonth()+1).padStart(2,'0'); const yy = d.getUTCFullYear(); return `${dd}.${mm}.${yy}`; }
  const baseStart = (startDate as string | undefined);
  let validUntilText: string | null = null;
  let isExpired = false;
  if (baseStart && /^\d{4}-\d{2}-\d{2}$/.test(baseStart)) {
    const baseDate = ymdToDate(baseStart);
    const until = addDays(baseDate, 30);
    validUntilText = fmtDate(until);
    isExpired = until.getTime() < Date.now();
  }

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

  // Force page to light theme (like /r/[token]/page.tsx)
  const cookieStore = cookies();
  const theme: 'light' = 'light';
  const accent = cookieStore.get("app_accent")?.value ?? "base";

  return (
    <html lang="en" data-theme={theme} data-accent={accent}>
      <body style={{ margin: 0 }}>
    <main style={{ minHeight:'100dvh', display:'grid', placeItems:'start center', background:'var(--bg)', color:'var(--text)' }}>
      <div style={{ width:'min(860px, calc(100vw - 32px))', padding:16, display:'grid', gap:12 }}>
        <div className="sb-card" style={{ padding:12, border:'1px solid var(--border)', borderRadius:29, background:'var(--panel)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <img src="/p4h_logo_rotund.png" alt="Plan4Host" width={28} height={28} style={{ display:'block', borderRadius:999 }} />
              <h1 style={{ margin:0, fontSize:20 }}>Check-in confirmation</h1>
            </div>
            <ExportPdfButton />
          </div>
        </div>
        {isExpired && (
          <div className="sb-card" style={{ padding:12, border:'1px solid var(--border)', borderRadius:12, background:'var(--panel)' }}>
            <div style={{ padding:10, borderRadius:10, background:'var(--danger)', color:'#0c111b', fontWeight:800 }}>
              Link expired. For privacy, this QR link is only valid for 30 days.
            </div>
          </div>
        )}
          <div className="sb-card" style={{ padding:12, border:'1px solid var(--border)', borderRadius:12, background:'var(--panel)' }}>
            {/* Table-style details with icons */}
            <div style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', rowGap:8, columnGap:10, alignItems:'center' }}>
            <div aria-hidden style={{ width:18 }}>
              <Icon pair={ICON_PROPERTY} />
            </div>
            <div style={{ color:'var(--muted)', fontSize:12, fontWeight:800 }}>Property</div>
            <div style={{ justifySelf:'start' }}>{property?.name || '—'}</div>
            <div style={{ gridColumn:'1 / -1', height:1, background:'var(--border)', margin:'6px 0' }} />

            <div aria-hidden style={{ width:18 }}>
              <Icon pair={iconPairForForm('firstname')} />
            </div>
            <div style={{ color:'var(--muted)', fontSize:12, fontWeight:800 }}>First name</div>
            <div>{guestFirstName || '—'}</div>
            <div style={{ gridColumn:'1 / -1', height:1, background:'var(--border)', margin:'6px 0' }} />

            <div aria-hidden style={{ width:18 }}>
              <Icon pair={iconPairForForm('lastname')} />
            </div>
            <div style={{ color:'var(--muted)', fontSize:12, fontWeight:800 }}>Last name</div>
            <div>{guestLastName || '—'}</div>
            <div style={{ gridColumn:'1 / -1', height:1, background:'var(--border)', margin:'6px 0' }} />

            <div aria-hidden style={{ width:18 }}>
              <Icon pair={iconPairForForm('email')} />
            </div>
            <div style={{ color:'var(--muted)', fontSize:12, fontWeight:800 }}>Email</div>
            <div>{contact.email || '—'}</div>
            <div style={{ gridColumn:'1 / -1', height:1, background:'var(--border)', margin:'6px 0' }} />

            <div aria-hidden style={{ width:18 }}>
              <Icon pair={iconPairForForm('phone')} />
            </div>
            <div style={{ color:'var(--muted)', fontSize:12, fontWeight:800 }}>Phone</div>
            <div>{contact.phone || '—'}</div>
            <div style={{ gridColumn:'1 / -1', height:1, background:'var(--border)', margin:'6px 0' }} />

            <div aria-hidden style={{ width:18 }}>
              <Icon pair={iconPairForForm('city')} />
            </div>
            <div style={{ color:'var(--muted)', fontSize:12, fontWeight:800 }}>City</div>
            <div>{contact.city || '—'}</div>
            <div style={{ gridColumn:'1 / -1', height:1, background:'var(--border)', margin:'6px 0' }} />

            <div aria-hidden style={{ width:18 }}>
              <Icon pair={iconPairForForm('country')} />
            </div>
            <div style={{ color:'var(--muted)', fontSize:12, fontWeight:800 }}>Country</div>
            <div>{contact.country || '—'}</div>
            <div style={{ gridColumn:'1 / -1', height:1, background:'var(--border)', margin:'6px 0' }} />

            <div aria-hidden style={{ width:18 }}>
              <Icon pair={iconPairForForm('address')} />
            </div>
            <div style={{ color:'var(--muted)', fontSize:12, fontWeight:800 }}>Address</div>
            <div>{contact.address || '—'}</div>
            <div style={{ gridColumn:'1 / -1', height:1, background:'var(--border)', margin:'6px 0' }} />

            <div aria-hidden style={{ width:18 }}>
              <Icon pair={ICON_NIGHT} />
            </div>
            <div style={{ color:'var(--muted)', fontSize:12, fontWeight:800 }}>Check‑in date</div>
            <div>{startDate || '—'}</div>
            <div style={{ gridColumn:'1 / -1', height:1, background:'var(--border)', margin:'6px 0' }} />

            <div aria-hidden style={{ width:18 }}>
              <Icon pair={ICON_NIGHT} />
            </div>
            <div style={{ color:'var(--muted)', fontSize:12, fontWeight:800 }}>Check‑out date</div>
            <div>{endDate || '—'}</div>
            <div style={{ gridColumn:'1 / -1', height:1, background:'var(--border)', margin:'6px 0' }} />

            <div aria-hidden style={{ width:18 }}>
              <Icon pair={iconPairForForm('id')} />
            </div>
            <div style={{ color:'var(--muted)', fontSize:12, fontWeight:800 }}>Document type</div>
            <div>{(() => { const t = (idDoc?.doc_type || '').toLowerCase(); if (t === 'id_card') return 'ID Card'; if (t === 'passport') return 'Passport'; return '—'; })()}</div>
            {validUntilText && (
              <>
                <div style={{ gridColumn:'1 / -1', height:1, background:'var(--border)', margin:'6px 0' }} />
                <div aria-hidden style={{ width:18 }}>
                  <Icon pair={ICON_QR} />
                </div>
                <div style={{ color:'var(--muted)', fontSize:12, fontWeight:800 }}>QR valid until</div>
                <div>{validUntilText}</div>
              </>
            )}
          </div>
        </div>
        <div className="sb-card" style={{ padding:12, border:'1px solid var(--border)', borderRadius:12, background:'var(--panel)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Thumb doc={idDoc} label="ID Document" />
            <Thumb doc={sigDoc} label="Signature" />
          </div>
        </div>
        {/* QR code removed intentionally; export via PDF is available above */}
      </div>
    </main>
      </body>
    </html>
  );
}
