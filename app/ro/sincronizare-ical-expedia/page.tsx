export default function RoExpediaIcalPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        padding: '32px 20px',
        background: 'var(--bg)',
      }}
    >
      <article style={{ width: '100%', maxWidth: 860 }}>
        <header style={{ textAlign: 'center', marginBottom: 24, display: 'grid', gap: 10, placeItems: 'center' }}>
          <img
            src="/p4h_logo_rotund.png"
            alt="Plan4Host"
            width={80}
            height={80}
            style={{ borderRadius: 999, border: '2px solid var(--border)', background: 'var(--card)' }}
          />
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>Sincronizare iCal Expedia — Conectează calendarul</h1>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: 14 }}>
            Ghid rapid pentru conectarea Expedia cu Plan4Host prin iCal.
          </p>
        </header>

        <p style={{ color: 'var(--muted)' }}>
        Expedia permite sincronizarea calendarului prin iCal. Iată pașii generali pentru conectare cu Plan4Host.
      </p>
      <h2 style={{ marginTop: 24 }}>Pași</h2>
      <ol>
        <li>Deschide Expedia Partner Central → Calendar.</li>
        <li>Găsește linkul iCal de export și copiază-l.</li>
        <li>În Plan4Host, adaugă un canal iCal pentru camera/unitatea dorită și lipește URL-ul de export Expedia.</li>
        <li>Copiază URL-ul de export iCal din Plan4Host și importă-l înapoi în Expedia.</li>
        <li>Reîmprospătează și verifică apariția evenimentelor.</li>
      </ol>
        <p style={{ marginTop: 24 }}>
          Ai nevoie de ajutor?{" "}
          <a href="/auth/login?mode=signup" style={{ color: "var(--primary)" }}>
            Încearcă gratuit
          </a>{" "}
          și configurează „Sync Calendars”.
        </p>
      </article>
    </main>
  );
}
