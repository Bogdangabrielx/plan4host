"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHeader } from "@/app/app/_components/HeaderContext";
import { usePersistentProperty } from "@/app/app/_components/PropertySelection";

type Property = {
  id: string;
  name: string;
  regulation_pdf_url?: string | null;
  regulation_pdf_uploaded_at?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_address?: string | null;
  presentation_image_url?: string | null;
  presentation_image_uploaded_at?: string | null;
};

const card: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
};
const FIELD: React.CSSProperties = {
  width: "100%",
  padding: 10,
  background: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontFamily: "inherit",
};

export default function CheckinEditorClient({ initialProperties }: { initialProperties: Array<{ id: string; name: string }> }) {
  const supabase = useMemo(() => createClient(), []);
  const { setTitle, setPill } = useHeader();

  const [properties] = useState(initialProperties);
  const [propertyId, setPropertyId] = usePersistentProperty(properties);

  const [status, setStatus] = useState<"Idle" | "Saving…" | "Synced" | "Error">("Idle");
  useEffect(() => { setTitle("Check-in Editor"); }, [setTitle]);
  useEffect(() => { setPill(status === 'Saving…' ? 'Saving…' : status === 'Synced' ? 'Synced' : status === 'Error' ? 'Error' : 'Idle'); }, [status, setPill]);

  const [prop, setProp] = useState<Property | null>(null);

  async function refresh() {
    if (!propertyId) { setProp(null); return; }
    const { data, error } = await supabase
      .from("properties")
      .select("id,name,regulation_pdf_url,regulation_pdf_uploaded_at,contact_email,contact_phone,contact_address,presentation_image_url,presentation_image_uploaded_at")
      .eq("id", propertyId)
      .maybeSingle();
    if (error) { setProp(null); }
    else setProp((data ?? null) as Property | null);
  }

  useEffect(() => { refresh(); }, [propertyId, supabase]);

  function onPropChange(e: React.ChangeEvent<HTMLSelectElement>) { setPropertyId(e.currentTarget.value); }

  async function triggerPdfUpload() {
    if (!propertyId) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.style.display = 'none';
    input.onchange = async () => {
      const file = input.files?.[0] || null;
      if (!file) { input.remove(); return; }
      setStatus('Saving…');
      try {
        const fd = new FormData();
        fd.append('propertyId', propertyId);
        fd.append('file', file);
        const res = await fetch('/api/property/regulation/upload', { method: 'POST', body: fd });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) { alert(j?.error || 'Upload failed'); setStatus('Error'); return; }
        await refresh();
        setStatus('Synced'); setTimeout(() => setStatus('Idle'), 800);
      } catch { setStatus('Error'); }
      finally { input.remove(); }
    };
    document.body.appendChild(input);
    input.click();
  }

  async function saveContacts(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!prop) return;
    setStatus('Saving…');
    const { error } = await supabase
      .from('properties')
      .update({
        contact_email: prop.contact_email ?? null,
        contact_phone: prop.contact_phone ?? null,
        contact_address: prop.contact_address ?? null,
      })
      .eq('id', prop.id);
    if (error) { setStatus('Error'); return; }
    setStatus('Synced'); setTimeout(() => setStatus('Idle'), 800);
  }

  async function triggerImageUpload() {
    if (!propertyId) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.onchange = async () => {
      const file = input.files?.[0] || null;
      if (!file) { input.remove(); return; }
      setStatus('Saving…');
      try {
        const fd = new FormData();
        fd.append('propertyId', propertyId);
        fd.append('file', file);
        const res = await fetch('/api/property/profile/upload', { method: 'POST', body: fd });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) { alert(j?.error || 'Upload failed'); setStatus('Error'); return; }
        await refresh();
        setStatus('Synced'); setTimeout(() => setStatus('Idle'), 800);
      } catch { setStatus('Error'); }
      finally { input.remove(); }
    };
    document.body.appendChild(input);
    input.click();
  }

  return (
    <div style={{ display:'grid', gap:16 }}>
      {/* Property selector */}
      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Select Property</h2>
        <select value={propertyId || ''} onChange={onPropChange} style={FIELD}>
          {(properties || []).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </section>

      {prop && (
        <>
          {/* House Rules PDF */}
          <section style={card}>
            <h3 style={{ marginTop: 0 }}>House Rules PDF</h3>
            {prop.regulation_pdf_url ? (
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <a href={prop.regulation_pdf_url} target="_blank" rel="noreferrer" className="sb-btn sb-btn--primary">Open</a>
                <button className="sb-btn" onClick={triggerPdfUpload}>Replace PDF</button>
                <small style={{ color:'var(--muted)' }}>
                  Uploaded {prop.regulation_pdf_uploaded_at ? new Date(prop.regulation_pdf_uploaded_at).toLocaleString() : ''}
                </small>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <span style={{ color:'var(--muted)' }}>No PDF uploaded.</span>
                <button className="sb-btn" onClick={triggerPdfUpload}>Upload PDF</button>
              </div>
            )}
          </section>

          {/* Contact details */}
          <section style={card}>
            <h3 style={{ marginTop: 0 }}>Property Contact</h3>
            <form onSubmit={saveContacts} style={{ display:'grid', gap:12, maxWidth:560 }}>
              <div>
                <label style={{ display:'block', marginBottom:6 }}>Email</label>
                <input
                  type="email"
                  value={prop.contact_email ?? ''}
                  onChange={(e) => { const v = e.currentTarget.value; setProp(prev => prev ? { ...prev, contact_email: v } : prev); }}
                  placeholder="example@hotel.com"
                  style={FIELD}
                />
              </div>
              <div>
                <label style={{ display:'block', marginBottom:6 }}>Phone</label>
                <input
                  type="tel"
                  value={prop.contact_phone ?? ''}
                  onChange={(e) => { const v = e.currentTarget.value; setProp(prev => prev ? { ...prev, contact_phone: v } : prev); }}
                  placeholder="+40 712 345 678"
                  style={FIELD}
                />
              </div>
              <div>
                <label style={{ display:'block', marginBottom:6 }}>Address</label>
                <input
                  value={prop.contact_address ?? ''}
                  onChange={(e) => { const v = e.currentTarget.value; setProp(prev => prev ? { ...prev, contact_address: v } : prev); }}
                  placeholder="Street, city, optional details"
                  style={FIELD}
                />
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                <button type="submit" className="sb-btn sb-btn--primary">Save</button>
              </div>
            </form>
          </section>

          {/* Presentation Image */}
          <section style={card}>
            <h3 style={{ marginTop: 0 }}>Presentation Image</h3>
            <div style={{ display:'grid', gap:10 }}>
              {prop.presentation_image_url ? (
                <div style={{ display:'grid', gap:8 }}>
                  <img src={prop.presentation_image_url} alt="Presentation" style={{ width: 420, maxWidth:'100%', height: 240, objectFit:'cover', borderRadius: 12, border:'1px solid var(--border)', background:'#fff' }} />
                  <small style={{ color:'var(--muted)' }}>
                    Uploaded {prop.presentation_image_uploaded_at ? new Date(prop.presentation_image_uploaded_at).toLocaleString() : ''}
                  </small>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <a href={prop.presentation_image_url} target="_blank" rel="noreferrer" className="sb-btn">Open full</a>
                    <button className="sb-btn" onClick={triggerImageUpload}>Replace image</button>
                  </div>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <span style={{ color:'var(--muted)' }}>No image uploaded.</span>
                  <button className="sb-btn" onClick={triggerImageUpload}>Upload image</button>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
