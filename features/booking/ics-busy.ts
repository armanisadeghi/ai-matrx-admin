// features/booking/ics-busy.ts — CD-PAGE-10: THE BUSY TIMES IN A CONNECTED CALENDAR.
//
// A booking page is connected to its owner's calendar by the calendar's private iCal address (Google Calendar,
// Outlook and Apple Calendar each give one). This reads that file into the moments the owner is busy inside the
// window the page offers, so the store never offers them (custom._booking_slots). It is pure — the text in, the
// moments out — so the same reading is tested here and used by the server.
//
// What it reads: VEVENTs with DTSTART and DTEND or DURATION, in UTC, in a named zone (IANA, or the common Outlook
// names), floating, or as all-day dates; repeating events (RRULE: DAILY, WEEKLY with BYDAY, MONTHLY by day of month,
// YEARLY; INTERVAL, COUNT, UNTIL), their EXDATEs and their moved or cancelled instances (RECURRENCE-ID). An event
// marked free (TRANSP:TRANSPARENT) or cancelled is not busy. NOTHING FAILS SILENTLY: a repeat rule it cannot read
// keeps its first time busy and is counted in `unread`, which the page's builder shows.

export interface BusyMoment {
  from: string;
  to: string;
}

export interface BusyReading {
  busy: BusyMoment[];
  /** Repeating events whose rule this reader does not follow (their first time is still counted busy). */
  unread: number;
  events: number;
}

const OUTLOOK_ZONES: Record<string, string> = {
  "Pacific Standard Time": "America/Los_Angeles",
  "Mountain Standard Time": "America/Denver",
  "US Mountain Standard Time": "America/Phoenix",
  "Central Standard Time": "America/Chicago",
  "Eastern Standard Time": "America/New_York",
  "Atlantic Standard Time": "America/Halifax",
  "Alaskan Standard Time": "America/Anchorage",
  "Hawaiian Standard Time": "Pacific/Honolulu",
  "GMT Standard Time": "Europe/London",
  "W. Europe Standard Time": "Europe/Berlin",
  "Romance Standard Time": "Europe/Paris",
  "Central Europe Standard Time": "Europe/Budapest",
  "E. Europe Standard Time": "Europe/Bucharest",
  "India Standard Time": "Asia/Kolkata",
  "China Standard Time": "Asia/Shanghai",
  "Tokyo Standard Time": "Asia/Tokyo",
  "AUS Eastern Standard Time": "Australia/Sydney",
  UTC: "UTC",
};

function zoneOf(tzid: string | undefined, fallback: string): string {
  if (!tzid) return fallback;
  const clean = tzid.replace(/^"|"$/g, "");
  const named = OUTLOOK_ZONES[clean] ?? clean;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: named });
    return named;
  } catch {
    return fallback;
  }
}

/** The zone's offset from UTC at one moment, in milliseconds. */
function offsetAt(utcMs: number, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - utcMs;
}

/** A wall-clock time in a zone, as a UTC moment (the second guess settles a daylight-saving edge). */
function wallToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, zone: string): number {
  const guess = Date.UTC(y, mo, d, h, mi, s);
  const first = guess - offsetAt(guess, zone);
  return guess - offsetAt(first, zone);
}

interface Wall { y: number; mo: number; d: number; h: number; mi: number; s: number; date: boolean; utc: boolean }

function parseWall(value: string): Wall | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  return {
    y: Number(m[1]), mo: Number(m[2]) - 1, d: Number(m[3]),
    h: Number(m[4] ?? 0), mi: Number(m[5] ?? 0), s: Number(m[6] ?? 0),
    date: m[4] === undefined, utc: m[7] === "Z",
  };
}

function wallMs(w: Wall, zone: string): number {
  return w.utc ? Date.UTC(w.y, w.mo, w.d, w.h, w.mi, w.s) : wallToUtc(w.y, w.mo, w.d, w.h, w.mi, w.s, zone);
}

function durationMs(text: string): number | null {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(text.trim());
  if (!m) return null;
  const n = (i: number) => Number(m[i] ?? 0);
  return ((n(2) * 7 + n(3)) * 86400 + n(4) * 3600 + n(5) * 60 + n(6)) * 1000;
}

interface Prop { name: string; params: Record<string, string>; value: string }

