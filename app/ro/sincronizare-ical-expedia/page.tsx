export default function RoExpediaIcalPage() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px' }}>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>Sincronizare iCal Expedia — Conectează calendarul</h1>
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
      <p style={{ marginTop: 24 }}>Ai nevoie de ajutor? <a href="/auth/login?mode=signup">Încearcă gratuit</a> și configurează „Sync Calendars”.</p>
    </main>
  );
}

