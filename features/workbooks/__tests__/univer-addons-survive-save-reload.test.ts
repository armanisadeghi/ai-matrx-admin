/**
 * The Univer add-ons must be registered and what a person builds with them must
 * come back from a snapshot save -> load. Runs `scripts/check-univer-addons.mjs`
 * — a real Univer at the installed version — green on the real tree and RED
 * when an add-on plugin is left out (so the check can fail).
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const script = join(__dirname, "..", "..", "..", "scripts", "check-univer-addons.mjs");
const run = (...args: string[]) => spawnSync("node", [script, ...args], { encoding: "utf8", timeout: 100_000 });

describe("univer add-ons", () => {
  it("are registered and survive save -> load", () => {
    const r = run();
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
  });

  it.each(["filter", "conditionalFormatting", "note"])("goes red when %s is missing", (plugin) => {
    const r = run(`--break=${plugin}`);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("did not come back on save");
  });
});
