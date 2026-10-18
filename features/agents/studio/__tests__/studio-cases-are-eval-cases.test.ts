/**
 * One store, one runner: the Agent Studio's test cases are Agent Evaluation cases
 * (agent.exemplar kind='test_case'), and its runs are eval runs. The Studio never writes
 * or lists Samples (kind='sample') as its cases, and never mounts the Samples manager.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(__dirname, "..", "components");
const sources = readdirSync(dir)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => ({ f, text: readFileSync(join(dir, f), "utf8") }));

describe("Studio cases are eval cases", () => {
  it.each(["borrowSampleFromRun", "createAgentSample", "fetchAgentSamples", "AgentSamplesManager"])(
    "no Studio component uses the Samples store's %s",
    (name) => {
      expect(sources.filter((s) => s.text.includes(name)).map((s) => s.f)).toEqual([]);
    },
  );

  it("Save as test case, the first case, Cases and Battle all go through the eval case store", () => {
    const page = sources.find((s) => s.f === "AgentStudioPage.tsx")!.text;
    expect(page).toContain("saveRunAsTestCase");
    expect(page).toContain("createTestCase");
    const cases = sources.find((s) => s.f === "StudioCases.tsx")!.text;
    expect(cases).toContain("launchRun");
    expect(cases).toContain("TestRunPanel");
    const controls = sources.find((s) => s.f === "StudioControls.tsx")!.text;
    expect(controls).toContain("CaseVersionGrid");
    // Battle runs on the eval cases through the one runner (setups), never a second battle store.
    const battle = sources.find((s) => s.f === "StudioBattle.tsx")!.text;
    expect(battle).toContain("fetchTestCaseRows");
    expect(battle).toContain("launchBattle");
    expect(battle).toContain("TestRunPanel");
  });
});
