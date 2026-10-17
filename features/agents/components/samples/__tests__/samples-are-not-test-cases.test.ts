/**
 * "Test case" belongs to Agent Evaluation (agent.exemplar kind='test_case'). The builder's Samples
 * screen (kind='sample') must not use that word for its own rows (they collided in the Studio,
 * 2026-10-17). Vocabulary does not rule it; conflicts.md carries the open question.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FILES = [
  "features/agents/components/samples/AgentSamplesManager.tsx",
  "features/agents/components/samples/NewTestCaseDialog.tsx",
  "features/agents/components/samples/LoadFromLibraryDialog.tsx",
  "features/agents/components/samples/AgentSamplesLauncher.tsx",
  "app/(admin)/administration/agents/system-agents/agents/[id]/samples/page.tsx",
];

describe("the Samples screen says samples", () => {
  it.each(FILES)("%s never calls a sample a test case", (file) => {
    const src = readFileSync(join(process.cwd(), file), "utf8");
    expect(src).not.toMatch(/test cases?/i);
  });
});
