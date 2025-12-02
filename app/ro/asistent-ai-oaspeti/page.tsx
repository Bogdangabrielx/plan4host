import s from "../../legal/legal.module.css";
import ForceDark from "@/components/theme/ForceDark";

export default function RoGuestAiAssistantPage() {
  return (
    <main className={s.page}>
      <ForceDark />
      <div className={s.container}>
      <article style={{ width: "100%", maxWidth: 960 }}>
        <header
          style={{
            textAlign: "center",
            marginBottom: 28,
            display: "grid",
            gap: 14,
            placeItems: "center",
          }}
        >
          <img
            src="/p4h_logo_rotund.png"
            alt="Plan4Host"
            width={80}
            height={80}
            style={{
              borderRadius: 999,
              border: "2px solid var(--border)",
              background: "var(--card)",
            }}
          />
          <h1 style={{ fontSize: 30, marginBottom: 4 }}>
            Guest AI assistant – asistentul tău pentru oaspeți
          </h1>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>
            Oferă răspunsuri clare despre sosire, facilități și plecare – direct în limba oaspetelui.
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2.5fr)",
            gap: 20,
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              padding: 16,
              borderRadius: 18,
              border: "1px solid var(--border)",
              background:
                "radial-gradient(circle at top left, rgba(0,209,255,0.14), transparent 55%), radial-gradient(circle at bottom right, rgba(124,58,237,0.22), transparent 55%), var(--panel)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: 20 }}>Ce este Guest AI assistant?</h2>
            <p style={{ marginTop: 8 }}>
              Guest AI assistant este un mic asistent fix în colțul paginii dedicate oaspetelui, acolo unde vede toate
              mesajele automate și detaliile rezervării. În loc să scrie mesaje lungi, oaspetele apasă pe meniuri precum{" "}
              <strong>Detalii la sosire</strong>, <strong>Facilități</strong>, <strong>Extra</strong> sau{" "}
              <strong>Check‑out</strong> și primește răspunsuri scurte și clare.
            </p>
            <p style={{ marginTop: 8 }}>
              Asistentul folosește informațiile pe care le-ai introdus deja în Plan4Host – mesaje de rezervare, PDF‑ul
              cu Regulamentul și textul pregătit special pentru AI în editorul de Check‑in.
            </p>
          </div>
          <div style={{ justifySelf: "center" }}>
            <div
              style={{
                borderRadius: 22,
                overflow: "hidden",
                border: "1px solid rgba(148,163,184,0.45)",
                boxShadow: "0 18px 40px rgba(0,0,0,0.65)",
                maxWidth: 380,
                width: "100%",
              }}
            >
              <img
                src="/AI_chatbot.png"
                alt="Previzualizare interfață Guest AI assistant"
                style={{ display: "block", width: "100%", height: "auto" }}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 style={{ marginTop: 0 }}>La ce întrebări poate răspunde?</h2>
          <ul style={{ paddingLeft: "1.2rem", marginTop: 8 }}>
            <li>
              <strong>Detalii la sosire:</strong> informații de parcare, coduri de acces, cum intră în locație și ora de
              check‑in configurată.
            </li>
            <li>
              <strong>Facilități:</strong> Wi‑Fi (nume rețea &amp; parolă), aparat de cafea, aer condiționat, mașină de
              spălat, mașină de spălat vase, minibar etc. – inclusiv dacă sunt incluse sau contra cost, atunci când asta
              este menționat în mesajele sau regulile tale.
            </li>
            <li>
              <strong>Extra:</strong> recomandări locale despre unde poate mânca, bea o cafea sau ce poate vizita în
              apropiere, dacă le-ai menționat în conținut.
            </li>
            <li>
              <strong>Check‑out:</strong> un rezumat scurt cu data și ora de check‑out și regulile importante (lumini,
              uși, chei, gunoi) dacă sunt definite.
            </li>
          </ul>
          <p style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>
            La finalul fiecărui răspuns, oaspetele vede și un buton de contact direct cu gazda – dacă mai are întrebări.
          </p>
        </section>

        <section>
          <h2 style={{ marginTop: 28 }}>De unde știe AI-ul ce să răspundă?</h2>
          <p>
            Guest AI assistant nu „ghicește” informații. Poate folosi doar ceea ce ai introdus tu în Plan4Host:
          </p>
          <ul style={{ paddingLeft: "1.2rem", marginTop: 8 }}>
            <li>
              <strong>Mesajele de rezervare</strong> (RO/EN) din secțiunea de mesaje automate.
            </li>
            <li>
              <strong>PDF-ul cu Regulamentul casei</strong> încărcat în Check‑in Editor.
            </li>
            <li>
              <strong>Textul „House rules for AI”</strong> – pe care îl verifici și îl salvezi după ce folosești butonul
              „Read &amp; prepare text for AI”.
            </li>
          </ul>
          <p style={{ marginTop: 8 }}>
            Asistentul caută mai întâi răspunsul în mesajele de rezervare, apoi în textul pregătit pentru AI. Dacă
            informația lipsește sau este neclară, spune asta și îl îndeamnă pe oaspete să contacteze direct gazda – nu
            inventează nimic.
          </p>
        </section>

        <section>
          <h2 style={{ marginTop: 28 }}>Siguranță: fără coduri sau parole inventate</h2>
          <p>
            Am setat reguli clare pentru Guest AI assistant astfel încât <strong>să nu inventeze</strong> date sensibile:
          </p>
          <ul style={{ paddingLeft: "1.2rem", marginTop: 8 }}>
            <li>nu generează coduri de acces sau combinații pentru uși / lockbox;</li>
            <li>nu inventează nume de rețea Wi‑Fi sau parole;</li>
            <li>nu inventează numere de telefon, adrese sau ore de check‑in / check‑out.</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            Dacă nu găsește o informație clară în mesajele și regulile tale, răspunsul va fi de tipul „nu este clar din
            informațiile disponibile” și va sugera contactarea gazdei.
          </p>
        </section>

        <section>
          <h2 style={{ marginTop: 28 }}>Cum activezi Guest AI assistant</h2>
          <ol style={{ paddingLeft: "1.2rem", marginTop: 8 }}>
            <li>
              În aplicație, intră în <strong>Check‑in Editor</strong> și încarcă PDF‑ul cu Regulamentul casei (dacă nu
              l‑ai încărcat deja).
            </li>
            <li>
              Apasă <strong>Read &amp; prepare text for AI</strong>, verifică textul extras și șterge din el coduri,
              parole sau linkuri private pe care nu vrei să le afișezi.
            </li>
            <li>
              Salvează textul ca „House rules for AI”. De aici, asistentul îl va folosi împreună cu mesajele de
              rezervare când răspunde la întrebările oaspeților.
            </li>
            <li>
              Pentru rezervațiile cu mesaje active, oaspeții vor vedea Guest AI assistant pe pagina lor dedicată.
            </li>
          </ol>
        </section>

        <section style={{ marginTop: 32 }}>
          <div
            style={{
              padding: 16,
              borderRadius: 18,
              border: "1px solid rgba(148,163,184,0.55)",
              background:
                "linear-gradient(135deg, rgba(0,209,255,0.25), rgba(124,58,237,0.75))",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ maxWidth: 520 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>Disponibil pe planurile Premium</h2>
              <p style={{ marginTop: 6, marginBottom: 0, fontSize: 14 }}>
                Guest AI assistant este disponibil în prezent pentru conturile <strong>Premium</strong>. Activează‑l
                pentru a reduce întrebările repetitive și pentru a‑i ajuta pe oaspeți să găsească rapid informațiile de
                care au nevoie.
              </p>
            </div>
            <a
              href="/auth/login?mode=signup&plan=premium&next=%2Fapp%2Fsubscription%3Fplan%3Dpremium%26hl%3D1"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 18px",
                borderRadius: 999,
                fontWeight: 700,
                textDecoration: "none",
                border: "1px solid rgba(15,23,42,0.4)",
                background: "#0b1120",
                color: "#f9fafb",
                boxShadow: "0 10px 30px rgba(0,0,0,0.65)",
                whiteSpace: "nowrap",
              }}
            >
              Încearcă Guest AI assistant
            </a>
          </div>
        </section>
      </article>
      </div>
    </main>
  );
}
