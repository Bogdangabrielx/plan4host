export default function RoCheckinFormsGdprPage() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px' }}>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>Formulare de check‑in online — conforme GDPR</h1>
      <p style={{ color: 'var(--muted)' }}>
        Plan4Host oferă formulare de check‑in online <strong>personalizabile</strong> care <strong>automatizează procesul de primire a oaspeților</strong> și reduc timpul la sosire.
      </p>

      <h2 style={{ marginTop: 24 }}>Ce primești</h2>
      <ul>
        <li>Câmpuri personalizabile (nume, email, telefon, adresă, naționalitate, detalii sejur).</li>
        <li>Încărcare imagine act (CI/pașaport) — pentru verificare la sosire.</li>
        <li>Capturare consimțământ — textele de informare și acord GDPR la îndemână.</li>
        <li>Date stocate în UE, acces controlat, criptare în tranzit.</li>
        <li><a href="/legal/dpa">Acord de prelucrare a datelor (DPA)</a> și <a href="/legal/privacy">Politică de confidențialitate</a> clare.</li>
      </ul>

      <h2 style={{ marginTop: 24 }}>Cum funcționează</h2>
      <ol>
        <li>Trimiți oaspetelui linkul de check‑in (automat din Plan4Host sau manual).</li>
        <li>Oaspetele completează formularul pe telefon ori desktop, înainte de sosire.</li>
        <li>Datele apar în contul tău; poți verifica actul și confirmarea acordului.</li>
      </ol>

      <p style={{ marginTop: 24 }}>
        Încearcă acum: <a href="/auth/login?mode=signup">Încearcă gratuit</a> și activează check‑in‑ul pentru proprietățile tale.
      </p>
    </main>
  );
}

