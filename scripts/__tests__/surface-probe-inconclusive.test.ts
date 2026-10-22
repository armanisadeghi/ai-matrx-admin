// scripts/__tests__/surface-probe-inconclusive.test.ts
//
// 2026-10-22: `pnpm surface:probe --record` on /organizations/<id>/performance-reviews hit a
// page that refused access and recorded `fail` with 0 supplied onto a shared row, as if the
// surface failed to supply its values. A refused page, or one with nothing loaded, is
// INCONCLUSIVE: it carries a reason and never overwrites a recorded pass or fail.

import { judgeProbe, lastCheckPatch, type ChainValue, type ProbeRecordInput } from "../lib/surface-probe-judge";
import { deriveFleetReadiness, readinessGaps } from "../../features/surfaces/utils/fleet-readiness";

const CHAIN: ChainValue[] = [
  { name: "review_cycle", label: "Review cycle", always_available: true, auto_context: true, item_type: "" },
  { name: "active_organization_id", label: "Organization", always_available: true, auto_context: true, item_type: "" },
];

function input(over: Partial<ProbeRecordInput>): ProbeRecordInput {
  return {
    surface: "matrx-user/organization-performance-reviews",
    route: "/organizations/226be635/performance-reviews",
    recordId: null,
    base: "https://www.aimatrx.com",
    supplied: [],
    suppliedEmpty: [],
    surfaceNamed: false,
    signedIn: true,
    probedAs: { email: "admin@admin.com", userId: null, role: "admin" },
    errors: [],
    ...over,
  };
}

const AT = "2026-10-22T20:00:00.000Z";

describe("probe verdict: refused or empty pages are inconclusive, not fail", () => {
  it("a refused page is inconclusive with the access reason", () => {
    const probe = judgeProbe(input({ accessRefused: true }), CHAIN, AT);
    expect(probe.status).toBe("inconclusive");
    expect(probe.inconclusiveReason).toMatch(/^access refused/);
  });

  it("a page with no runtime and nothing read is inconclusive: no record loaded", () => {
    const probe = judgeProbe(input({ surfaceNamed: true, runtimeStatus: "none" }), CHAIN, AT);
    expect(probe.status).toBe("inconclusive");
    expect(probe.inconclusiveReason).toMatch(/^no record loaded/);
  });

  it("a loaded page that supplies some values but misses one still FAILS", () => {
    const probe = judgeProbe(input({ surfaceNamed: true, supplied: ["review_cycle"], runtimeStatus: "live" }), CHAIN, AT);
    expect(probe.status).toBe("fail");
    expect(probe.missing).toEqual(["active_organization_id"]);
  });

  it("a loaded page that supplies every value passes", () => {
    const probe = judgeProbe(
      input({ surfaceNamed: true, supplied: ["review_cycle", "active_organization_id"], runtimeStatus: "live" }),
      CHAIN,
      AT,
    );
    expect(probe.status).toBe("pass");
    expect(probe.inconclusiveReason).toBeNull();
  });
});

describe("recording: inconclusive never overwrites a pass or a fail", () => {
  const inconclusive = judgeProbe(input({ accessRefused: true }), CHAIN, AT);

  it.each(["pass", "fail"])("keeps a recorded %s and files the inconclusive run beside it", (previous) => {
    const patch = lastCheckPatch(previous, inconclusive);
    expect(patch).not.toHaveProperty("status");
    expect(patch).not.toHaveProperty("suppliedValues");
    expect(patch.lastInconclusive).toMatchObject({ at: AT, reason: inconclusive.inconclusiveReason });
  });

  it("is written as the status when nothing was recorded before", () => {
    expect(lastCheckPatch(null, inconclusive)).toMatchObject({ status: "inconclusive" });
  });

  it("a real verdict replaces an earlier inconclusive one and clears it", () => {
    const pass = judgeProbe(
      input({ surfaceNamed: true, supplied: ["review_cycle", "active_organization_id"], runtimeStatus: "live" }),
      CHAIN,
      AT,
    );
    expect(lastCheckPatch("inconclusive", pass)).toMatchObject({ status: "pass", lastInconclusive: null });
  });
});

describe("readiness reads inconclusive as unproven, never as proof", () => {
  const metric = {
    values_declared_on: 2,
    values_supplied: 2,
    write_targets: 0,
    handled_targets: 0,
    situation_present: true,
    situation_source: "own",
    probe_result: "inconclusive",
  } as Parameters<typeof deriveFleetReadiness>[0];

  it("never Ready, and the gap says inconclusive (not failed)", () => {
    expect(deriveFleetReadiness(metric)).not.toBe("ready");
    expect(readinessGaps(metric)).toEqual(["Last probe inconclusive"]);
  });
});
