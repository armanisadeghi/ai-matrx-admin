/**
 * @jest-environment jsdom
 */
// The server-bus rooms join after late idle, so a `settings_changed` sent in the first seconds is
// lost. The catch-up compares the versions the page's own boot read already holds (defaults content
// version, snapshot etag) and drops the caches ONLY when one moved; with nothing held it asks nothing.
import { createClient } from "@/utils/supabase/client";
import { catchUpKnobsSinceBoot, ensureKnobSnapshot, peekEffectiveKnob } from "../effectiveKnobs";

jest.mock("@/utils/supabase/client", () => ({ createClient: jest.fn() }));
jest.mock("@/lib/redux/store-singleton", () => ({ getStoreSingleton: () => null }));
jest.mock("@/lib/client-directives/directiveRegistry", () => ({ registerDirectiveHandler: jest.fn() }));
jest.mock("../deviceId", () => ({ getWebDeviceId: () => null }));

const ORG = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const calls: string[] = [];
let serverEtag = "e1";
let serverDefaults = "d1";

function serve() {
  const rpc = (fn: string, args: Record<string, unknown>) => {
    calls.push(fn);
    if (fn === "knob_defaults") {
      return Promise.resolve({
        data: { version: serverDefaults, unchanged: args.p_known_version === serverDefaults, defaults: { "a.b": 50 } },
        error: null,
      });
    }
    // The live etag covers the platform defaults too (`k3.<inputs>.<defaults version>`).
    const etag = `${serverEtag}.${serverDefaults}`;
    return Promise.resolve({
      data:
        args.p_etag === etag
          ? { etag, defaults_version: serverDefaults, unchanged: true }
          : { etag, defaults_version: serverDefaults, unchanged: false, overrides: { "a.b": 1 } },
      error: null,
    });
  };
  jest.mocked(createClient).mockReturnValue({ schema: () => ({ rpc }) } as unknown as ReturnType<typeof createClient>);
}

beforeEach(() => {
  calls.length = 0;
  serverEtag = "e1";
  serverDefaults = "d1";
  window.localStorage.clear();
});

it("asks nothing when the page's boot read holds no version", async () => {
  serve();
  expect(await catchUpKnobsSinceBoot()).toBe(false);
  expect(calls).toEqual([]);
});

it("leaves the caches alone when nothing moved since the boot read", async () => {
  serve();
  await ensureKnobSnapshot(ORG, USER);
  calls.length = 0;
  expect(await catchUpKnobsSinceBoot()).toBe(false);
  expect(peekEffectiveKnob(ORG, USER, "a.b")).toBe(1);
});

it("drops the held snapshot when an override moved before the rooms joined", async () => {
  serve();
  await ensureKnobSnapshot(ORG, USER);
  serverEtag = "e2";
  expect(await catchUpKnobsSinceBoot()).toBe(true);
  expect(peekEffectiveKnob(ORG, USER, "a.b")).toBeUndefined();
});

it("drops the held snapshot when the platform defaults moved", async () => {
  serve();
  await ensureKnobSnapshot(ORG, USER);
  serverDefaults = "d2";
  expect(await catchUpKnobsSinceBoot()).toBe(true);
  expect(peekEffectiveKnob(ORG, USER, "a.b")).toBeUndefined();
});