function props(block: string[]): Prop[] {
  return block.map((line) => {
    const colon = line.search(/:(?=(?:[^"]*"[^"]*")*[^"]*$)/);
    const head = colon < 0 ? line : line.slice(0, colon);
    const value = colon < 0 ? "" : line.slice(colon + 1);
    const [name, ...rest] = head.split(";");
    const params: Record<string, string> = {};
    for (const p of rest) {
      const eq = p.indexOf("=");
      if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
    }
    return { name: (name ?? "").toUpperCase(), params, value };
  });
}

const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

/** Read a calendar file's busy moments that overlap [from, to). `zone` is the booking page's own timezone. */
export function busyFromIcs(text: string, window: { from: Date; to: Date }, zone = "UTC"): BusyReading {
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const events: Prop[][] = [];
  let cur: string[] | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") cur = [];
    else if (line === "END:VEVENT") { if (cur) events.push(props(cur)); cur = null; }
    else if (cur) cur.push(line);
  }
  const lo = window.from.getTime();
  const hi = window.to.getTime();
  const out: Array<[number, number]> = [];
  let unread = 0;
  // Moved or cancelled instances of a repeating event replace that instance of the series.
  const overridden = new Map<string, Set<number>>();
  const parsed = events.map((ev) => {
    const one = (n: string) => ev.find((p) => p.name === n);
    const start = one("DTSTART");
    const rid = one("RECURRENCE-ID");
    const uid = one("UID")?.value ?? "";
    if (rid) {
      const w = parseWall(rid.value);
      if (w) {
        const set = overridden.get(uid) ?? new Set<number>();
        set.add(wallMs(w, zoneOf(rid.params.TZID, zone)));
        overridden.set(uid, set);
      }
    }
    return { ev, one, start, uid, rid };
  });
  for (const { ev, one, start, uid, rid } of parsed) {
    if (!start) continue;
    if ((one("STATUS")?.value ?? "").toUpperCase() === "CANCELLED") continue;
    if ((one("TRANSP")?.value ?? "").toUpperCase() === "TRANSPARENT") continue;
    const ezone = zoneOf(start.params.TZID, zone);
    const sw = parseWall(start.value);
    if (!sw) continue;
    const end = one("DTEND");
    const ew = end ? parseWall(end.value) : null;
    const startMs = wallMs(sw, ezone);
    let len: number;
    if (ew) len = wallMs(ew, zoneOf(end?.params.TZID, ezone)) - startMs;
    else if (one("DURATION")) len = durationMs(one("DURATION")!.value) ?? 0;
    else len = sw.date ? 86400000 : 0;
    if (len <= 0) continue;
    const exdates = new Set<number>();
    for (const p of ev.filter((x) => x.name === "EXDATE")) {
      for (const v of p.value.split(",")) {
        const w = parseWall(v);
        if (w) exdates.add(wallMs(w, zoneOf(p.params.TZID, ezone)));
      }
    }
    for (const t of overridden.get(uid) ?? []) if (!rid) exdates.add(t);
    const push = (s: number) => {
      if (exdates.has(s)) return;
      if (s < hi && s + len > lo) out.push([s, s + len]);
    };
    const rule = one("RRULE");
    if (!rule || rid) {
      push(startMs);
      continue;
    }
    const r = Object.fromEntries(rule.value.split(";").map((kv) => { const [k, v] = kv.split("="); return [(k ?? "").toUpperCase(), v ?? ""]; }));
    const freq = r.FREQ;
    const every = Math.max(1, Number(r.INTERVAL ?? 1) || 1);
    const count = r.COUNT ? Number(r.COUNT) : Infinity;
    const untilW = r.UNTIL ? parseWall(r.UNTIL) : null;
    const until = untilW ? wallMs(untilW, ezone) : Infinity;
    const known = new Set(["FREQ", "INTERVAL", "COUNT", "UNTIL", "BYDAY", "WKST", "BYMONTHDAY", "BYMONTH"]);
    const byday = r.BYDAY ? r.BYDAY.split(",") : null;
    const plainDays = byday?.every((d) => DAYS.includes(d)) ?? true;
    if (!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq ?? "") || Object.keys(r).some((k) => !known.has(k))
        || (byday && (freq !== "WEEKLY" || !plainDays)) || (r.BYMONTHDAY && freq !== "MONTHLY") || (r.BYMONTH && freq !== "YEARLY")) {
      unread++;
      push(startMs);
      continue;
    }
    // Walk the series in the event's own wall clock, so a weekly 9:00 stays 9:00 across a daylight-saving change.
    let made = 0;
    const wantDays = byday ? new Set(byday.map((d) => DAYS.indexOf(d))) : null;
    for (let step = 0; step < 5000 && made < count; step++) {
      const base = new Date(Date.UTC(sw.y, sw.mo, sw.d));
      const days: Date[] = [];
      if (freq === "DAILY") days.push(new Date(base.getTime() + step * every * 86400000));
      else if (freq === "WEEKLY") {
        const weekStart = new Date(base.getTime() + step * every * 7 * 86400000 - base.getUTCDay() * 86400000);
        for (let i = 0; i < 7; i++) {
          const day = new Date(weekStart.getTime() + i * 86400000);
          if (day.getTime() < base.getTime()) continue;
          if (wantDays ? wantDays.has(day.getUTCDay()) : day.getUTCDay() === base.getUTCDay()) days.push(day);
        }
      } else if (freq === "MONTHLY") {
        const dom = r.BYMONTHDAY ? Number(r.BYMONTHDAY) : sw.d;
        const day = new Date(Date.UTC(sw.y, sw.mo + step * every, dom));
        if (day.getUTCDate() === dom) days.push(day);
      } else {
        const day = new Date(Date.UTC(sw.y + step * every, r.BYMONTH ? Number(r.BYMONTH) - 1 : sw.mo, sw.d));
        if (day.getUTCDate() === sw.d) days.push(day);
      }
      let past = false;
      for (const day of days) {
        if (made >= count) break;
        const s = sw.utc
          ? Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), sw.h, sw.mi, sw.s)
          : wallToUtc(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), sw.h, sw.mi, sw.s, ezone);
        if (s > until || s >= hi) { past = true; break; }
        made++;
        push(s);
      }
      if (past) break;
    }
  }
  out.sort((a, b) => a[0] - b[0]);
  // Overlapping moments are one busy stretch.
  const merged: Array<[number, number]> = [];
  for (const m of out) {
    const last = merged[merged.length - 1];
    if (last && m[0] <= last[1]) last[1] = Math.max(last[1], m[1]);
    else merged.push([m[0], m[1]]);
  }
  return {
    busy: merged.slice(0, 2000).map(([a, b]) => ({ from: new Date(a).toISOString(), to: new Date(b).toISOString() })),
    unread,
    events: events.length,
  };
}
