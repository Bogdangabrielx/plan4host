export default function SincronizareIcalAirbnbRO() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        padding: "32px 20px",
        background: "var(--bg)",
      }}
    >
      <article style={{ width: "100%", maxWidth: 860 }}>
        <header style={{ textAlign: "center", marginBottom: 24, display: "grid", gap: 10, placeItems: "center" }}>
          <img
            src="/p4h_logo_rotund.png"
            alt="Plan4Host"
            width={80}
            height={80}
            style={{ borderRadius: 999, border: "2px solid var(--border)", background: "var(--card)" }}
          />
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>Sincronizare iCal Airbnb — Cum conectezi calendarul</h1>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>
            Ghid scurt, practic, pentru a sincroniza Airbnb cu Plan4Host.
          </p>
        </header>

        <p style={{ color: "var(--muted)" }}>
        Ține Airbnb și celelalte calendare sincronizate cu iCal pentru a evita overbooking-ul. Mai jos găsești pașii esențiali și bune practici.
      </p>

      <h2 style={{ marginTop: 24 }}>Ce este sincronizarea iCal?</h2>
      <p>
        iCal este un format standard de calendar (.ics) suportat de Airbnb pentru import/export. Plan4Host folosește iCal pentru a prelua periodic
        rezervări noi și pentru a distribui disponibilitatea către alte canale care acceptă iCal.
      </p>

      <h2 style={{ marginTop: 24 }}>Pași de conectare</h2>
      <ol>
        <li>Deschide Airbnb → Listings → Availability → iCal export și copiază adresa URL de export.</li>
        <li>În Plan4Host, deschide Channels și adaugă un canal nou iCal pentru listarea ta.</li>
        <li>Lipește adresa URL de export Airbnb și salvează.</li>
        <li>Din Plan4Host, copiază adresa URL iCal de export și adaug-o în Airbnb, la iCal import.</li>
        <li>Așteaptă prima sincronizare (conform planului) și verifică apariția evenimentelor în ambele calendare.</li>
      </ol>

      <h2 style={{ marginTop: 24 }}>Sfaturi</h2>
      <ul>
        <li>Folosește un calendar per unitate/cameră pentru a evita suprapunerile.</li>
        <li>Nu partaja public URL-urile iCal; tratează-le ca pe niște secrete.</li>
        <li>Forțează un refresh manual după configurare pentru validare rapidă.</li>
        <li>Păstrează fusurile orare consistente pe canale.</li>
      </ul>

        <p style={{ marginTop: 24 }}>
        Gata de conectare? <a href="/auth/login?mode=signup">Începe gratuit</a> sau vezi mai multe pe pagina de <a href="/ro#features">caracteristici</a>.
        </p>

      {/* JSON-LD HowTo (RO) */}
        <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "Cum sincronizezi calendarul Airbnb cu iCal",
            step: [
              { "@type": "HowToStep", name: "Copiază URL-ul de export iCal din Airbnb" },
              { "@type": "HowToStep", name: "Adaugă canalul iCal în Plan4Host" },
              { "@type": "HowToStep", name: "Lipește URL-ul de export" },
              { "@type": "HowToStep", name: "Importă iCal-ul Plan4Host în Airbnb" },
              { "@type": "HowToStep", name: "Verifică sincronizarea" }
            ]
          })
        }}
      />
      </article>
    </main>
  );
}
