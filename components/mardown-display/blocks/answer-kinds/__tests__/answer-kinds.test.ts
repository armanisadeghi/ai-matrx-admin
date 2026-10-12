import { icsContent } from "@/lib/calendar/eventLinks";
import { parseContactSelection, looksLikeContact } from "@/features/crm/agent-context/parseContactSelection";
import { eventToCalendar } from "../event-calendar";
import { contactText } from "../answer-kind-blocks";

describe("event kind to calendar", () => {
  it("keeps the instant of a timed start and writes a real VEVENT", () => {
    const event = eventToCalendar({
      title: "Q4 planning review",
      start: "2026-11-12T10:00:00-08:00",
      end: "2026-11-12T11:30:00-08:00",
      location: "Oakland",
    });
    expect(event?.start).toBe("2026-11-12T18:00:00.000Z");
    expect(event?.end).toBe("2026-11-12T19:30:00.000Z");
    const ics = icsContent(event!);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:Q4 planning review");
    expect(ics).toContain("DTSTART:20261112T180000Z");
  });

  it("a date-only start is 9:00 local that day; a vague start is refused, never guessed", () => {
    const dated = eventToCalendar({ title: "Launch", start: "2026-03-05" });
    expect(new Date(dated!.start).getHours()).toBe(9);
    expect(eventToCalendar({ title: "Launch", start: "Q1 2026" })).toBeNull();
    expect(eventToCalendar({ title: "", start: "2026-03-05" })).toBeNull();
  });

  it("an end before the start falls back to the default length", () => {
    const event = eventToCalendar({ title: "Call", start: "2026-11-12T10:00:00Z", end: "2026-11-12T09:00:00Z" });
    expect(new Date(event!.end).getTime()).toBeGreaterThan(new Date(event!.start).getTime());
  });
});

describe("contact kind to the save dialog", () => {
  it("the text handed to the dialog parses back to the same person", () => {
    const asText = contactText({
      name: "Dana Whitfield",
      title: "Director of Partnerships",
      organization: "Harborview Logistics",
      email: "dana.whitfield@harborviewlogistics.com",
      phone: "+1 415 555 0142",
    });
    expect(looksLikeContact(asText)).toBe(true);
    const parsed = parseContactSelection(asText);
    expect(parsed.name).toBe("Dana Whitfield");
    expect(parsed.email).toBe("dana.whitfield@harborviewlogistics.com");
    expect(parsed.headline).toBe("Director of Partnerships");
  });
});
