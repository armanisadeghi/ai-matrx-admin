/**
 * An `event` kind value becomes ONE calendar entry for the platform's `.ics` builder
 * (`lib/calendar/eventLinks`). A start with a clock time keeps its instant; a date-only start
 * ("2026-11-12", "November 12, 2026") is 9:00 local that day, the same rule the timeline uses.
 * A start that names no real day yields `null`: the block says so instead of guessing.
 */
import { DEFAULT_EVENT_MINUTES, type CalendarEvent } from "@/lib/calendar/eventLinks";
import type { PartialKindPayload } from "@/features/content-ir/kinds/kind-payload";
import { calendarDayOf } from "../timeline/timeline-calendar";

/** The mid-stream view of the registered `event` kind: THE generated type, never a twin. */
export type EventValue = PartialKindPayload<"event">;

const HAS_CLOCK = /\d{1,2}:\d{2}/;

function instantOf(text: string | undefined): Date | null {
  const s = (text ?? "").trim();
  if (!s) return null;
  if (HAS_CLOCK.test(s)) {
    const parsed = new Date(s);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const day = calendarDayOf(s);
  return day ? new Date(day.y, day.m - 1, day.d, 9, 0, 0) : null;
}

export function eventToCalendar(value: EventValue): CalendarEvent | null {
  const title = (value.title ?? "").trim();
  const start = instantOf(value.start);
  if (!title || !start) return null;
  const given = instantOf(value.end);
  const end =
    given && given.getTime() > start.getTime()
      ? given
      : new Date(start.getTime() + DEFAULT_EVENT_MINUTES * 60_000);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "event";
  const location = (value.location ?? "").trim();
  const description = (value.description ?? "").trim();
  const url = (value.url ?? "").trim();
  return {
    uid: `${slug}-${start.getTime()}@aimatrx.com`,
    title,
    start: start.toISOString(),
    end: end.toISOString(),
    ...(description ? { description } : {}),
    ...(location ? { location } : {}),
    ...(/^https?:\/\//i.test(url) ? { url } : {}),
  };
}

/** Plain-text form for Copy: one line per fact that is present. */
export function eventText(value: EventValue): string {
  return [
    value.title,
    value.start ? `When: ${value.start}${value.end ? ` to ${value.end}` : ""}` : "",
    value.location ? `Where: ${value.location}` : "",
    value.description,
    value.url,
  ]
    .filter((line) => typeof line === "string" && line.trim() !== "")
    .join("\n");
}
