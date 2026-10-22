import { readFileSync } from "node:fs";
import path from "node:path";
import { CODE_DECIDED_NOTE, judgeAsShown } from "../verdicts";

const src = readFileSync(path.resolve(__dirname, "../components/AgentTestPage.tsx"), "utf8");

// 2026-10-22 walk: the Runs list row stayed "Queued 0 / 1" while the run summary said Finished. The
// open run followed realtime; the list beside it was read once and never told the run moved.
describe("the runs list follows the open run", () => {
  it("the run panel tells the page when the run's row moves, and the page re-reads its list", () => {
    expect(src).toMatch(/onRunChanged=\{rereadRuns\}/);
    expect(src).toMatch(/onRun: \(\) => \{\s*rereadRun\(\);\s*runChanged\(\);/);
  });
  it("a stream status frame and Cancel re-read the list too", () => {
    expect(src).toMatch(/const reread = useEffectEvent\(\(\) => \{[^}]*runChanged\(\)/);
    expect(src).toMatch(/await cancelRun\(runId\);[^}]*runChanged\(\)/);
  });
});

describe("the judge says Advisory whenever the code checks decided", () => {
  it("a failed result with a judge reads advisory even when nothing was stored", () => {
    const j = judgeAsShown(null, "fail");
    expect(j?.advisory).toBe(true);
    expect(j?.advisoryReason).toBe(CODE_DECIDED_NOTE);
    expect(judgeAsShown(null, "fail_format")?.advisory).toBe(true);
  });
  it("keeps the stored reason and model", () => {
    const stored = { verdict: "holds", advisory: true, advisoryReason: "kappa 0.4", fedOk: true, model: "m", missingFacts: [] };
    expect(judgeAsShown(stored, "fail")).toBe(stored);
  });
  it("a judge that decided a pass stays binding", () => {
    expect(judgeAsShown(null, "pass_judged")).toBeNull();
    const stored = { verdict: "holds", advisory: false, advisoryReason: null, fedOk: true, model: "m", missingFacts: [] };
    expect(judgeAsShown(stored, "pass_judged")).toBe(stored);
  });
});
