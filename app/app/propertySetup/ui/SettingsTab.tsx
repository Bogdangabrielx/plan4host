"use client";

type Property = {
  id: string;
  name: string;
  check_in_time: string | null;
  check_out_time: string | null;
};

import { useEffect, useState } from "react";

export default function SettingsTab({
  property,
  onChange,
}: {
  property: Property;
  onChange: (key: "check_in_time" | "check_out_time", value: string) => void;
}) {
  const [ci, setCi] = useState<string>(property.check_in_time || "");
  const [co, setCo] = useState<string>(property.check_out_time || "");

  // Re-sincronizează când se schimbă proprietatea sau valorile din upstream
  useEffect(() => {
    setCi(property.check_in_time || "");
    setCo(property.check_out_time || "");
  }, [property.id, property.check_in_time, property.check_out_time]);

  const isValid = (v: string) => /^\d{2}:\d{2}$/.test(v.trim());

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <label style={{ fontWeight: 600 }}>Property check-in (HH:MM)</label>
        <input
          type="time"
          value={ci}
          onChange={(e) => setCi((e.target as HTMLInputElement).value)}
          onBlur={() => { if (isValid(ci)) onChange("check_in_time", ci.trim()); }}
          placeholder="14:00"
          style={inputStyle}
        />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label style={{ fontWeight: 600 }}>Property check-out (HH:MM)</label>
        <input
          type="time"
          value={co}
          onChange={(e) => setCo((e.target as HTMLInputElement).value)}
          onBlur={() => { if (isValid(co)) onChange("check_out_time", co.trim()); }}
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
  borderRadius: 8,
  fontFamily: 'inherit'
};
