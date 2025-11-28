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
          Ține Travelminit și celelalte calendare sincronizate cu iCal pentru a evita overbooking-ul. Mai jos găsești explicații și pașii esențiali.
        </p>

        <h2 style={{ marginTop: 24 }}>Ce este sincronizarea iCal?</h2>
        <p>
          iCal este un format standard de calendar (.ics) folosit de multe platforme, inclusiv Travelminit, pentru import și export de rezervări și blocări de
          disponibilitate. Plan4Host folosește iCal pentru a prelua periodic rezervări noi și pentru a distribui disponibilitatea către alte canale care acceptă iCal.
        </p>

        <h2 style={{ marginTop: 24 }}>Pași de conectare</h2>
        <ol>
          <li>Deschide contul Travelminit și mergi în zona de Calendar / iCal.</li>
          <li>Copiază linkul de export iCal din Travelminit pentru camera/unitatea dorită.</li>
          <li>
            În Plan4Host, deschide Management → Sync Calendars → Import și adaugă un canal nou iCal pentru aceeași cameră/unitate, apoi lipește URL-ul de export
            Travelminit și salvează.
          </li>
          <li>
            Din Plan4Host, copiază adresa URL iCal de export pentru acea cameră/unitate și importă-o înapoi în Travelminit, în secțiunea de iCal import (dacă este
            disponibilă).
          </li>
          <li>
            Reîmprospătează și, după prima sincronizare (conform planului tău), verifică apariția evenimentelor în ambele calendare.
          </li>
        </ol>

        <h2 style={{ marginTop: 24 }}>Sfaturi</h2>
        <ul>
          <li>Folosește un calendar separat per cameră/unitate pentru mapare clară și fără suprapuneri.</li>
          <li>Nu partaja public link-urile iCal; tratează-le ca pe niște URL-uri private.</li>
          <li>După configurare, forțează un refresh manual și verifică câteva date de test.</li>
          <li>Păstrează fusurile orare consistente între Travelminit, Plan4Host și celelalte canale.</li>
        </ul>

        <p style={{ marginTop: 24 }}>
          Întrebări?{" "}
          <a href="/auth/login?mode=signup" style={{ color: "var(--primary)" }}>
            Încearcă gratuit
          </a>{" "}
          și configurează „Sync Calendars” în Plan4Host.
        </p>
      </article>
    </main>
  );
}
