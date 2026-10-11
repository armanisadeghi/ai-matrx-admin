/**
 * A timeline in an AI answer becomes real calendar entries: every event whose date is an actual
 * day ("2026-03-05", "March 5, 2026", "5 March 2026", "3/5/2026") is written into ONE `.ics` file
 * that Apple Calendar, Google Calendar and Outlook import. Vague dates ("Q1 2026", "Week 3",
 * "TBD") are NOT guessed — they are counted so the menu can say how many were left out.
 *
 * The event format is the platform's one builder (`lib/calendar/eventLinks`), not a second one.
 */
import {
  DEFAULT_EVENT_MINUTES,
  icsContent,
  icsFileName,
  type CalendarEvent,
} from "@/lib/calendar/eventLinks";
import type { TimelineData } from "./parseTimelineMarkdown";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_WORD = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";

/** The calendar day a free-text date names, or null when it does not name exactly one day. */
export function calendarDayOf(text: string): { y: number; m: number; d: number } | null {
  const s = text.trim();
  let y: number, m: number, d: number;
  let hit: RegExpMatchArray | null;
  if ((hit = s.match(/^(\d{4})-(\d{2})-(\d{2})(?!\d)/))) {
    [y, m, d] = [Number(hit[1]), Number(hit[2]), Number(hit[3])];
  } else if ((hit = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
    [y, m, d] = [Number(hit[3]), Number(hit[1]), Number(hit[2])];
  } else if ((hit = s.match(new RegExp(`\\b${MONTH_WORD}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, "i")))) {
    [y, m, d] = [Number(hit[3]), MONTHS.indexOf(hit[1].toLowerCase()) + 1, Number(hit[2])];
  } else if ((hit = s.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_WORD},?\\s+(\\d{4})\\b`, "i")))) {
    [y, m, d] = [Number(hit[3]), MONTHS.indexOf(hit[2].toLowerCase()) + 1, Number(hit[1])];
  } else {
    return null;
  }
  const real = new Date(y, m - 1, d);
  if (real.getFullYear() !== y || real.getMonth() !== m - 1 || real.getDate() !== d) return null;
  return { y, m, d };
}

export interface TimelineCalendar {
  events: CalendarEvent[];
  /** Events whose date names no single day, so they are not on the calendar. */
  skipped: number;
}

export function timelineCalendarEvents(timeline: TimelineData): TimelineCalendar {
  const events: CalendarEvent[] = [];
  let skipped = 0;
  const slug = icsFileName(timeline.title).replace(/\.ics$/, "");
  for (const period of timeline.periods) {
    for (const event of period.events) {
      const day = calendarDayOf(event.date ?? "");
      if (!day) {
        skipped += 1;
        continue;
      }
      // 9:00 local on that day: a real instant, so the entry means the same moment everywhere.
      const start = new Date(day.y, day.m - 1, day.d, 9, 0, 0);
      const end = new Date(start.getTime() + DEFAULT_EVENT_MINUTES * 60_000);
      const detail = [event.description, period.period ? `Phase: ${period.period}` : "", event.category ? `Category: ${event.category}` : ""]
        .filter((part) => part && String(part).trim() !== "")
        .join("\n");
      events.push({
        uid: `${slug}-${event.id}@aimatrx.com`,
        title: event.title,
        start: start.toISOString(),
        end: end.toISOString(),
        ...(detail ? { description: detail } : {}),
      });
    }
  }
  return { events, skipped };
}

/** ONE calendar file holding every event (each event is the platform builder's own VEVENT). */
export function timelineIcs(events: CalendarEvent[], now: Date = new Date()): string {
  const bodies = events.map((event) => {
    const one = icsContent(event, now);
    const from = one.indexOf("BEGIN:VEVENT");
    const to = one.indexOf("END:VEVENT") + "END:VEVENT".length;
    return one.slice(from, to);
  });
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AI Matrx//Timeline//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...bodies,
    "END:VCALENDAR",
  ].join("\r\n") + "\r\n";
}
