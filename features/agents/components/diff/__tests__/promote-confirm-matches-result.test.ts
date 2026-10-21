/**
 * Guard: the Promote confirm and the toast after it say the same true thing about the history.
 * `agx_promote_version` saves NO new version, but the dialog once promised the current configuration
 * "will be saved as a new version" while the toast said none was. Both sentences now come from
 * `@ai-matrx/agents/versions` (one shared constant); this fails if the dialog goes back to its own words.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { promoteConfirmMessage, promoteSuccessMessage } from "@ai-matrx/agents/versions";

const SRC = readFileSync(join(__dirname, "..", "AgentVersionDiffPage.tsx"), "utf8");

describe("Promote confirm vs result", () => {
  it("the dialog builds its sentence from the shared helper, not its own prose", () => {
    expect(SRC).toContain("promoteConfirmMessage(");
    expect(SRC).toContain("promoteSuccessMessage(");
    expect(SRC).not.toMatch(/will be saved as a\s+new version/i);
  });

  it("the confirm and the result agree that no new version is saved", () => {
    expect(promoteConfirmMessage(1)).toMatch(/no new version is saved/);
    expect(promoteSuccessMessage(1)).toMatch(/no new version was saved/);
  });
});
