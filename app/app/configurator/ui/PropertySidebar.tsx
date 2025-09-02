"use client";

type Property = { id: string; name: string };

export default function PropertySidebar({
  properties,
  selectedId,
  onSelect,
  status
}: {
  properties: Property[];
  selectedId: string;
  onSelect: (id: string) => void;
  status: "Idle" | "Saving…" | "Synced" | "Error";
}) {
  return (
    <aside
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 12,
        height: "fit-content"
      }}
    >
      {/* status pill */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span
          style={{
            fontSize: 12,
            padding: "4px 8px",
            borderRadius: 999,
            background:
              status === "Error" ? "var(--danger)" : status === "Saving…" ? "var(--primary)" : "#2a2f3a",
            color: status === "Saving…" ? "#0c111b" : "white"
          }}
        >
          {status}
        </span>
        <strong>Properties</strong>
      </div>

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 6 }}>
        {properties.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => onSelect(p.id)}
              style={{
                width: "100%",
                textAlign: "center",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: selectedId === p.id ? "var(--primary)" : "var(--card)",
                color: selectedId === p.id ? "#0c111b" : "var(--text)",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              {p.name}
            </button>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
        You can add properties from <a href="/app" style={{ color: "var(--primary)" }}>Dashboard</a>.
      </div>
    </aside>
  );
}
