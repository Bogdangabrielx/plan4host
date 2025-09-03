"use client";
import { useEffect, useState } from "react";
import { formatISODate, monthDays } from "./calendar-utils";

export function YearGrid({
  year,
  from,
  to,
  totalRooms,
  getOccupancy,
  onMonthClick
}: {
  year: number;
  from: Date;
  to: Date;
  totalRooms: number;
  getOccupancy: (d: Date) => number;
  onMonthClick: (m: number) => void;
}) {
  const [isSmall, setIsSmall] = useState(false);
  useEffect(() => {
    const detect = () => setIsSmall(typeof window !== "undefined" ? window.innerWidth < 480 : false);
    detect();
    window.addEventListener("resize", detect);
    return () => window.removeEventListener("resize", detect);
  }, []);
  return (
    <section style={{ display: "grid", gridTemplateColumns: isSmall ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
      {Array.from({ length: 12 }).map((_, m) => (
        <div key={m} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 12 }}>
          <button
            onClick={() => onMonthClick(m)}
            style={{
              background: "transparent",
              color: "var(--text)",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: isSmall ? 18 : 16,
              marginBottom: 8,
              textDecoration: "underline",
              textTransform: "capitalize"
            }}
          >
            {new Date(year, m, 1).toLocaleString(undefined, { month: "long" })}
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {["Mo","Tu","We","Th","Fr","Sa","Su"].map(d => (
              <div key={d} style={{ fontSize: isSmall ? 11 : 10, color: "var(--muted)", textAlign: "center" }}>{d}</div>
            ))}
            {monthDays(year, m).map((d, idx) => {
              if (!d) return <div key={`e${idx}`} />;
              const pct = getOccupancy(d);
              return (
                <div
                  key={formatISODate(d)}
                  title={`${pct}% occupied`}
                  style={{
                    height: isSmall ? 30 : 26,
                    position: "relative",
                    borderRadius: 6,
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    overflow: "hidden"
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${pct}%`,
                      background: "var(--primary)",
                    
                    }}
                  />
                  <span style={{ position: "absolute", top: 3, right: 4, fontSize: isSmall ? 12 : 10, color: "var(--muted)", fontWeight: 800, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                    {d.getDate()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
