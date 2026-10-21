/**
 * GUARD: no theme color variable is used bare (`var(--popover)` is no color: the theme holds bare
 * HSL triples). Runs the real checker over this tree, and proves it fails on a planted offender.
 * The checker is scripts/check-bare-hsl-color.mjs (kept byte-identical in aidream/apps/shared/scripts
 * and matrx-frontend/scripts).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CHECKER = resolve(__dirname, "check-bare-hsl-color.mjs");
const ROOT = resolve(__dirname, "..");

describe("bare theme variable guard", () => {
  it("self-test catches planted bare variables", () => {
    execFileSync("node", [CHECKER, "--self-test"]);
  });

  it("fails on a planted bare var(--x) color and passes once hsl-wrapped", () => {
    const dir = mkdtempSync(join(tmpdir(), "bare-hsl-"));
    execFileSync("git", ["init", "-q", dir]);
    const file = join(dir, "planted.tsx");
    writeFileSync(file, 'export const s = { background: "var(--popover)" };\n');
    execFileSync("git", ["-C", dir, "add", "planted.tsx"]);
    const bad = spawnSync("node", [CHECKER, "--root", dir]);
    expect(bad.status).toBe(1);
    writeFileSync(file, 'export const s = { background: "hsl(var(--popover))" };\n');
    const good = spawnSync("node", [CHECKER, "--root", dir]);
    expect(good.status).toBe(0);
  });

  it("no tracked source uses a bare theme variable as a color", () => {
    const res = spawnSync("node", [CHECKER, "--root", ROOT], { encoding: "utf8" });
    expect(res.stderr).toBe("");
    expect(res.status).toBe(0);
  });
});
