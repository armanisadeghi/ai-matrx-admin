/**
 * CD-PAGE-10 — a booking page connected to its owner's calendar never offers a time she is busy. The store keeps the
 * calendar's private address and the busy list (custom.booking_busy_due / custom.booking_busy_set, server lane only);
 * this is the server half that reads the calendar when the store says it is due and writes what it found — or, when
 * the calendar cannot be read, says why and keeps the last good list (the store's rule for a non-null problem).
 */
jest.mock("server-only", () => ({}));
jest.mock("@/utils/supabase/adminClient", () => ({ createAdminClient: () => ({}) }));

const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
let dueAnswer: unknown = [];
jest.mock("@ai-matrx/records/core", () => ({
  storeDoors: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      if (fn === "booking_busy_due") return { data: dueAnswer, error: null };
      if (fn === "booking_busy_set") return { data: { busy: (args.p_busy as unknown[]).length }, error: null };
      return { data: null, error: { message: `unexpected door ${fn}` } };
    },
  }),
}));

import { refreshBusyIfDue } from "../service";

const PAGE = "6f1b3c2a-1d4e-4f5a-9b8c-7d6e5f4a3b2c";
const at = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function calendar(): string {
  const start = new Date(Date.now() + 2 * 86_400_000);
  start.setUTCHours(17, 0, 0, 0);
  const end = new Date(start.getTime() + 3_600_000);
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", "UID:dentist@example.org", `DTSTART:${at(start)}`, `DTEND:${at(end)}`, "SUMMARY:Dentist", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}

const realFetch = global.fetch;
afterEach(() => {
  calls.length = 0;
  global.fetch = realFetch;
});

it("reads a due calendar and hands the store its busy moments", async () => {
  dueAnswer = [{ feed: "webcal://calendar.example.org/private-abc/basic.ics", due: true, timezone: "America/Los_Angeles", days: 14 }];
  const asked: string[] = [];
  global.fetch = jest.fn(async (url: string | URL) => {
    asked.push(String(url));
    return new Response(calendar(), { status: 200, headers: { "content-type": "text/calendar" } });
  }) as unknown as typeof fetch;
  const out = await refreshBusyIfDue(PAGE);
  expect(asked).toEqual(["https://calendar.example.org/private-abc/basic.ics"]);
  const set = calls.find((c) => c.fn === "booking_busy_set");
  expect(set?.args.p_form_id).toBe(PAGE);
  expect(set?.args.p_problem).toBeNull();
  expect(set?.args.p_busy).toHaveLength(1);
  expect(out).toEqual({ read: true, busy: 1, problem: null });
});

it("says why a calendar could not be read, so the store keeps the last good list", async () => {
  dueAnswer = [{ feed: "https://calendar.example.org/gone.ics", due: true, timezone: "UTC", days: 7 }];
  global.fetch = jest.fn(async () => new Response("Not found", { status: 404 })) as unknown as typeof fetch;
  await refreshBusyIfDue(PAGE);
  const set = calls.find((c) => c.fn === "booking_busy_set");
  expect(set?.args.p_problem).toMatch(/answered 404/);
  expect(set?.args.p_busy).toEqual([]);
});

it("reads nothing when the store says the list is fresh or the page has no calendar", async () => {
  global.fetch = jest.fn() as unknown as typeof fetch;
  dueAnswer = [{ feed: "https://calendar.example.org/a.ics", due: false, timezone: "UTC", days: 7 }];
  expect(await refreshBusyIfDue(PAGE)).toEqual({ read: false });
  dueAnswer = [];
  expect(await refreshBusyIfDue(PAGE)).toEqual({ read: false });
  expect(global.fetch).not.toHaveBeenCalled();
  expect(calls.some((c) => c.fn === "booking_busy_set")).toBe(false);
});
