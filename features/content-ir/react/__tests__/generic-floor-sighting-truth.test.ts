/**
 * A GENERIC-FLOOR SIGHTING IS FILED ONLY WHEN IT IS TRUE (defect 2026-10-14).
 *
 * On the kind-registry Preview of `brand_basics` the page itself filed
 * "a reader got the generic key/value view" while its own component rendered.
 * Two rules pin the class: a mounted render harness never files, and a
 * sighting is re-measured against the settled resolver before it is filed —
 * a warm-up render of a kind that has a component is not a sighting.
 */

const rpcMock = jest.fn(async (..._args: unknown[]) => ({ data: null, error: null }));

jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    auth: {
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
  },
}));

type FakeResolution = { componentKey: string; isActive: boolean } | null;
let resolverAnswer: FakeResolution = null;

jest.mock("../../registry/component-registry", () => ({
  componentRegistry: {
    ensureWarm: async () => {},
    requestComponent: () => {},
    resolve: () => resolverAnswer,
  },
}));

import {
  announceSessionForTests,
  resetSessionReadyForTests,
} from "../../registry/session-ready";
import {
  enterKindRenderHarness,
  reportKindComponentIncident,
  resetKindComponentIncidentDedupe,
  setGenericFloorSettleMsForTests,
  setKindComponentIncidentsEnabledForTests,
} from "../db-component/kindComponentIncident";

const flush = () => new Promise((resolve) => setTimeout(resolve, 30));

function fileGenericFloor(kind: string) {
  reportKindComponentIncident({
    kind,
    errorType: "generic_floor_render",
    message: `"${kind}" rendered through the GENERIC structured viewer`,
  });
}

function filedKinds(): string[] {
  return rpcMock.mock.calls
    .filter((call) => call[0] === "log_kind_component_incident")
    .map((call) => (call[1] as { p_kind: string }).p_kind);
}

beforeEach(() => {
  rpcMock.mockClear();
  resetKindComponentIncidentDedupe();
  resetSessionReadyForTests();
  announceSessionForTests(true);
  setKindComponentIncidentsEnabledForTests(true);
  setGenericFloorSettleMsForTests(0);
  resolverAnswer = null;
});

afterAll(() => setKindComponentIncidentsEnabledForTests(false));

it("files when the settled resolver still answers no component", async () => {
  fileGenericFloor("truly_bare_kind");
  await flush();
  expect(filedKinds()).toEqual(["truly_bare_kind"]);
});

it("does not file a warm-up render of a kind that has a component", async () => {
  resolverAnswer = { componentKey: "brand_basics_facts", isActive: true };
  fileGenericFloor("brand_basics");
  await flush();
  expect(filedKinds()).toEqual([]);
});

it("files when the only component is held inactive", async () => {
  resolverAnswer = { componentKey: "brand_basics_facts", isActive: false };
  fileGenericFloor("held_kind");
  await flush();
  expect(filedKinds()).toEqual(["held_kind"]);
});

it("never files while a render harness is mounted, even for a bare kind", async () => {
  const leave = enterKindRenderHarness();
  fileGenericFloor("harness_bare_kind");
  await flush();
  expect(filedKinds()).toEqual([]);
  leave();
  // Leaving re-arms the reader path: the same kind seen by a reader files.
  fileGenericFloor("harness_bare_kind");
  await flush();
  expect(filedKinds()).toEqual(["harness_bare_kind"]);
});

it("a harness that mounts after the block (parent effects run last) still suppresses", async () => {
  fileGenericFloor("late_harness_kind");
  const leave = enterKindRenderHarness();
  await flush();
  leave();
  expect(filedKinds()).toEqual([]);
});
