/**
 * @jest-environment node
 */
/**
 * The browser read deadline through the REAL chain: supabase-js client →
 * wrapClientForCapture (which installs the deadline) → postgrest-js's retry
 * loop and error shaping → the capture store and tier rules. A stalled read is
 * captured once as `TimeoutError` under supabase-browser-transport-loss —
 * never as a cancelled request, never retried.
 */
import { createClient } from "@supabase/supabase-js";

// The page-load ledger schedules on `document` idleness; it records timings
// only and has no part in what a read returns or how it is captured.
jest.mock("@/lib/diagnostics/loadLedger", () => ({
  ...jest.requireActual("@/lib/diagnostics/loadLedger"),
  recordLoadCall: () => undefined,
}));
import { wrapClientForCapture } from "@/lib/diagnostics/supabaseErrorCapture";
import { clearCapturedErrors, getSnapshot } from "@/lib/diagnostics/errorCaptureStore";
import {
  BROWSER_READ_HEADER_DEADLINE_MS,
  hasBrowserReadDeadline,
  isBrowserReadDeadlineError,
} from "@/utils/supabase/browserReadDeadline";

// wrapClientForCapture is browser-only; node supplies fetch/Response/AbortSignal.any.
(globalThis as { window?: unknown }).window ??= globalThis;
(globalThis as { location?: unknown }).location ??= new URL("http://capture.test/shapes/x");

describe("browser read deadline → capture (real chain)", () => {
  beforeEach(() => {
    clearCapturedErrors();
    jest.useFakeTimers({ doNotFake: ["queueMicrotask", "nextTick"] });
  });
  afterEach(() => jest.useRealTimers());

  it("captures a stalled read once as TimeoutError on the transport-loss rule", async () => {
    let restCalls = 0;
    const stalled = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!String(input).includes("/rest/v1/")) return new Response("{}");
      restCalls++;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
      });
    };
    const raw = createClient("http://capture.test", "sb_publishable_test", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: stalled as typeof fetch },
    });
    const client = wrapClientForCapture(raw);
    expect(hasBrowserReadDeadline(raw)).toBe(true);

    const pending = Promise.resolve(client.from("things").select("*"));
    await jest.advanceTimersByTimeAsync(BROWSER_READ_HEADER_DEADLINE_MS + 1_000);
    const { error, status } = await pending;

    expect(status).toBe(0);
    expect(isBrowserReadDeadlineError(error)).toBe(true);
    expect(restCalls).toBe(1);
    const rows = getSnapshot().filter((e) => e.source === "supabase-postgrest");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "TimeoutError",
      status: 0,
      tier: "yellow",
      tierRuleId: "supabase-browser-transport-loss",
    });
  });
});
