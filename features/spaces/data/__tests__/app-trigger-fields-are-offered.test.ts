/** A connected-app trigger hands each run its item as {{trigger.body.<key>}}; the editor's value menu must offer exactly
 *  those keys (today's miss: a person typed trigger.body.summary and got nothing; the real key is title). */
import { APP_TRIGGER_FIELDS, triggerSources } from "../AutomationSteps";

const env = (on: string) => ({ tableId: "t", fields: [{ key: "name", label: "Name" }], tables: [], trigger: { on } }) as never;

describe("connected-app trigger fields in the value menu", () => {
  it("offers the calendar event's real keys, not the table's columns", () => {
    const tokens = (triggerSources(env("calendar_event")) as Array<{ token: string }>).map((s) => s.token);
    expect(tokens).toEqual(["title", "starts_at", "ends_at", "location", "description", "organizer", "attendees", "link"].map((k) => `{{trigger.body.${k}}}`));
    expect(tokens).not.toContain("{{trigger.body.summary}}");
    expect(tokens.some((t) => t.includes("trigger.name"))).toBe(false);
  });
  it("offers fields for every other app trigger", () => {
    for (const on of ["gmail_received", "outlook_received", "slack_message"]) {
      const list = triggerSources(env(on)) as Array<{ token: string }>;
      expect(list.length).toBe(APP_TRIGGER_FIELDS[on]!.length);
      expect(list.length).toBeGreaterThan(2);
    }
  });
});
