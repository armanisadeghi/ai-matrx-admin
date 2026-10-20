/** Old stopped builds read in plain words; the table matches the server's (stop_reasons.py). */
import { readFileSync } from "fs";
import { resolve } from "path";
import { PLAIN_STOP_REASON, PLAIN_UNPROVEN_REASON, plainBuildState } from "../plain-stop-reason";
import type { FactoryBuildState } from "../types";

const DEV = "Gate R14 failed: knob proof.floor_min=3 (holder 65a6e39d) pipeline_door";

it("an old stopped build shows the plain line and keeps the developer text as detail", () => {
  const old = { outcome: "unproven", error: DEV, pass_decision: { reason: DEV } } as unknown as FactoryBuildState;
  const out = plainBuildState(old)!;
  expect(out.error).toBe(PLAIN_STOP_REASON.unproven);
  expect(out.error).not.toContain("R14");
  expect(out.error_detail).toBe(DEV);
  expect((out as Record<string, any>).pass_decision.reason).toBe(PLAIN_STOP_REASON.unproven);
  expect((out as Record<string, any>).pass_decision.reason_detail).toBe(DEV);
  expect(old.error).toBe(DEV); // input untouched
});

it("uses the recorded unproven reason, leaves new, passed and empty states alone", () => {
  expect(plainBuildState({ outcome: "unproven", unproven_reason: "leak", error: DEV } as FactoryBuildState)!.error).toBe(PLAIN_UNPROVEN_REASON.leak);
  const fresh = { outcome: "failed", error: "plain", error_detail: "raw" } as FactoryBuildState;
  expect(plainBuildState(fresh)).toBe(fresh);
  const passed = { outcome: "passed", error: null } as FactoryBuildState;
  expect(plainBuildState(passed)).toBe(passed);
  expect(plainBuildState(null)).toBeNull();
});

it("the client table is the server table", () => {
  const py = readFileSync(resolve(__dirname, "../../../../../aidream/aidream/services/agent_factory/stop_reasons.py"), "utf8");
  for (const key of Object.keys(PLAIN_STOP_REASON)) expect(py).toContain(`"${key}":`);
  for (const key of Object.keys(PLAIN_UNPROVEN_REASON)) expect(py).toContain(`"${key}":`);
});
