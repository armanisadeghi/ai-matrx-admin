/**
 * @jest-environment jsdom
 */
// DB lane A (2026-10-21): every tab re-asked `platform.knob_snapshot_delta` once a minute per
// address — 41k calls in 5.7 h, the biggest browser cost on the database. A held snapshot is now
// served for KNOB_SNAPSHOT_TTL_MS; a tab coming back after being hidden re-checks with its etag
// (the module installs the listener once per tab; one cheap "unchanged?" call, never the ~80 ms defaults read while a snapshot is held).
import { createClient } from "@/utils/supabase/client";
import {
  KNOB_FOCUS_RECHECK_AFTER_MS,
  ensureKnobSnapshot,
  invalidateEffectiveKnob,
  peekEffectiveKnob,
} from "../effectiveKnobs";

jest.mock("@/utils/supabase/client", () => ({ createClient: jest.fn() }));
jest.mock("@/lib/redux/store-singleton", () => ({ getStoreSingleton: () => null }));
jest.mock("@/lib/client-directives/directiveRegistry", () => ({ registerDirectiveHandler: jest.fn() }));
jest.mock("../deviceId", () => ({ getWebDeviceId: () => null }));

const ORG = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const calls: string[] = [];
let etag = "k3.f1.d1";

function serve() {
  const rpc = (fn: string, args: Record<string, unknown>) => {
    calls.push(fn);
    if (fn === "knob_defaults") {
      return Promise.resolve({ data: { version: "d1", unchanged: args.p_known_version === "d1", defaults: { "a.b": 50 } }, error: null });
    }
    return Promise.resolve({
      data:
        args.p_etag === etag
          ? { etag, defaults_version: "d1", unchanged: true }
          : { etag, defaults_version: "d1", unchanged: false, overrides: { "a.b": 1 } },
      error: null,
    });
  };
  jest.mocked(createClient).mockReturnValue({ schema: () => ({ rpc }) } as unknown as ReturnType<typeof createClient>);
}

function setVisibility(state: "hidden" | "visible") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  calls.length = 0;
  etag = "k3.f1.d1";
  window.localStorage.clear();
  invalidateEffectiveKnob();
  jest.useRealTimers();
});

it("serves a held snapshot for five minutes without asking the database again", async () => {
  serve();
  const t0 = Date.now();
  const now = jest.spyOn(Date, "now").mockReturnValue(t0);
  await ensureKnobSnapshot(ORG, USER);
  calls.length = 0;
  now.mockReturnValue(t0 + 5 * 60_000);
  await ensureKnobSnapshot(ORG, USER);
  expect(calls).toEqual([]);
  now.mockRestore();
});

it("re-checks once with its etag when a hidden tab comes back, and keeps the answer when unchanged", async () => {
  serve();
  const t0 = Date.now();
  const now = jest.spyOn(Date, "now").mockReturnValue(t0);
  await ensureKnobSnapshot(ORG, USER);
  calls.length = 0;
  setVisibility("hidden");
  now.mockReturnValue(t0 + KNOB_FOCUS_RECHECK_AFTER_MS + 1);
  setVisibility("visible");
  await flush();
  expect(calls).toEqual(["knob_snapshot_delta"]);
  expect(peekEffectiveKnob(ORG, USER, "a.b")).toBe(1);
  now.mockRestore();
});

it("drops the held snapshot on return when the server's answer moved", async () => {
  serve();
  const t0 = Date.now();
  const now = jest.spyOn(Date, "now").mockReturnValue(t0);
  await ensureKnobSnapshot(ORG, USER);
  setVisibility("hidden");
  etag = "k3.f2.d1";
  now.mockReturnValue(t0 + KNOB_FOCUS_RECHECK_AFTER_MS + 1);
  setVisibility("visible");
  await flush();
  await flush();
  expect(peekEffectiveKnob(ORG, USER, "a.b")).toBeUndefined();
  now.mockRestore();
});

it("asks nothing when the tab was hidden only briefly", async () => {
  serve();
  await ensureKnobSnapshot(ORG, USER);
  calls.length = 0;
  setVisibility("hidden");
  setVisibility("visible");
  await flush();
  expect(calls).toEqual([]);
});
