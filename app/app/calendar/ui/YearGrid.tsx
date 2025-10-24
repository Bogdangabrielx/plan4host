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
        <div key={m} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 12, boxShadow: "0 6px 18px rgba(0,0,0,0.25)" }}>
          <button
            onClick={() => onMonthClick(m)}
            style={{
              background: "transparent",
              color: "var(--text)",
              border: "none",
              cursor: "pointer",
              fontWeight: 800,
              letterSpacing: 0.2,
              fontSize: isSmall ? 18 : 16,
              marginBottom: 8,
              textDecoration: "underline",
              textTransform: "capitalize"
            }}
          >
            {new Date(year, m, 1).toLocaleString(undefined, { month: "long" })}
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {["Mo","Tu","We","Th","Fr","Sa","Su"].map(d => (
              <div key={d} style={{ fontSize: isSmall ? 11 : 10, color: "var(--muted)", textAlign: "center", fontWeight: 700 }}>{d}</div>
            ))}
            {monthDays(year, m).map((d, idx) => {
              if (!d) return <div key={`e${idx}`} />;
              const pct = getOccupancy(d);
              return (
                <div
                  key={formatISODate(d)}
                  title={`${pct}% occupied`}
                  style={{
                    height: isSmall ? 32 : 28,
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
                      opacity: isSmall ? 0.25 : 0.35
                    
                    }}
                  />
                  <span style={{ position: "absolute", top: 3, right: 4, fontSize: isSmall ? 12 : 10, color: "var(--muted)", fontWeight: 900 }}>
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
