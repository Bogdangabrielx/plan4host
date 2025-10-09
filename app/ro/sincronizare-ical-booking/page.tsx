export default function SincronizareIcalBookingRO() {
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>Sincronizare iCal Booking.com — Cum conectezi calendarul</h1>
      <p style={{ color: "var(--muted)" }}>
        Ține Booking.com și celelalte calendare sincronizate cu iCal pentru a evita overbooking-ul. Urmează pașii de mai jos.
      </p>

      <h2 style={{ marginTop: 24 }}>Pași de conectare</h2>
      <ol>
        <li>Deschide Booking.com Extranet → Rates & Availability → Calendar & pricing → Sync calendars (iCal).</li>
        <li>Copiază URL-ul de export iCal din Booking.com.</li>
        <li>În Plan4Host, adaugă un canal iCal pentru camera/unitatea ta și lipește URL-ul de export.</li>
        <li>Copie URL-ul iCal de export din Plan4Host și importă-l în Booking.com.</li>
        <li>Forțează un refresh manual și verifică apariția evenimentelor în ambele calendare.</li>
      </ol>

      <h2 style={{ marginTop: 24 }}>Sfaturi</h2>
      <ul>
        <li>Un calendar per cameră/unitate pentru mapare curată.</li>
        <li>Reține că iCal transportă evenimente, nu reguli de preț; menține setările în Extranet.</li>
        <li>Ține fusurile orare consistente.</li>
      </ul>

      <p style={{ marginTop: 24 }}>
        Gata de conectare? <a href="/auth/login?mode=signup">Începe gratuit</a> sau vezi <a href="/ro#features">Sync Calendars</a> la caracteristici.
      </p>
    </main>
  );
}

