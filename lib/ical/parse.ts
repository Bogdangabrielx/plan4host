// lib/ical/parse.ts
export type ParsedDatePart =
  | { kind: "date"; date: string; time: null; absolute?: undefined } // YYYY-MM-DD (all-day)
  | { kind: "datetime"; date: string; time: string | null; absolute?: Date | null }; // absolute set only when Z(UTC)

export type ParsedEvent = {
  uid: string | null;
  summary: string | null;
  start: ParsedDatePart;
  end?: ParsedDatePart; // <- opțional, fără null
};

/**
 * Convert a UTC Date into the same instant; formatarea în TZ țintă o faci cu Intl.DateTimeFormat(timeZone).
 */
export function toLocalDateTime(dUtc: Date, _tz: string): Date {
  return new Date(dUtc.getTime());
}

/** RFC 5545 line folding */
function unfoldIcs(source: string): string[] {
  const raw = source.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of raw) {
    if (/^[ \t]/.test(line) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function parseProp(line: string): { name: string; params: Record<string, string>; value: string } | null {
  const idx = line.indexOf(":");
  if (idx === -1) return null;
  const left = line.slice(0, idx);
  const value = line.slice(idx + 1);
  const parts = left.split(";");
  const name = parts.shift()!.toUpperCase();
  const params: Record<string, string> = {};
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (k && v) params[k.toUpperCase()] = v;
  }
  return { name, params, value };
}

// 20250102 → YYYY-MM-DD
function yyyymmddToIso(d: string): string {
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

// 20250102T141500Z or 20250102T141500
function parseDateTimeValue(v: string): { utc: boolean; dateIso: string; time: string } {
  const utc = /Z$/.test(v);
  const core = utc ? v.slice(0, -1) : v;
  const y = core.slice(0, 4);
  const m = core.slice(4, 6);
  const d = core.slice(6, 8);
  const hh = core.slice(9, 11);
  const mm = core.slice(11, 13);
  return { utc, dateIso: `${y}-${m}-${d}`, time: `${hh}:${mm}` };
}

/** ICS → ParsedEvent[] (tolerant) */
export function parseIcsToEvents(icsText: string): ParsedEvent[] {
  const lines = unfoldIcs(icsText);
  const events: ParsedEvent[] = [];

  let inEvent = false;
  let cur: { uid?: string; summary?: string; dtstart?: any; dtend?: any } = {};

  for (const ln of lines) {
    const line = ln.trim();
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (inEvent) {
        const start = buildDatePart(cur.dtstart);
        const end = buildDatePart(cur.dtend); // poate fi undefined
        if (start) {
          events.push({
            uid: cur.uid ?? null,
            summary: cur.summary ?? null,
            start,
            end,
          });
        }
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;

    const p = parseProp(line);
    if (!p) continue;

    if (p.name === "UID") {
      cur.uid = p.value || undefined;
    } else if (p.name === "SUMMARY") {
      cur.summary = p.value || undefined;
    } else if (p.name === "DTSTART") {
      cur.dtstart = { params: p.params, value: p.value };
    } else if (p.name === "DTEND") {
      cur.dtend = { params: p.params, value: p.value };
    }
  }

  return events;
}

/** Construiește ParsedDatePart sau `undefined` (niciodată null) */
function buildDatePart(
  src: { params: Record<string, string>; value: string } | undefined
): ParsedDatePart | undefined {
  if (!src) return undefined;

  const v = src.value;
  const hasValueDate = src.params["VALUE"] === "DATE" || /^\d{8}$/.test(v);

  if (hasValueDate) {
    return {
      kind: "date",
      date: yyyymmddToIso(/^\d{8}$/.test(v) ? v : v.replace(/[^0-9]/g, "").slice(0, 8)),
      time: null,
    };
  }

  // Date-time
  if (/^\d{8}T\d{6}Z$/.test(v)) {
    const { dateIso, time } = parseDateTimeValue(v);
    const abs = new Date(v); // UTC
    return {
      kind: "datetime",
      date: dateIso,
      time,
      absolute: abs,
    };
  } else if (/^\d{8}T\d{6}$/.test(v)) {
    const { dateIso, time } = parseDateTimeValue(v);
    return {
      kind: "datetime",
      date: dateIso,
      time,
      absolute: null, // floating
    };
  }

  // necunoscut → ignorăm
  return undefined;
}