"use client";
import { useEffect, useState } from "react";
import { addDays, formatISODate, startOfMonthGrid } from "./calendar-utils";

export function MonthGrid({
  year, month, from, to, totalRooms, getOccupancy, onDayClick
}: {
  year: number; month: number; from: Date; to: Date;
  totalRooms: number;
  getOccupancy: (d: Date) => number;
  onDayClick: (d: Date) => void;
}) {
  const [isSmall, setIsSmall] = useState(false);
  useEffect(() => {
    const detect = () => setIsSmall(typeof window !== "undefined" ? window.innerWidth < 480 : false);
    detect();
    window.addEventListener("resize", detect);
    return () => window.removeEventListener("resize", detect);
  }, []);
  const start = startOfMonthGrid(year, month); // Monday-start grid
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(start, i));

  const inMonth = (d: Date) => d.getMonth() === month;
  const isWeekend = (d: Date) => { const w = d.getDay(); return w === 0 || w === 6; };
  const isSameDate = (a: Date, b: Date) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  const today = new Date();
  const title = new Date(year, month, 1).toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <section style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
      <h2 style={{ margin: "0 0 12px 4px", fontSize: 20, fontWeight: 700, color: "var(--text)", textTransform: "capitalize" }}>
        {title}
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {["Mo","Tu","We","Th","Fr","Sa","Su"].map(d => (
          <div key={d} style={{ fontSize: isSmall ? 11 : 12, color: "var(--muted)", textAlign: "center", paddingBottom: 6, fontWeight: 700 }}>{d}</div>
        ))}
        {days.map((d) => {
          const pct = getOccupancy(d);
          const weekend = isWeekend(d);
          const todayFlag = isSameDate(d, today);
          return (
            <button
              key={formatISODate(d)}
              onClick={() => onDayClick(d)}
              title={`${pct}% occupied`}
              style={{
                height: isSmall ? 66 : 88,
                position: "relative",
                borderRadius: 8,
                background: inMonth(d) ? "var(--card)" : "#0b0d12",
                border: todayFlag ? "2px solid var(--primary)" : "1px solid var(--border)",
                overflow: "hidden",
                cursor: "pointer",
                color: "var(--text)",
                boxShadow: todayFlag ? "0 0 0 3px rgba(96,165,250,0.25)" : "none",
                transition: "border-color .15s ease, box-shadow .15s ease, transform .05s ease",
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {/* weekend tint */}
              {weekend && inMonth(d) && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(96,165,250,0.06)" }} />
              )}

              {/* bara de ocupare */}
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
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  right: 10,
                  fontSize: isSmall ? 15 : 13,
                  fontWeight: 900,
                  color: inMonth(d) ? "var(--muted)" : "#3a4151",
                  textShadow: "0 1px 2px rgba(0,0,0,0.55)"
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
