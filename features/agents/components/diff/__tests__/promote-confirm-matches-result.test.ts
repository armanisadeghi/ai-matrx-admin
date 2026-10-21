/**
 * Guard: the Promote confirm and the toast after it say the same true thing about the history.
 * `agx_promote_version` saves the restore as a NEW version (aidream migration 20261021233500) and
 * answers its number as `new_version` (`unchanged: true` when nothing needed saving). Both sentences
 * come from `@ai-matrx/agents/versions`; the toast names the saved version from the door's answer.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { promoteConfirmMessage, promoteSuccessMessage } from "@ai-matrx/agents/versions";

const SRC = readFileSync(join(__dirname, "..", "AgentVersionDiffPage.tsx"), "utf8");

describe("Promote confirm vs result", () => {
  it("the dialog and the toast build their sentences from the shared helpers and the door's answer", () => {
    expect(SRC).toContain("promoteConfirmMessage(");
    expect(SRC).toMatch(/promoteSuccessMessage\(leftVersion, \{\s*newVersion: result\.new_version/);
    expect(SRC).toMatch(/unchanged: result\.unchanged/);
  });

  it("the confirm and the result agree that a restore saves a new version, and the result says which", () => {
    expect(promoteConfirmMessage(1)).toMatch(/saved as a new version/);
    expect(promoteSuccessMessage(1, { newVersion: 3 })).toBe("Restored v1 as a new version (v3)");
    expect(promoteSuccessMessage(1, { newVersion: 2, unchanged: true })).toBe("Already matches v1 — nothing to save");
  });
});
