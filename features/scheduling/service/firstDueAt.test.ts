import { firstDueAt } from "./queries";

describe("a scheduled session on a computer: its first time", () => {
  const now = new Date("2026-10-14T12:00:00Z");
  it("every N, a cron, or once", () => {
    expect(firstDueAt({ type: "interval", every_seconds: 3600 }, now)).toBe("2026-10-14T13:00:00.000Z");
    expect(firstDueAt({ type: "cron", expression: "0 9 * * *", tz: "UTC" }, now)).toBe("2026-10-15T09:00:00.000Z");
    expect(firstDueAt({ type: "one-shot", at: "2026-10-20T08:00:00Z" }, now)).toBe("2026-10-20T08:00:00.000Z");
  });
});
