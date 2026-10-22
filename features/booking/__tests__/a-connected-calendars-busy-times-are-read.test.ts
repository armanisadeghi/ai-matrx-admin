/**
 * CD-PAGE-10 — a booking page connected to its owner's calendar never offers a time she is busy. Real use case: a
 * physiotherapist's Google Calendar (its private iCal address) holds a dentist visit, a weekly team meeting that skips
 * one week and moves another, an all-day conference and a "free" reminder; her booking page reads them as busy times.
 */
import { busyFromIcs } from "../ics-busy";

const ICS = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Google Inc//Google Calendar 70.9054//EN",
  "BEGIN:VEVENT",
  "UID:dentist@example.org",
  "DTSTART:20261027T170000Z",
  "DTEND:20261027T180000Z",
  "SUMMARY:Dentist",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:team@example.org",
  "DTSTART;TZID=America/Los_Angeles:20261026T090000",
  "DTEND;TZID=America/Los_Angeles:20261026T100000",
  "RRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261231T000000Z",
  "EXDATE;TZID=America/Los_Angeles:20261028T090000",
  "SUMMARY:Team meeting",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:team@example.org",
  "RECURRENCE-ID;TZID=America/Los_Angeles:20261102T090000",
  "DTSTART;TZID=America/Los_Angeles:20261102T140000",
  "DTEND;TZID=America/Los_Angeles:20261102T150000",
  "SUMMARY:Team meeting (moved)",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:conf@example.org",
  "DTSTART;VALUE=DATE:20261030",
  "DTEND;VALUE=DATE:20261031",
  "SUMMARY:Conference",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:reminder@example.org",
  "DTSTART:20261029T160000Z",
  "DTEND:20261029T163000Z",
  "TRANSP:TRANSPARENT",
  "SUMMARY:Water the plants",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:odd@example.org",
  "DTSTART:20261026T200000Z",
  "DTEND:20261026T203000Z",
  "RRULE:FREQ=MONTHLY;BYDAY=-1FR",
  "SUMMARY:Last Friday review",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

const window = { from: new Date("2026-10-26T00:00:00Z"), to: new Date("2026-11-07T00:00:00Z") };
const read = busyFromIcs(ICS, window, "America/Los_Angeles");
const has = (from: string, to: string) => read.busy.some((b) => b.from === from && b.to === to);

describe("a connected calendar's busy times are read (CD-PAGE-10)", () => {
  it("a one-off event in UTC is busy", () => {
    expect(has("2026-10-27T17:00:00.000Z", "2026-10-27T18:00:00.000Z")).toBe(true);
  });
  it("a weekly meeting at 9:00 Los Angeles stays 9:00 across the daylight-saving change", () => {
    expect(has("2026-10-26T16:00:00.000Z", "2026-10-26T17:00:00.000Z")).toBe(true); // Mon, PDT
    expect(has("2026-11-04T17:00:00.000Z", "2026-11-04T18:00:00.000Z")).toBe(true); // Wed, PST
  });
  it("a skipped week is free and a moved week is busy at its new time only", () => {
    expect(read.busy.some((b) => b.from === "2026-10-28T16:00:00.000Z")).toBe(false);
    expect(read.busy.some((b) => b.from === "2026-11-02T17:00:00.000Z")).toBe(false);
    expect(has("2026-11-02T22:00:00.000Z", "2026-11-02T23:00:00.000Z")).toBe(true);
  });
  it("an all-day event is busy for the whole day in the page's timezone", () => {
    expect(has("2026-10-30T07:00:00.000Z", "2026-10-31T07:00:00.000Z")).toBe(true);
  });
  it("an event marked free is not busy", () => {
    expect(read.busy.some((b) => b.from === "2026-10-29T16:00:00.000Z")).toBe(false);
  });
  it("a repeat rule it cannot follow keeps its first time busy and is counted, never dropped silently", () => {
    expect(has("2026-10-26T20:00:00.000Z", "2026-10-26T20:30:00.000Z")).toBe(true);
    expect(read.unread).toBe(1);
  });
});
