export default function SincronizareIcalBookingRO() {
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
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>Sincronizare iCal Booking.com — Cum conectezi calendarul</h1>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>
            Ghid rapid pentru conectarea Booking.com cu Plan4Host prin iCal.
          </p>
        </header>

        <p style={{ color: "var(--muted)" }}>
          Ține Booking.com și celelalte calendare sincronizate cu iCal pentru a evita overbooking-ul. Mai jos găsești explicații și pașii esențiali.
        </p>

        <h2 style={{ marginTop: 24 }}>Ce este sincronizarea iCal?</h2>
        <p>
          iCal este un format standard de calendar (.ics) suportat de Booking.com pentru import și export de rezervări și blocări de disponibilitate.
          Plan4Host folosește iCal pentru a prelua periodic rezervări noi din Booking.com și pentru a trimite înapoi blocări de disponibilitate, astfel
          încât să reduci riscul de suprapuneri între canale.
        </p>

        <h2 style={{ marginTop: 24 }}>Pași de conectare</h2>
        <ol>
          <li>Deschide Booking.com Extranet → Rates &amp; Availability → Calendar &amp; pricing → Sync calendars (iCal).</li>
          <li>Copiază URL-ul de export iCal din Booking.com pentru camera/unitatea dorită.</li>
          <li>
            În Plan4Host, deschide Management → Sync Calendars → Import și adaugă un canal iCal pentru aceeași cameră/unitate, apoi lipește URL-ul de export
            Booking.com și salvează.
          </li>
          <li>
            Din Plan4Host, copiază URL-ul iCal de export pentru acea cameră/unitate și importă-l înapoi în Booking.com, în secțiunea de iCal import.
          </li>
          <li>
            Forțează un refresh manual și, după prima sincronizare (conform planului tău), verifică apariția evenimentelor în ambele calendare.
          </li>
        </ol>

        <h2 style={{ marginTop: 24 }}>Sfaturi</h2>
        <ul>
          <li>Folosește un calendar separat per cameră/unitate pentru mapare curată și fără suprapuneri.</li>
          <li>Nu partaja public URL-urile iCal; tratează-le ca pe niște link-uri private.</li>
          <li>Reține că iCal transportă evenimente/blocări, nu reguli de preț; păstrează setările de tarife în Extranet.</li>
          <li>Ține fusurile orare consistente între Booking.com, Plan4Host și celelalte canale.</li>
        </ul>

        <p style={{ marginTop: 24 }}>
          Gata de conectare?{" "}
          <a href="/auth/login?mode=signup" style={{ color: "var(--primary)" }}>
            Începe gratuit
          </a>{" "}
          sau vezi{" "}
          <a href="/ro#features" style={{ color: "var(--primary)" }}>
            Sync Calendars
          </a>{" "}
          la caracteristici.
        </p>
      </article>
    </main>
  );
}
