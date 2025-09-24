export const metadata = {
  title: "Cookie Policy | Plan4host",
  robots: { index: true },
};

export default function CookiePolicyPage() {
  const lastUpdated = "2025-09-01"; // ← actualizează când schimbi conținutul

  return (
    <main style={{ maxWidth: 900, margin: "48px auto", padding: "0 20px", color: "var(--text)" }}>
      <h1 style={{ marginBottom: 8 }}>Cookie Policy</h1>
      <p style={{ color: "var(--muted)" }}>Ultima actualizare: {lastUpdated}</p>

      <section>
        <h2>1. Cine suntem</h2>
        <p>
          Această pagină aparține <strong>Plan4host</strong> (operator de date). Ne poți contacta la
          {" "}<a href="mailto:office@plan4host.com">office@plan4host.com</a>.
        </p>
      </section>

      <section>
        <h2>2. Ce sunt cookie-urile?</h2>
        <p>
          Cookie-urile sunt fișiere mici stocate pe dispozitivul tău. Folosim și tehnologii similare
          (local storage, pixel tags) pe care le numim, împreună, „cookie-uri”.
        </p>
      </section>

      <section>
        <h2>3. Cum folosim cookie-urile</h2>
        <p>Folosim cookie-uri pentru:</p>
        <ul>
          <li><strong>Necesare</strong>: funcționarea site-ului (autentificare, securitate, preferințe esențiale).</li>
          <li><strong>Preferințe</strong>: reținerea setărilor tale.</li>
          <li><strong>Statistici</strong>: măsurarea traficului și îmbunătățirea produsului.</li>
          <li><strong>Marketing</strong>: conținut și anunțuri personalizate (dacă accepți).</li>
        </ul>
      </section>

      <section>
        <h2>4. Consimțământ</h2>
        <p>
          În zonele unde este necesar, setăm cookie-uri de statistici/marketing doar după ce îți exprimi
          consimțământul. Îți poți schimba oricând opțiunile:
        </p>
        <p>
          <button
            type="button"
            onClick={() => {
              // Conectează aici CMP-ul tău:
              // OneTrust: window.Optanon && window.Optanon.ToggleInfoDisplay();
              // Cookiebot: window.Cookiebot && window.Cookiebot.show();
              // Klaro: window.klaro && window.klaro.show();
              (window as any).showConsentManager?.();
            }}
            className="sb-btn sb-btn--ghost"
          >
            Deschide centrul de preferințe cookie
          </button>
        </p>
      </section>

      <section>
        <h2>5. Tabelul cookie-urilor</h2>
        <p style={{ color: "var(--muted)" }}>
          Exemplu. Completează/actualizează automat din CMP sau în mod manual.
        </p>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Cookie</th>
                <th>Furnizor</th>
                <th>Scop</th>
                <th>Categorie</th>
                <th>Durată</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>p4h_session</td>
                <td>Plan4host (first-party)</td>
                <td>Autentificare și securitate</td>
                <td>Necesar</td>
                <td>Session</td>
              </tr>
              <tr>
                <td>_ga</td>
                <td>Google Analytics (third-party)</td>
                <td>Statistici de utilizare</td>
                <td>Statistici</td>
                <td>13 luni</td>
              </tr>
              <tr>
                <td>_fbp</td>
                <td>Meta (third-party)</td>
                <td>Remarketing/ads</td>
                <td>Marketing</td>
                <td>3 luni</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>6. Cum controlezi cookie-urile</h2>
        <ul>
          <li>Prin centrul de preferințe de mai sus.</li>
          <li>Din setările browserului (ștergere/blocare cookie-uri).</li>
          <li>Din setările dispozitivului pentru ID-urile de publicitate (iOS/Android).</li>
        </ul>
      </section>

      <section>
        <h2>7. Cookie-uri terțe</h2>
        <p>
          Anumiți furnizori pot seta cookie-uri când folosești Plan4host. Te rugăm să citești politicile lor pentru detalii
          despre prelucrare și transferuri.
        </p>
      </section>

      <section>
        <h2>8. Modificări</h2>
        <p>
          Putem actualiza această politică. Vom publica noua versiune aici și vom actualiza data „Ultima actualizare”.
        </p>
      </section>
    </main>
  );
}