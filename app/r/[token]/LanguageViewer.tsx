"use client";

import { useMemo, useState } from "react";

export default function LanguageViewer({ htmlRo, htmlEn, lang: langOverride, showToggle = true }: { htmlRo: string; htmlEn: string; lang?: 'ro'|'en'; showToggle?: boolean }) {
  const ro = (htmlRo || '').trim();
  const en = (htmlEn || '').trim();
  const [langState, setLangState] = useState<'ro'|'en'>(() => (ro ? 'ro' : 'en'));
  const lang = langOverride || langState;
  const content = useMemo(() => (lang==='ro' ? (ro || en) : (en || ro)), [lang, ro, en]);
  return (
    <article className="rm-card">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <strong>Message</strong>
        {showToggle && (
          <div style={{ display:'inline-flex', gap:8 }}>
            <button onClick={()=>setLangState('ro')} className="sb-btn" style={{ padding:'6px 10px', borderRadius:8, border:'1px solid var(--border)', background: lang==='ro' ? 'var(--primary)' : 'var(--card)', color: lang==='ro' ? '#0c111b' : 'var(--text)', display:'inline-flex', alignItems:'center', gap:6 }}>
              <img src="/ro.png" alt="RO" width={16} height={16} />
              <span>Română</span>
            </button>
            <button onClick={()=>setLangState('en')} className="sb-btn" style={{ padding:'6px 10px', borderRadius:8, border:'1px solid var(--border)', background: lang==='en' ? 'var(--primary)' : 'var(--card)', color: lang==='en' ? '#0c111b' : 'var(--text)', display:'inline-flex', alignItems:'center', gap:6 }}>
              <img src="/eng.png" alt="EN" width={16} height={16} />
              <span>English</span>
            </button>
          </div>
        )}
      </div>
      <div className="rm-content" dangerouslySetInnerHTML={{ __html: content }} />
    </article>
  );
}
