import { calendarDayOf, timelineCalendarEvents, timelineIcs } from "./timeline-calendar";
import type { TimelineData } from "./parseTimelineMarkdown";

const timeline = {
  title: "Product launch",
  description: "",
  periods: [
    {
      period: "Phase 1",
      events: [
        { id: "e1", title: "Kickoff", date: "March 5, 2026", description: "Team call", category: "meeting" },
        { id: "e2", title: "Beta", date: "Q2 2026", description: "" },
        { id: "e3", title: "Ship", date: "2026-06-30", description: "Go live" },
        { id: "e4", title: "Retro", date: "TBD", description: "" },
      ],
    },
  ],
} as unknown as TimelineData;

describe("a timeline in an answer becomes calendar entries", () => {
  it("reads only dates that name exactly one real day", () => {
    expect(calendarDayOf("March 5, 2026")).toEqual({ y: 2026, m: 3, d: 5 });
    expect(calendarDayOf("5th Mar 2026")).toEqual({ y: 2026, m: 3, d: 5 });
    expect(calendarDayOf("2026-06-30")).toEqual({ y: 2026, m: 6, d: 30 });
    expect(calendarDayOf("3/5/2026")).toEqual({ y: 2026, m: 3, d: 5 });
    for (const vague of ["Q1 2026", "March 2026", "Week 3", "TBD", "", "Feb 30, 2026", "2026-13-01"]) {
      expect(calendarDayOf(vague)).toBeNull();
    }
  });

  it("keeps the dated events, counts the vague ones, and never guesses", () => {
    const { events, skipped } = timelineCalendarEvents(timeline);
    expect(events.map((e) => e.title)).toEqual(["Kickoff", "Ship"]);
    expect(skipped).toBe(2);
    expect(events[0].description).toContain("Team call");
    expect(new Date(events[0].end).getTime()).toBeGreaterThan(new Date(events[0].start).getTime());
  });

  it("writes one importable calendar file with one entry per event", () => {
    const { events } = timelineCalendarEvents(timeline);
    const ics = timelineIcs(events, new Date("2026-01-01T00:00:00Z"));
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics.match(/BEGIN:VCALENDAR/g)).toHaveLength(1);
    expect(ics).toContain("SUMMARY:Kickoff");
    expect(ics).toContain("SUMMARY:Ship");
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });
});
