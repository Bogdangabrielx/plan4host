// app/page.tsx
export default function HomePage() {
  return (
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      <h1>Plan4Host</h1>
      <p>Simplify your small-hotel operations: calendar, cleaning, channels & iCal.</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a href="/auth/login" style={linkPrimary}>Log in</a>
        <a href="/auth/signup" style={linkGhost}>Create account</a>
        <a href="/pricing" style={linkGhost}>Pricing</a>
      </div>
    </main>
  );
}

const linkPrimary: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--primary)",
  color: "#0c111b",
  fontWeight: 800,
  textDecoration: "none",
};

const linkGhost: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 800,
  textDecoration: "none",
};