import s from "../legal/legal.module.css";
import ForceDark from "@/components/theme/ForceDark";

export default function GuestAiAssistantPage() {
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
            Guest AI assistant – smarter answers for your guests
          </h1>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>
            Help guests find arrival, amenities and check‑out details instantly, in their own language.
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
            <h2 style={{ marginTop: 0, fontSize: 20 }}>What is the Guest AI assistant?</h2>
            <p style={{ marginTop: 8 }}>
              Guest AI assistant is a floating, language‑aware helper shown on the dedicated guest page where each
              reservation sees your automated messages and key stay details. Instead of writing long questions, guests
              tap smart menus like <strong>Arrival details</strong>, <strong>Amenities</strong>,{" "}
              <strong>Extras</strong> or <strong>Check‑out</strong> and get short, clear answers.
            </p>
            <p style={{ marginTop: 8 }}>
              It works on top of information you already manage in Plan4Host – your reservation messages, House Rules
              PDF and the curated “House rules for AI” text from the Check‑in Editor.
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
                alt="Preview of the Guest AI assistant interface"
                style={{ display: "block", width: "100%", height: "auto" }}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 style={{ marginTop: 0 }}>What can it answer?</h2>
          <ul style={{ paddingLeft: "1.2rem", marginTop: 8 }}>
            <li>
              <strong>Arrival details:</strong> parking info, access codes, how to enter the property and configured
              check‑in time.
            </li>
            <li>
              <strong>Amenities:</strong> Wi‑Fi (network &amp; password), coffee machine, AC, washing machine,
              dishwasher, minibar and more – including whether they are free or paid extra when this is written in your
              rules or messages.
            </li>
            <li>
              <strong>Extras:</strong> local tips for where to eat, have a coffee or what to visit nearby, when you
              mention them in your content.
            </li>
            <li>
              <strong>Check‑out:</strong> a short summary of check‑out date and time plus key check‑out instructions
              (lights, doors, keys, trash) if you’ve provided them.
            </li>
          </ul>
          <p style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>
            Every AI answer ends with a clear “contact the host” option so guests can always reach you directly if they
            still have questions.
          </p>
        </section>

        <section>
          <h2 style={{ marginTop: 28 }}>Where does the assistant get its information?</h2>
          <p>
            Guest AI assistant never guesses. It can only use the information you have already provided in Plan4Host:
          </p>
          <ul style={{ paddingLeft: "1.2rem", marginTop: 8 }}>
            <li>
              <strong>Reservation messages</strong> (RO/EN) created in Automatic Messages and shown on the guest page.
            </li>
            <li>
              <strong>House Rules PDF</strong> that you upload in the Check‑in Editor.
            </li>
            <li>
              <strong>AI‑ready house rules</strong> – the text you review and save after using “Read &amp; prepare text
              for AI” in Check‑in Editor.
            </li>
          </ul>
          <p style={{ marginTop: 8 }}>
            The assistant first looks for answers in your reservation messages, then in the AI‑ready house rules text.
            If something is missing or unclear, it will say so and invite the guest to contact you, instead of making
            something up.
          </p>
        </section>

        <section>
          <h2 style={{ marginTop: 28 }}>Safety: no invented codes or passwords</h2>
          <p>
            We explicitly instruct the Guest AI assistant to <strong>never invent</strong> or modify sensitive data:
          </p>
          <ul style={{ paddingLeft: "1.2rem", marginTop: 8 }}>
            <li>no made‑up access codes or door/lockbox combinations,</li>
            <li>no invented Wi‑Fi names or passwords,</li>
            <li>no fake phone numbers, addresses or check‑in/out times.</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            If the assistant cannot find a precise value in your content, it will respond with a polite “it is not clear
            from the available information” and advise the guest to contact you for exact details.
          </p>
        </section>

        <section>
          <h2 style={{ marginTop: 28 }}>How to enable Guest AI assistant</h2>
          <ol style={{ paddingLeft: "1.2rem", marginTop: 8 }}>
            <li>
              In the app, go to <strong>Check‑in Editor</strong> and upload your House Rules PDF if you haven’t already.
            </li>
            <li>
              Click <strong>Read &amp; prepare text for AI</strong>, review the extracted text and remove any codes,
              passwords or private links you don’t want to expose.
            </li>
            <li>
              Save the text as “House rules for AI”. The assistant will now use it, together with your Reservation
              Messages, when answering questions.
            </li>
            <li>
              For each reservation with active messages, guests will see the Guest AI assistant on their dedicated page.
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
              <h2 style={{ margin: 0, fontSize: 20 }}>Available on Premium plans</h2>
              <p style={{ marginTop: 6, marginBottom: 0, fontSize: 14 }}>
                Guest AI assistant is currently available for <strong>Premium</strong> accounts. Activate it to reduce
                repetitive questions and give guests clear answers before they even contact you.
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
              Get your AI assistant
            </a>
          </div>
        </section>
      </article>
      </div>
    </main>
  );
}
