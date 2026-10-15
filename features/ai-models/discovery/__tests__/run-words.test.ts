import { compatLabel, describeRun } from "../run-words";
import type { VerificationRun } from "../api";

const base: VerificationRun = {
  id: "b66809d0",
  variant_id: "v",
  check_kind: "test_run",
  result: "fail",
  trigger: "manual",
  os: "linux",
  arch: "x86_64",
  hardware_class: "x86_cpu",
  measured: { stage: "smoke", exit_code: 124 },
  finished_at: null,
};

describe("describeRun", () => {
  it("never shows a bare fail: the stage and exit code are said", () => {
    const w = describeRun(base, [base]);
    expect(w.headline).toBe("test run · fail · linux/x86_64 x86_cpu");
    expect(w.reason).toBe("stopped at smoke (exit 124)");
  });

  it("names the correcting row on the run it corrects", () => {
    const fix: VerificationRun = {
      ...base,
      id: "9571c97c",
      result: "error",
      measured: { kind: "correction", corrects_run_id: "b66809d0", reason: "Correction: harness defect." },
    };
    expect(describeRun(base, [base, fix]).correctedBy).toBe("Correction: harness defect.");
    const own = describeRun(fix, [base, fix]);
    expect(own.isCorrection).toBe(true);
    expect(own.headline.startsWith("correction · harness defect noted")).toBe(true);
  });

  it("shows the recorded reason for an error and none for a pass", () => {
    const err = { ...base, result: "error", measured: { reason: "the test machine could not run it" } };
    expect(describeRun(err, [err]).reason).toBe("the test machine could not run it");
    const pass = { ...base, result: "pass", measured: { tokens_per_second: "42.8" } };
    const w = describeRun(pass, [pass]);
    expect(w.reason).toBeNull();
    expect(w.headline).toContain("42.8 tokens/s");
  });
});

describe("compatLabel", () => {
  it("names the build each status is about", () => {
    expect(
      compatLabel({ hardware_class: "x86_cpu", status: "verified", runtime_build: { os: "linux", arch: "x86_64", runtime_version: "b9076" } }),
    ).toBe("x86_cpu verified (linux/x86_64 b9076)");
  });
});
