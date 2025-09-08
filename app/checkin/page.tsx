import CheckinClient from "./ui/CheckinClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CheckinPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        color: "var(--text)",
        display: "grid",
        placeItems: "start center",
      }}
    >
      <main style={{ width: "min(720px, 94vw)", padding: 16 }}>
        <CheckinClient />
      </main>
    </div>
  );
}