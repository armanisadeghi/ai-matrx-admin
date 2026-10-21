/**
 * @jest-environment jsdom
 */
// DB LANE A2 (2026-10-21): a write to platform.feature_knob used to move the one defaults version, so every
// tab re-read the whole ~200 kB register through knob_defaults (97/min). The register now travels in 64
// buckets (migrations/dblanea2_knob_register_ships_in_64_buckets.sql): the held vector rides in `p_etag`,
// the delta answers with only the changed buckets, and they replace the held ones whole — so a key deleted
// from a changed bucket disappears here too. Fails on the pre-bucket client: it re-reads knob_defaults
// after the write and never sends a vector.
import { createClient } from "@/utils/supabase/client";
import { ensureKnobSnapshot, invalidateEffectiveKnob, peekEffectiveKnob } from "../effectiveKnobs";

jest.mock("@/utils/supabase/client", () => ({ createClient: jest.fn() }));
jest.mock("@/lib/redux/store-singleton", () => ({ getStoreSingleton: () => null }));
jest.mock("@/lib/client-directives/directiveRegistry", () => ({ registerDirectiveHandler: jest.fn() }));
jest.mock("../deviceId", () => ({ getWebDeviceId: () => null }));

const ORG = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const V0 = "0".repeat(512);
const V1 = "1".repeat(8) + "0".repeat(512 - 8 * 4) + "2".repeat(8) + "0".repeat(16);
const EVERY = Array.from({ length: 64 }, (_, i) => i);

type Buckets = Record<string, Record<string, Record<string, unknown>>>;
const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
let buckets: Buckets;
let vector: string;
let changed: number[];

function pick(list: number[]): Buckets {
  return Object.fromEntries(list.filter((b) => buckets[String(b)]).map((b) => [String(b), buckets[String(b)]]));
}

function serve() {
  const rpc = (fn: string, args: Record<string, unknown>) => {
    calls.push({ fn, args });
    if (fn === "knob_defaults") {
      const held = String(args.p_known_version ?? "").replace(/^b64:/, "");
      const list = held === vector ? [] : held.length === 512 ? changed : EVERY;
      return Promise.resolve({
        data: { version: `v-${vector}`, vector, unchanged: held === vector, defaults_patch_buckets: list, defaults_patch: pick(list) },
        error: null,
      });
    }
    const etag = `k4.fp.${vector}`;
    const sent = args.p_etag as string | undefined;
    if (sent === etag) return Promise.resolve({ data: { etag, defaults_version: `v-${vector}`, unchanged: true }, error: null });
    const held = sent?.startsWith("k4.") ? sent.split(".")[2] : "";
    const list = held === vector ? [] : changed;
    const patch = held.length === 512 ? { defaults_vector: vector, defaults_patch_buckets: list, defaults_patch: pick(list) } : {};
    return Promise.resolve({
      data: { etag, defaults_version: `v-${vector}`, unchanged: false, overrides: { "far.away": "org" }, ...patch },
      error: null,
    });
  };
  jest.mocked(createClient).mockReturnValue({ schema: () => ({ rpc }) } as unknown as ReturnType<typeof createClient>);
}

beforeEach(() => {
  calls.length = 0;
  window.localStorage.clear();
  buckets = {
    "3": { "lists.org_filter": { mode: "all", "tab.default": "mine" }, other: { k: 1 } },
    "57": { far: { away: true, near: 2 } },
  };
  vector = V0;
  changed = [];
});

it("a knob write is answered with its bucket alone, and a key deleted from it disappears", async () => {
  serve();
  await ensureKnobSnapshot(ORG, USER);
  expect(peekEffectiveKnob(ORG, USER, { feature: "lists.org_filter", key: "tab.default" })).toBe("mine");
  expect(peekEffectiveKnob(ORG, USER, { feature: "far", key: "away" })).toBe("org");
  expect(calls.filter((c) => c.fn === "knob_defaults")).toHaveLength(1);

  // bucket 3 rewritten: `tab.default` deleted from lists.org_filter, feature `other` deleted.
  buckets = { "3": { "lists.org_filter": { mode: "none" } }, "57": buckets["57"] };
  vector = V1;
  changed = [3];
  calls.length = 0;
  invalidateEffectiveKnob();
  await ensureKnobSnapshot(ORG, USER);

  expect(calls.map((c) => c.fn)).toEqual(["knob_snapshot_delta"]);
  expect(calls[0].args.p_etag).toBe(`k4.fp.${V0}`);
  expect(peekEffectiveKnob(ORG, USER, { feature: "lists.org_filter", key: "mode" })).toBe("none");
  expect(peekEffectiveKnob(ORG, USER, { feature: "lists.org_filter", key: "tab.default" })).toBeUndefined();
  expect(peekEffectiveKnob(ORG, USER, { feature: "other", key: "k" })).toBeUndefined();
  expect(peekEffectiveKnob(ORG, USER, { feature: "far", key: "near" })).toBe(2);

  // The stored copy is the buckets at the new vector, not a second flat map.
  const stored = JSON.parse(window.localStorage.getItem("knobs.defaults.v1") ?? "{}") as { vector?: string; values?: unknown; buckets?: Buckets };
  expect(stored.vector).toBe(V1);
  expect(stored.values).toBeUndefined();
  expect(stored.buckets?.["3"]).toEqual({ "lists.org_filter": { mode: "none" } });
});
