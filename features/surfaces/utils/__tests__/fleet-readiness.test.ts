/**
 * Derived readiness is earned from the fleet metric (surface declarations D2).
 * Fixture: a dental clinic's appointment-notes surface at each stage.
 */
import { deriveFleetReadiness, readinessGaps } from "../fleet-readiness";

const clinicNotes = {
  values_declared_on: 12,
  values_supplied: 12,
  write_targets: 3,
  handled_targets: 3,
  situation_present: true,
  situation_source: "own" as const,
  probe_result: "pass",
};

describe("deriveFleetReadiness", () => {
  it("is ready only when everything is supplied, handled and situated", () => {
    expect(deriveFleetReadiness(clinicNotes)).toBe("ready");
  });

  it("drops to partial on any one gap", () => {
    expect(deriveFleetReadiness({ ...clinicNotes, values_supplied: 11 })).toBe("partial");
    expect(deriveFleetReadiness({ ...clinicNotes, handled_targets: 2 })).toBe("partial");
    expect(deriveFleetReadiness({ ...clinicNotes, situation_present: false, situation_source: "none" })).toBe("partial");
  });

  it("never counts an unmeasured handler as handled", () => {
    expect(deriveFleetReadiness({ ...clinicNotes, handled_targets: null })).toBe("partial");
    expect(
      deriveFleetReadiness({ ...clinicNotes, write_targets: 0, handled_targets: 0 }),
    ).toBe("ready");
  });

  it("is unproven when nothing was supplied, nothing is declared on, or there is no metric", () => {
    expect(deriveFleetReadiness({ ...clinicNotes, values_supplied: 0 })).toBe("unproven");
    expect(
      deriveFleetReadiness({ ...clinicNotes, values_declared_on: 0, values_supplied: 0 }),
    ).toBe("unproven");
    expect(deriveFleetReadiness(undefined)).toBe("unproven");
  });
});

describe("readiness needs a passing probe and the page's OWN situation (review B1, B2)", () => {
  it("a failed or missing probe is never Ready", () => {
    expect(deriveFleetReadiness({ ...clinicNotes, probe_result: "fail" })).toBe("partial");
    expect(deriveFleetReadiness({ ...clinicNotes, probe_result: null })).toBe("partial");
  });

  it("an inconclusive probe is Unproven with its reason, never a fourth state", () => {
    const inconclusive = { ...clinicNotes, probe_result: "inconclusive" };
    expect(deriveFleetReadiness(inconclusive)).toBe("unproven");
    expect(readinessGaps(inconclusive)).toEqual(["Last probe inconclusive"]);
  });

  it("an inherited module sentence is not the page's situation", () => {
    expect(
      deriveFleetReadiness({ ...clinicNotes, situation_present: true, situation_source: "inherited" }),
    ).toBe("partial");
  });
});

describe("readinessGaps", () => {
  const base = {
    values_declared_on: 12,
    values_supplied: 12,
    write_targets: 3,
    handled_targets: 3,
    situation_present: true,
    situation_source: "own" as const,
    probe_result: "pass",
  };

  it("is empty exactly when the surface is ready", () => {
    const variants = [
      base,
      { ...base, values_supplied: 0 },
      { ...base, values_supplied: 11 },
      { ...base, values_declared_on: 0, values_supplied: 0 },
      { ...base, handled_targets: null },
      { ...base, handled_targets: 1 },
      { ...base, write_targets: 0, handled_targets: 0 },
      { ...base, situation_source: "inherited" as const, situation_present: false },
      { ...base, situation_source: "none" as const, situation_present: false },
      { ...base, probe_result: "fail" },
      { ...base, probe_result: null },
    ];
    for (const v of variants) {
      expect(readinessGaps(v).length === 0).toBe(deriveFleetReadiness(v) === "ready");
    }
  });

  it("names each gap in words", () => {
    expect(
      readinessGaps({ ...base, values_supplied: 9, handled_targets: 2, situation_source: "inherited", probe_result: null }),
    ).toEqual([
      "Never probed",
      "3 of 12 on values not supplied",
      "1 of 3 write targets without a handler",
      "Situation is inherited, not its own",
    ]);
    expect(readinessGaps(undefined)).toEqual(["No fleet metric for this surface"]);
  });
});
