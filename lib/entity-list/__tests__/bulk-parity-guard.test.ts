/**
 * `pnpm check:bulk-parity` proves itself: its self-test plants the spend-approvals drift (row
 * decisions with no bulk twin) and a hand-written bulk list beside defineRowVerbs, and must go red
 * on both, green at the baseline, and red again on a newly planted verb. The migrated board itself
 * must carry no parallel list.
 */
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const GUARD = join(ROOT, "scripts/bulk-parity/check-bulk-parity.mjs");

describe("check:bulk-parity", () => {
  it("self-test: red on a planted break, green at the baseline", () => {
    const out = execFileSync("node", [GUARD, "--self-test"], { cwd: ROOT, encoding: "utf8" });
    expect(out).toContain("self-test PASS");
  });

  it("the spend approvals board declares its verbs once (no parallel list, no census entry)", () => {
    const out = execFileSync("node", [GUARD, "--list", "features/admin/spend-approvals/SpendApprovalsBoard.tsx"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(out).toContain("0 list file(s) with row verbs and no bulk twin, 0 parallel bulk list(s)");
  });
});
