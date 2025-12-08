"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

type DayCell = {
  date: Date;
  ymd: string;
  inMonth: boolean;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addMonths(base: Date, delta: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + delta);
  return d;
}

function buildMonthGrid(year: number, monthIndex: number): DayCell[] {
  const first = new Date(year, monthIndex, 1);
  const firstWeekday = (first.getDay() + 6) % 7; // Mon=0..Sun=6
  const daysInThisMonth = new Date(year, monthIndex + 1, 0).getDate();
  const prevMonthDays = firstWeekday;

  const grid: DayCell[] = [];
  // previous month tail
  if (prevMonthDays > 0) {
    const prevMonthDate = new Date(year, monthIndex, 0);
    const prevDaysInMonth = prevMonthDate.getDate();
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const d = new Date(year, monthIndex - 1, prevDaysInMonth - i);
      grid.push({ date: d, ymd: ymd(d), inMonth: false });
    }
  }
  // current month
  for (let day = 1; day <= daysInThisMonth; day++) {
    const d = new Date(year, monthIndex, day);
    grid.push({ date: d, ymd: ymd(d), inMonth: true });
  }
  // next month head to fill full weeks (6 weeks grid max)
  while (grid.length % 7 !== 0 || grid.length < 42) {
    const last = grid[grid.length - 1]?.date ?? new Date(year, monthIndex, daysInThisMonth);
    const d = new Date(last);
    d.setDate(d.getDate() + 1);
    grid.push({ date: d, ymd: ymd(d), inMonth: false });
    if (grid.length >= 42) break;
  }
  return grid;
}

function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isBetweenInclusive(target: Date, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false;
  const t = target.getTime();
  const s = start.getTime();
  const e = end.getTime();
  if (s <= e) return t >= s && t <= e;
  return t >= e && t <= s;
}

