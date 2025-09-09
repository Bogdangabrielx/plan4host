"use client";

type Property = {
  id: string;
  name: string;
  check_in_time: string | null;
  check_out_time: string | null;
};

export default function SettingsTab({
  property,
  onChange
}: {
  property: Property;
  onChange: (key: "check_in_time" | "check_out_time", value: string) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <label style={{ fontWeight: 600 }}>Default check-in (HH:MM)</label>
        <input
          type="time"
          value={property.check_in_time || ""}
          onChange={(e) => onChange("check_in_time", e.target.value)}
          placeholder="14:00"
          style={inputStyle}
        />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label style={{ fontWeight: 600 }}>Default check-out (HH:MM)</label>
        <input
          type="time"
          value={property.check_out_time || ""}
          onChange={(e) => onChange("check_out_time", e.target.value)}
          placeholder="11:00"
          style={inputStyle}
        />
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 10,
  background: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8
};
