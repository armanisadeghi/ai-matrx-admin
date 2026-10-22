/**
 * Derived readiness is earned from the fleet metric (surface declarations D2).
 * Fixture: a dental clinic's appointment-notes surface at each stage.
 */
import { deriveFleetReadiness } from "../fleet-readiness";

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

  it("an inherited module sentence is not the page's situation", () => {
    expect(
      deriveFleetReadiness({ ...clinicNotes, situation_present: true, situation_source: "inherited" }),
    ).toBe("partial");
  });
});
