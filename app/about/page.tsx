export default function AboutPage() {
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>About us</h1>
      <p style={{ color: "var(--muted)" }}>
        This page is a work in progress. We’re preparing a short story about how Plan4Host started and where we’re going.
      </p>
      <p style={{ color: "var(--muted)", marginTop: 16 }}>
        Need anything meanwhile? Reach out at {" "}
        <a href="mailto:office@plan4host.com" style={{ color: "var(--primary)", fontWeight: 800 }}>
          office@plan4host.com
        </a>{" "}
        or message us on WhatsApp: {" "}
        <a href="https://wa.me/40721759329" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontWeight: 800 }}>
          +40 721 759 329
        </a>.
      </p>
    </main>
  );
}

