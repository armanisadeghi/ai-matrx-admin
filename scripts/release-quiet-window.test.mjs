// OVERNIGHT QUIET WINDOW (Arman 2026-10-15): release.sh holds inside 23:00-07:00 America/Los_Angeles
// except the one 03:00 release; --force-release / MATRX_RELEASE_FORCE=1 always run. Plants a window
// around "now" so the real gate block of release.sh is exercised with the real quiet_window.py.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const text = fs.readFileSync(path.join(ROOT, "scripts/release.sh"), "utf8");
const gate = text.slice(text.indexOf("# ══ OVERNIGHT QUIET WINDOW"), text.indexOf("# ══ THE SHIP PATH ═", text.indexOf("# ══ OVERNIGHT QUIET WINDOW")) );
const real = JSON.parse(fs.readFileSync(path.join(ROOT, ".github/quiet-window.json"), "utf8"));

function hhmm(offsetHours) {
  const d = new Date(Date.now() + offsetHours * 3600e3);
  return new Intl.DateTimeFormat("en-GB", { timeZone: real.timezone, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

function run(env = {}, { force = "false", releaseAtOffset = 12 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qw-"));
  const cfg = path.join(dir, "cfg.json");
  fs.writeFileSync(cfg, JSON.stringify({ ...real, quiet_start: hhmm(-1), quiet_end: hhmm(1), release_at: hhmm(releaseAtOffset) }));
  const harness = path.join(dir, "gate.sh");
  fs.writeFileSync(harness, [
    "set -u", `FORCE_RELEASE=${force}`, "RELEASE_PHASE=ship", `REPO_ROOT="${ROOT}"`, `export MATRX_QUIET_WINDOW_STATE="${dir}/state"`,
    "release_lock_cleanup() { :; }",
    `python3() { command python3 "$@" --config ${cfg}; }`, gate, "echo PROCEEDED",
  ].join("\n"));
  return spawnSync("bash", [harness], { encoding: "utf8", env: { ...process.env, ...env } });
}

test("the real knob is the ruling: 23:00-07:00 America/Los_Angeles, one release at 03:00", () => {
  assert.deepEqual([real.timezone, real.quiet_start, real.quiet_end, real.release_at, real.enabled], ["America/Los_Angeles", "23:00", "07:00", "03:00", true]);
});

test("inside the window, outside the release slot, release.sh holds", () => {
  const r = run();
  assert.match(r.stdout, /HELD/);
  assert.doesNotMatch(r.stdout, /PROCEEDED/);
});

test("--force-release and MATRX_RELEASE_FORCE=1 still release", () => {
  assert.match(run({}, { force: "true" }).stdout, /PROCEEDED/);
  assert.match(run({ MATRX_RELEASE_FORCE: "1" }).stdout, /PROCEEDED/);
});

test("the one release slot proceeds once", () => {
  // release_at = now: state 'release' -> proceeds, marks the slot.
  const r = run({}, { releaseAtOffset: 0 });
  assert.match(r.stdout, /PROCEEDED/);
});

test("the gate sits after the --ship commit and before the version bump", () => {
  assert.ok(text.indexOf("release_stage_commit") < text.indexOf("# ══ OVERNIGHT QUIET WINDOW"));
  assert.ok(text.indexOf("# ══ OVERNIGHT QUIET WINDOW") < text.indexOf("acquire_release_lock\n"));
});
