import type { Metadata } from "next";
import ForceDark from "@/components/theme/ForceDark";

export const metadata: Metadata = {
  title: "Status — Plan4host",
  description: "Service status for Plan4Host.",
};

export default function StatusPage() {
  return (
    <main
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '100vh',
        padding: 16,
        background: 'var(--bg)',
      }}
    >
      <ForceDark />
      <img src="/status.png" alt="Service status" style={{ maxWidth: '100%', height: 'auto', borderRadius: 12 }} />
    </main>
  );
}
