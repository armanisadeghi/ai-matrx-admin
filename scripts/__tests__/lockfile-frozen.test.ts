/**
 * v0.4.3297 failed at Vercel install (ERR_PNPM_OUTDATED_LOCKFILE): package.json said
 * @ai-matrx/summon "latest", the committed lockfile said ^0.1.0. scripts/lockfile-frozen.sh
 * is the pre-push / pre-release check that runs Vercel's own frozen install on a tree.
 * This drives the REAL script and the REAL pnpm against a throwaway git repo.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = join(process.cwd(), "scripts", "lockfile-frozen.sh");
const LOCK = "lockfileVersion: '9.0'\n\nsettings:\n  autoInstallPeers: true\n  excludeLinksFromLockfile: false\n\nimporters:\n\n  .: {}\n";
let repo: string;

const git = (...a: string[]) =>
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: repo, encoding: "utf8" });
const judge = (tree: string) => spawnSync("bash", [SCRIPT, tree], { cwd: repo, encoding: "utf8" });

beforeAll(() => {
  repo = mkdtempSync(join(tmpdir(), "lockfile-frozen-"));
  git("init", "-q");
  writeFileSync(join(repo, "package.json"), JSON.stringify({ name: "x", version: "1.0.0" }, null, 2));
  writeFileSync(join(repo, "pnpm-lock.yaml"), LOCK);
  git("add", "-A");
  git("commit", "-qm", "paired");
  // package.json gains a dependency, the lockfile does not: the 0.4.3297 shape.
  writeFileSync(
    join(repo, "package.json"),
    JSON.stringify({ name: "x", version: "1.0.0", dependencies: { "@ai-matrx/summon": "latest" } }, null, 2),
  );
  git("add", "package.json");
  git("commit", "-qm", "package.json without its lockfile");
});
afterAll(() => rmSync(repo, { recursive: true, force: true }));

describe("lockfile-frozen.sh", () => {
  it("accepts a tree whose package.json and lockfile agree", () => {
    expect(judge("HEAD~1").status).toBe(0);
  });
  it("refuses a tree where package.json moved without its lockfile", () => {
    const r = judge("HEAD");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("ERR_PNPM_OUTDATED_LOCKFILE");
  });
  it("--write regenerates a lockfile a clean merge left out of step, and the result passes", () => {
    // The d65df2aca6 shape, offline: the lockfile names an importer entry package.json does not
    // declare (here: an empty dependency map with a stale entry is the same OUTDATED refusal).
    const stale = mkdtempSync(join(tmpdir(), "lockfile-frozen-stale-"));
    try {
      const lockWithEntry = LOCK.replace(
        "  .: {}\n",
        "  .:\n    dependencies:\n      left-pad:\n        specifier: 1.3.0\n        version: 1.3.0\n\npackages:\n\n  left-pad@1.3.0:\n    resolution: {integrity: sha512-XI5MPzVNApjAyhQzphX8BkmKsKUxD4LdyK24iZeQ1N0rLTGqNbSzF8jKDnS6PGkrWHZvd2IBuNDb/tW4QvTKUjvhg==}\n    deprecated: use String.prototype.padStart()\n\nsnapshots:\n\n  left-pad@1.3.0: {}\n",
      );
      writeFileSync(join(repo, "pnpm-lock.yaml"), lockWithEntry);
      writeFileSync(join(repo, "package.json"), JSON.stringify({ name: "x", version: "1.0.0" }, null, 2));
      git("add", "-A");
      git("commit", "-qm", "lockfile carries an entry package.json dropped");
      expect(judge("HEAD").status).toBe(1);
      const out = join(stale, "pnpm-lock.yaml");
      const r = spawnSync("bash", [SCRIPT, "HEAD", "--write", out], { cwd: repo, encoding: "utf8" });
      expect(r.status).toBe(3);
      expect(existsSync(out)).toBe(true);
      expect(readFileSync(out, "utf8")).not.toContain("left-pad");
      writeFileSync(join(repo, "pnpm-lock.yaml"), readFileSync(out, "utf8"));
      git("add", "pnpm-lock.yaml");
      git("commit", "-qm", "repaired");
      expect(judge("HEAD").status).toBe(0);
    } finally {
      rmSync(stale, { recursive: true, force: true });
    }
  });
  it("is wired into both ship paths", () => {
    const fs = require("node:fs");
    expect(fs.readFileSync(join(process.cwd(), "scripts/sync-main.py"), "utf8")).toContain("guard_frozen_lockfile()");
    expect(fs.readFileSync(join(process.cwd(), "scripts/sync-main.py"), "utf8")).toContain("repair_frozen_lockfile(helper)");
    expect(fs.readFileSync(join(process.cwd(), "scripts/release.sh"), "utf8")).toContain('ship_guard_frozen "$idx"');
  });
});
