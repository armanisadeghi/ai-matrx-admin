/**
 * MKT-167: a run's large event values arrive by reference and are loaded ONCE, on
 * demand, through the one path — never with the event log.
 */
import { withRunDebugView } from "../debug-view";
import {
  RUN_VALUE_HELD_KEY,
  RUN_VALUE_REF_KEY,
  cachedRunValues,
  clearRunValueCache,
  collectRunValueRefs,
  resolveRunValue,
} from "../run-values";

const ref = (h: string) => ({ [RUN_VALUE_REF_KEY]: h });

describe("run values by reference", () => {
  beforeEach(() => clearRunValueCache());

  it("finds every reference, not following them, and ignores look-alikes", () => {
    const value = { a: ref("h1"), b: [ref("h2"), { c: ref("h1") }], d: { [RUN_VALUE_REF_KEY]: "x", other: 1 } };
    expect([...collectRunValueRefs(value)].sort()).toEqual(["h1", "h2"]);
  });

  it("resolves an output's references through ONE request and caches them", async () => {
    const fetchValues = jest.fn(async (path: string) => {
      expect(path).toBe("/runs/run-1/values?hash=h1&hash=h2");
      return { values: { h1: [{ field: "brand.fact_0" }], h2: "page text" }, missing: [] };
    });
    const output = { __kind: "provision_values", decision: "keep", provisions: ref("h1"), page: ref("h2") };
    const resolved = await resolveRunValue("run-1", output, fetchValues);
    expect(resolved).toEqual({
      __kind: "provision_values",
      decision: "keep",
      provisions: [{ field: "brand.fact_0" }],
      page: "page text",
    });
    await resolveRunValue("run-1", { again: ref("h1") }, fetchValues);
    expect(fetchValues).toHaveBeenCalledTimes(1);
    expect(cachedRunValues("run-1", ["h1"]).size).toBe(1);
  });

  it("a value with no references costs no request", async () => {
    const fetchValues = jest.fn();
    const small = { decision: "keep" };
    expect(await resolveRunValue("run-1", small, fetchValues)).toBe(small);
    expect(fetchValues).not.toHaveBeenCalled();
  });

  it("a reference the run never stored is a loud failure, never a marker on screen", async () => {
    const fetchValues = jest.fn(async () => ({ values: {}, missing: ["gone"] }));
    await expect(resolveRunValue("run-1", { x: ref("gone") }, fetchValues)).rejects.toThrow(/no stored value/);
  });
});

describe("held values and the debug view (MKT-167 part 2)", () => {
  beforeEach(() => clearRunValueCache());

  it("treats a held provision marker as a reference an admin in debug mode loads", async () => {
    const held = { [RUN_VALUE_HELD_KEY]: "p1" };
    expect([...collectRunValueRefs({ provision_values: held })]).toEqual(["p1"]);
    const fetchValues = jest.fn(async () => ({ values: { p1: { brand_name: "Acme" } }, missing: [] }));
    const resolved = await resolveRunValue("run-2", { provision_values: held }, fetchValues);
    expect(resolved).toEqual({ provision_values: { brand_name: "Acme" } });
  });

  it("adds debug_view=1 only when the tab is in admin debug mode", () => {
    expect(withRunDebugView("/runs/r/events?after_seq=0", false)).toBe("/runs/r/events?after_seq=0");
    expect(withRunDebugView("/runs/r/events?after_seq=0", true)).toBe("/runs/r/events?after_seq=0&debug_view=1");
    expect(withRunDebugView("/runs/r/events/stream", true)).toBe("/runs/r/events/stream?debug_view=1");
  });
});
