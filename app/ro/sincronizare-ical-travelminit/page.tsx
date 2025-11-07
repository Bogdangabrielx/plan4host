export default function RoTravelminitIcalPage() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px' }}>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>Sincronizare iCal Travelminit — Conectează calendarul</h1>
      <p style={{ color: 'var(--muted)' }}>
        Travelminit suportă iCal pentru sincronizarea calendarului. Urmează pașii de mai jos pentru a-l conecta la Plan4Host.
      </p>
      <h2 style={{ marginTop: 24 }}>Pași</h2>
      <ol>
        <li>Deschide contul Travelminit → Calendar/iCal.</li>
        <li>Copiază linkul de export iCal din Travelminit.</li>
        <li>În Plan4Host, adaugă un canal iCal pentru camera/unitatea dorită și lipește URL-ul.</li>
        <li>Copiază URL-ul iCal din Plan4Host și importă-l în Travelminit.</li>
        <li>Reîmprospătează și verifică sincronizarea evenimentelor.</li>
      </ol>
      <p style={{ marginTop: 24 }}>Întrebări? <a href="/auth/login?mode=signup">Încearcă gratuit</a> și configurează „Sync Calendars”.</p>
    </main>
  );
}

