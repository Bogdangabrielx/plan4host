"use client";
import { addDays, formatISODate, startOfMonthGrid } from "./calendar-utils";

export function MonthGrid({
  year, month, from, to, totalRooms, getOccupancy, onDayClick
}: {
  year: number; month: number; from: Date; to: Date;
  totalRooms: number;
  getOccupancy: (d: Date) => number;
  onDayClick: (d: Date) => void;
}) {
  const start = startOfMonthGrid(year, month); // Monday-start grid
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(start, i));

  const inMonth = (d: Date) => d.getMonth() === month;
  const title = new Date(year, month, 1).toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <section style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
      <h2 style={{ margin: "0 0 12px 4px", fontSize: 20, fontWeight: 700, color: "var(--text)", textTransform: "capitalize" }}>
        {title}
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {["Mo","Tu","We","Th","Fr","Sa","Su"].map(d => (
          <div key={d} style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", paddingBottom: 4 }}>{d}</div>
        ))}
        {days.map((d) => {
          const pct = getOccupancy(d);
          return (
            <button
              key={formatISODate(d)}
              onClick={() => onDayClick(d)}
              title={`${pct}% occupied`}
              style={{
                height: 80,
                position: "relative",
                borderRadius: 8,
                background: inMonth(d) ? "var(--card)" : "#0b0d12",
                border: "1px solid var(--border)",
                overflow: "hidden",
                cursor: "pointer",
                color: "var(--text)"
              }}
            >
              {/* bara de ocupare — solidă, fără transparență */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${pct}%`,
                  background: "var(--primary)"
                }}
              />
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  right: 8,
                  fontSize: 12,
                  color: inMonth(d) ? "var(--muted)" : "#3a4151"
                }}
              >
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
