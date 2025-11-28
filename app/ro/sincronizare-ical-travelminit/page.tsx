export default function RoTravelminitIcalPage() {
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
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>Sincronizare iCal Travelminit — Conectează calendarul</h1>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: 14 }}>
            Pași simpli pentru a conecta Travelminit cu Plan4Host.
          </p>
        </header>

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
      </article>
    </main>
  );
}