export default function BookingClient() {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [monthAnchor, setMonthAnchor] = useState<Date>(today);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [guests, setGuests] = useState<number>(2);

  const leftYear = monthAnchor.getFullYear();
  const leftMonth = monthAnchor.getMonth();
  const right = addMonths(monthAnchor, 1);
  const rightYear = right.getFullYear();
  const rightMonth = right.getMonth();

  const leftGrid = useMemo(() => buildMonthGrid(leftYear, leftMonth), [leftYear, leftMonth]);
  const rightGrid = useMemo(() => buildMonthGrid(rightYear, rightMonth), [rightYear, rightMonth]);

  const handleDayClick = (day: Date) => {
    // prevent selecting check-in in the past
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    if (d < today) return;

    if (!startDate || (startDate && endDate)) {
      setStartDate(d);
      setEndDate(null);
      return;
    }
    if (startDate && !endDate) {
      if (d.getTime() === startDate.getTime()) {
        // same day → single night stay
        setEndDate(d);
      } else if (d > startDate) {
        setEndDate(d);
      } else {
        // clicked before start → reset
        setStartDate(d);
        setEndDate(null);
      }
    }
  };

  const nights = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const a = startDate.getTime();
    const b = endDate.getTime();
    const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [startDate, endDate]);

  const pricePerNight = 90;
  const total = nights * pricePerNight;

  const monthFormatter = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });
  const weekdayShort = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const disabledRequest = !startDate || !endDate || nights <= 0;

  return (
    <div
      style={{
        width: "min(1100px, 100%)",
        borderRadius: 24,
        border: "1px solid var(--border)",
        background: "var(--card)",
        boxShadow: "0 22px 60px rgba(15,23,42,0.65)",
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
      }}
    >
      {/* Left column: hero + property info */}
      <div
        style={{
          position: "relative",
          minHeight: 340,
          background: "var(--bg)",
          display: "grid",
          gridTemplateRows: "auto 1fr",
        }}
      >
        <div
          style={{
            padding: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Image
              src="/Logo_Landing_AI.png"
              alt="Plan4Host"
              width={40}
              height={40}
              style={{ borderRadius: 12, objectFit: "cover" }}
            />
            <div style={{ display: "grid", gap: 2 }}>
              <span style={{ fontSize: 13, color: "var(--text)" }}>Preview</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Public booking page</span>
            </div>
          </div>
          <div
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background:
                "linear-gradient(135deg, #f59e0b, #f97316, #eab308)",
              border: "1px solid rgba(248,250,252,0.08)",
              boxShadow: "0 10px 25px rgba(15,23,42,0.8)",
              fontSize: 11,
              fontWeight: 700,
              color: "#0b1120",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "rgba(15,23,42,0.9)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
              }}
            >
              ✦
            </span>
            Demo booking experience
          </div>
        </div>

        <div
          style={{
            padding: 16,
            paddingTop: 0,
            display: "grid",
            gap: 14,
          }}
        >
          <div
            style={{
              borderRadius: 22,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <Image
              src="/IMG_7362.JPG"
              alt="Property hero"
              width={900}
              height={520}
              style={{ width: "100%", height: "auto", display: "block" }}
              priority
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, rgba(15,23,42,0.85), transparent 55%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 18,
                right: 18,
                bottom: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                gap: 12,
                color: "#f9fafb",
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>BOA A‑frame House</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>
                  Brașov, Romania • Entire unit • up to 4 guests
                </div>
                <div style={{ display: "flex", gap: 8, fontSize: 12 }}>
                  <span>⭐ 4.9 (38 reviews)</span>
                  <span>·</span>
                  <span>Hosted with Plan4Host</span>
                </div>
              </div>
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background:
                    "linear-gradient(135deg, rgba(250,204,21,0.9), rgba(249,115,22,0.95))",
                  color: "#0b1120",
                  fontSize: 11,
                  fontWeight: 700,
                  boxShadow: "0 10px 26px rgba(15,23,42,0.85)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span aria-hidden>★</span>
                Guests book directly with you
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              padding: 10,
              borderRadius: 18,
              border: "1px solid rgba(148,163,184,0.6)",
              background:
                "radial-gradient(circle at top left, rgba(250,204,21,0.09), transparent 60%), radial-gradient(circle at bottom right, rgba(249,115,22,0.12), transparent 55%), var(--panel)",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600 }}>What guests see</div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text)" }}>
              In the real version, this page would sit on a subdomain like{" "}
              <code style={{ fontSize: 12 }}>boaa-frame.plan4host.com</code> and show live availability,
              prices and your booking rules. For now, this is only a design preview.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 6,
                fontSize: 11,
                color: "var(--text)",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.6)",
                  background: "rgba(15,23,42,0.45)",
                }}
              >
                <Image
                  src="/room_forlight.png"
                  alt=""
                  width={18}
                  height={18}
                  style={{ borderRadius: 6, objectFit: "cover" }}
                />
                <span>Entire A‑frame, 1 bedroom</span>
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.6)",
                  background: "rgba(15,23,42,0.45)",
                }}
              >
                <Image
                  src="/gps.png"
                  alt=""
                  width={18}
                  height={18}
                  style={{ borderRadius: 6, objectFit: "cover" }}
                />
                <span>5 min from Brașov city center</span>
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.6)",
                  background: "rgba(15,23,42,0.45)",
                }}
              >
                <Image
                  src="/guest_forlight.png"
                  alt=""
                  width={18}
                  height={18}
                  style={{ borderRadius: 6, objectFit: "cover" }}
                />
                <span>Fast Wi‑Fi, perfect for work</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right column: calendar + booking summary */}
      <div
        style={{
          padding: 18,
          borderLeft: "1px solid var(--border)",
          background: "var(--panel)",
          display: "grid",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "grid", gap: 2 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Select your dates</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Tap on the calendar to pick check‑in and check‑out. This is only a UI demo – no real booking is created.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setMonthAnchor((prev) => addMonths(prev, -1))}
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--card)",
                cursor: "pointer",
              }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setMonthAnchor((prev) => addMonths(prev, 1))}
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--card)",
                cursor: "pointer",
              }}
            >
              ›
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          {[{ year: leftYear, month: leftMonth, grid: leftGrid }, { year: rightYear, month: rightMonth, grid: rightGrid }].map(
            ({ year, month, grid }, idx) => (
              <div
                key={idx}
                style={{
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  padding: 10,
                  display: "grid",
                  gap: 6,
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    {monthFormatter.format(new Date(year, month, 1))}
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: 2,
                    textAlign: "center",
                    color: "var(--muted)",
                  }}
                >
                  {weekdayShort.map((d) => (
                    <div key={d} style={{ padding: "2px 0", fontSize: 11 }}>
                      {d}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: 1,
                    textAlign: "center",
                  }}
                >
                  {grid.map((cell) => {
                    const inThisMonth = cell.inMonth;
                    const isStart = startDate && isSameDay(cell.date, startDate);
                    const isEnd = endDate && isSameDay(cell.date, endDate);
                    const inRange = isBetweenInclusive(cell.date, startDate, endDate);
                    const isPast = cell.date < today;

                    const isInSelection = inThisMonth && !!(isStart || isEnd || inRange);

                    // One unified color for the whole pill (start, middle, end)
                    const bg = isInSelection
                      ? "linear-gradient(135deg, #fbbf24, #f97316)"
                      : "transparent";
                    const color = isInSelection
                      ? "#0b1120"
                      : !inThisMonth
                        ? "transparent"
                        : isPast
                          ? "var(--muted)"
                          : "var(--text)";
                    const border = isInSelection
                      ? "1px solid rgba(251,191,36,0.9)"
                      : "1px solid transparent";

                    let borderRadius: string | number = 8;
                    if (isInSelection) {
                      // Full pill if only start or only end selected
                      if (!startDate || !endDate || isSameDay(startDate, endDate)) {
                        borderRadius = 999;
                      } else if (isStart && !isEnd) {
                        borderRadius = "999px 0 0 999px";
                      } else if (isEnd && !isStart) {
                        borderRadius = "0 999px 999px 0";
                      } else {
                        // Middle cells: straight edges
                        borderRadius = 0;
                      }
                    }

                    return (
                      <button
                        key={cell.ymd}
                        type="button"
                        onClick={() => {
                          if (!inThisMonth) return;
                          handleDayClick(cell.date);
                        }}
                        disabled={isPast || !inThisMonth}
                        style={{
                          height: 30,
                          borderRadius,
                          border,
                          fontSize: 12,
                          background: bg,
                          color,
                          opacity: isPast ? 0.4 : 1,
                          cursor: isPast ? "not-allowed" : "pointer",
                        }}
                      >
                        {inThisMonth ? cell.date.getDate() : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>

        <div
          style={{
            display: "grid",
            gap: 10,
            padding: 10,
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--card)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <div style={{ display: "grid", gap: 4 }}>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>Check‑in</span>
              <span style={{ fontWeight: 600 }}>
                {startDate ? ymd(startDate) : "Select date"}
              </span>
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>Check‑out</span>
              <span style={{ fontWeight: 600 }}>
                {endDate ? ymd(endDate) : "Select date"}
              </span>
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>Guests</span>
              <select
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value) || 1)}
                style={{
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  padding: "4px 8px",
                  fontSize: 12,
                  background: "var(--panel)",
                  color: "var(--text)",
                }}
              >
                {[1, 2, 3, 4, 5, 6].map((g) => (
                  <option key={g} value={g}>
                    {g} {g === 1 ? "guest" : "guests"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={disabledRequest}
            style={{
              marginTop: 4,
              width: "100%",
              borderRadius: 999,
              border: "1px solid var(--border)",
              padding: "9px 12px",
              fontSize: 14,
              fontWeight: 700,
              cursor: disabledRequest ? "not-allowed" : "pointer",
              background: disabledRequest ? "var(--panel)" : "var(--text)",
              color: disabledRequest ? "var(--muted)" : "var(--bg)",
              boxShadow: disabledRequest ? "none" : "0 12px 30px rgba(15,23,42,0.65)",
              transition: "transform 0.08s ease-out, box-shadow 0.08s ease-out",
            }}
            onMouseDown={(e) => {
              if (disabledRequest) return;
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(1px)";
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            }}
          >
            Send booking request (demo)
          </button>

          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            {nights > 0 ? (
              <>
                <div>
                  {nights} night{nights > 1 ? "s" : ""} × {pricePerNight} EUR ={" "}
                  <strong>{total} EUR</strong>
                </div>
                <div>
                  In a real flow, the guest would send a booking request and pay directly to the host
                  (bank transfer or other method you define).
                </div>
              </>
            ) : (
              <div>Select dates to preview the estimated total for the stay.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
