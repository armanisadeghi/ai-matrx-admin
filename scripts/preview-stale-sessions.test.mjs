// scripts/preview-stale-sessions.test.mjs
//
// STALE SESSIONS (Arman, 2026-10-17: "I have my system crash at least 5 times per day because of
// poor management and stale sessions"). Pins scripts/agent-harness/stale-sessions.sh with REAL
// processes and real files in a throwaway state dir:
//   - a hold ends when the process that took it exits, when its pid is reused, or when its host
//     went quiet for the published hold_idle_expire_minutes knob — and only then;
//   - an orphaned Playwright browser (launcher gone) is closed after its grace, with its tree; a
//     browser whose launcher lives, a process outside the Playwright dir, and a browser with a
//     client on its debugging port are never touched;
//   - a detached launcher older than the longest hold is closed with its browser;
//   - the watchdog's machine-memory reading is real and complete; status prints it.
// The "browsers" are symlinks to /bin/bash (running a sleep) inside a fake Playwright browsers dir
// (MATRX_PLAYWRIGHT_BROWSERS_DIR), so no real browser, server or shared state is touched.
//
//   node --test scripts/preview-stale-sessions.test.mjs

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = process.env.MATRX_PREVIEW_SCRIPT_UNDER_TEST
  ? resolve(process.env.MATRX_PREVIEW_SCRIPT_UNDER_TEST)
  : join(REPO_ROOT, "scripts/agent-dev-server.sh");

const spawned = [];
const dirs = [];
after(() => {
  for (const pid of spawned) {
    for (const target of [-pid, pid]) {
      try {
        process.kill(target, "SIGKILL"); // its own session's group first: a fake browser's sleep goes too
      } catch {
        /* gone */
      }
    }
  }
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

const now = () => Math.floor(Date.now() / 1000);
function tempDir(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(d);
  return d;
}
function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
const sleepMs = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function waitGone(pid, ms = 5000) {
  const until = Date.now() + ms;
  while (Date.now() < until && isAlive(pid)) sleepMs(100);
  return !isAlive(pid);
}

/** Source the script in `dir` and run `body`. */
function sourced(dir, body, env = {}) {
  const res = spawnSync("bash", ["-c", `source "${SCRIPT}"; ${body}`], {
    env: { ...process.env, MATRX_PREVIEW_STATE_DIR: dir, ...env },
    encoding: "utf8",
  });
  return { out: `${res.stdout ?? ""}${res.stderr ?? ""}`, code: res.status ?? 1 };
}

/**
 * Start `argv` as an ORPHAN (its python launcher exits at once, so its parent is launchd), in its own
 * session, cwd `cwd`. Returns its pid.
 */
function orphan(argv, cwd = tmpdir()) {
  const py = `
import os, subprocess, sys
D = subprocess.DEVNULL
p = subprocess.Popen(sys.argv[1:], start_new_session=True, stdin=D, stdout=D, stderr=D, cwd=${JSON.stringify(cwd)})
print(p.pid)
`;
  const pid = Number(execFileSync("/usr/bin/python3", ["-c", py, ...argv]).toString().trim());
  spawned.push(pid);
  const until = Date.now() + 5000;
  while (Date.now() < until && ppidOf(pid) !== 1) sleepMs(50);
  return pid;
}

/** A detached LAUNCHER (orphan python, cwd `cwd`) whose child is `argv`. Returns { launcher, child }. */
function detachedLauncher(argv, cwd) {
  const inner = `import subprocess, sys, time\nc = subprocess.Popen(sys.argv[1:])\nprint(c.pid, flush=True)\ntime.sleep(600)\n`;
  const out = tempDir("pw-launcher-out-");
  const py = `
import subprocess, sys
f = open(${JSON.stringify(join(out, "child"))}, "w")
p = subprocess.Popen(["/usr/bin/python3", "-c", ${JSON.stringify(inner)}] + sys.argv[1:], start_new_session=True,
                     stdin=subprocess.DEVNULL, stdout=f, stderr=subprocess.DEVNULL, cwd=${JSON.stringify(cwd)})
print(p.pid)
`;
  const launcher = Number(execFileSync("/usr/bin/python3", ["-c", py, ...argv]).toString().trim());
  spawned.push(launcher);
  let child = NaN;
  const until = Date.now() + 5000;
  while (Date.now() < until && !(child > 0)) {
    sleepMs(50);
    try {
      child = Number(readFileSync(join(out, "child"), "utf8").trim().split(/\s+/)[0]);
    } catch {
      /* not yet */
    }
  }
  spawned.push(child);
  return { launcher, child };
}

function ppidOf(pid) {
  const r = spawnSync("ps", ["-o", "ppid=", "-p", String(pid)], { encoding: "utf8" });
  return Number((r.stdout || "").trim());
}

/** A fake Playwright browsers dir holding a "browser" (a copy of /bin/sleep). */
function fakeBrowsersDir() {
  const dir = tempDir("pw-browsers-");
  const bin = join(dir, "chromium_headless_shell-0000", "chrome-headless-shell");
  mkdirSync(dirname(bin), { recursive: true });
  // A symlink to bash, not a copy: macOS kills a copied platform binary (code signature); ps shows the
  // path the process was started by, which is what the sweep matches on; and bash (unlike sleep)
  // accepts browser-like flags and keeps running with a child, like a browser with a renderer.
  symlinkSync("/bin/bash", bin);
  return { dir, bin };
}

/** argv of a fake browser that lives `sec` seconds and carries browser-like flags. */
const browserArgv = (bin, sec, ...flags) => [bin, "-c", `sleep ${sec}; :`, "chrome-headless-shell", ...flags];

// ── holds ────────────────────────────────────────────────────────────────────

test("a hold records the process that took it, and ends (logged) when that process exits", () => {
  const dir = tempDir("stale-holds-");
  const owner = orphan(["/bin/sleep", "600"]);
  const env = { MATRX_PREVIEW_SESSION: "runner-a", MATRX_PREVIEW_HOLD_OWNER_PID: String(owner) };
  assert.match(sourced(dir, "cmd_hold 30", env).out, new RegExp(`held for 30 min by runner-a, or sooner when pid ${owner} \\(sleep\\) exits`));
  const line = readFileSync(join(dir, "holds", "runner-a"), "utf8");
  assert.match(line, new RegExp(`owner=${owner} owner_start=\\S+`));
  sourced(dir, "prune_holds", env);
  assert.ok(existsSync(join(dir, "holds", "runner-a")), "a hold whose owner lives is kept");
  process.kill(owner, "SIGKILL");
  assert.ok(waitGone(owner));
  sourced(dir, "prune_holds", env);
  assert.ok(!existsSync(join(dir, "holds", "runner-a")), "the owner exited, so the hold is gone");
  assert.match(readFileSync(join(dir, "cleanup.log"), "utf8"), new RegExp(`hold runner-a ended: the process that took it \\(pid ${owner}\\) is gone`));
});

test("a hold whose owner pid now names a different process (pid reuse) ends", () => {
  const dir = tempDir("stale-holds-");
  const other = orphan(["/bin/sleep", "600"]);
  mkdirSync(join(dir, "holds"), { recursive: true });
  writeFileSync(join(dir, "holds", "runner-b"), `${now() + 1800} s-b owner=${other} owner_start=Mon_Jan_1_00:00:00_2001\n`);
  sourced(dir, "prune_holds");
  assert.ok(!existsSync(join(dir, "holds", "runner-b")));
  assert.match(readFileSync(join(dir, "cleanup.log"), "utf8"), /now belongs to another process/);
});

test("the hold finds its owner by itself: the nearest ancestor that is not a shell or package runner", () => {
  const dir = tempDir("stale-holds-");
  // node (this test) -> bash -c (transient) -> bash running the script: the owner is THIS node process.
  const r = spawnSync("bash", ["-c", `bash -c 'source "${SCRIPT}"; hold_owner'`], {
    env: { ...process.env, MATRX_PREVIEW_STATE_DIR: dir, MATRX_PREVIEW_HOLD_OWNER_PID: "" },
    encoding: "utf8",
  });
  assert.equal(Number(r.stdout.trim()), process.pid);
});

test("a hold whose host made no signed-in request for the published knob ends; without the knob it stays", () => {
  const dir = tempDir("stale-holds-");
  mkdirSync(join(dir, "holds"), { recursive: true });
  const quiet = join(dir, "holds", "quiet-runner");
  const busy = join(dir, "holds", "busy-runner");
  writeFileSync(quiet, `${now() + 3600} s-q\n`);
  writeFileSync(busy, `${now() + 3600} s-b\n`);
  const old = new Date(Date.now() - 25 * 60_000);
  utimesSync(quiet, old, old); // the walk cap touches the file on each signed-in request; none for 25 min
  sourced(dir, "prune_holds");
  assert.ok(existsSync(quiet), "no published hold_idle_expire_minutes: idle expiry is off");
  writeFileSync(join(dir, "walk-knobs"), "cap=4\nburst_cap=8\nhold_idle_expire_minutes=20\n");
  sourced(dir, "prune_holds");
  assert.ok(!existsSync(quiet), "quiet 25 min against a 20 min knob: ended");
  assert.ok(existsSync(busy), "a hold touched just now is kept");
  assert.match(readFileSync(join(dir, "cleanup.log"), "utf8"), /hold quiet-runner ended: its host made no signed-in request for 25 min \(limit 20 min/);
});

// ── orphaned browsers ────────────────────────────────────────────────────────

test("an orphaned Playwright browser is closed after its grace; one whose launcher lives is never touched", () => {
  const dir = tempDir("stale-browsers-");
  const { dir: pw, bin } = fakeBrowsersDir();
  const env = { MATRX_PLAYWRIGHT_BROWSERS_DIR: pw, MATRX_PREVIEW_ORPHAN_GRACE_SEC: "120" };
  const lost = orphan(browserArgv(bin, 601, "--headless"));
  assert.equal(ppidOf(lost), 1, "the fake browser is an orphan");
  // A browser whose launcher (a live python) still runs: its parent is not launchd.
  const kept = detachedLauncher(browserArgv(bin, 602), REPO_ROOT).child;
  // An orphan OUTSIDE the Playwright dir (someone's own process): never ours.
  const foreign = orphan(["/bin/sleep", "603"]);

  sourced(dir, "sweep_orphan_browsers", env);
  assert.ok(isAlive(lost), "inside the grace period the orphan is only recorded");
  assert.match(readFileSync(join(dir, "orphans.seen"), "utf8"), new RegExp(`^${lost} `, "m"));

  const out = sourced(dir, "sweep_orphan_browsers", { ...env, MATRX_PREVIEW_ORPHAN_GRACE_SEC: "0" }).out;
  assert.match(out, new RegExp(`Playwright browser pid ${lost}: its launcher is gone`));
  assert.ok(waitGone(lost), "the orphaned browser was closed");
  assert.ok(isAlive(kept), "a browser whose launcher lives is never touched");
  assert.ok(isAlive(foreign), "a process outside the Playwright dir is never touched");
  assert.match(readFileSync(join(dir, "cleanup.log"), "utf8"), new RegExp(`closed Playwright browser pid ${lost}`));
});

test("a dry run names the orphan and closes nothing", () => {
  const dir = tempDir("stale-browsers-");
  const { dir: pw, bin } = fakeBrowsersDir();
  const lost = orphan(browserArgv(bin, 604));
  const out = sourced(dir, "sweep_orphan_browsers --dry-run", { MATRX_PLAYWRIGHT_BROWSERS_DIR: pw, MATRX_PREVIEW_ORPHAN_GRACE_SEC: "0" }).out;
  assert.match(out, new RegExp(`Playwright browser pid ${lost}: its launcher is gone`));
  assert.ok(isAlive(lost));
  assert.ok(!existsSync(join(dir, "cleanup.log")), "a dry run logs no cleanup");
});

test("an orphaned browser with a client still on its debugging port is kept", () => {
  const dir = tempDir("stale-browsers-");
  const { dir: pw, bin } = fakeBrowsersDir();
  // A listener + a connected client in one helper process: an ESTABLISHED connection on that port.
  const py = `
import socket, os, sys, time
s = socket.socket(); s.bind(("127.0.0.1", 0)); s.listen(1)
port = s.getsockname()[1]
c = socket.create_connection(("127.0.0.1", port)); a, _ = s.accept()
child = os.fork()
if child:
    sys.stdout.write(f"{port} {child}\\n"); sys.stdout.flush(); os._exit(0)
if True:
    os.setsid()
    devnull = os.open(os.devnull, os.O_RDWR)
    for fd in (0, 1, 2):
        os.dup2(devnull, fd)
    time.sleep(600); os._exit(0)
`;
  const helperOut = spawnSync("/usr/bin/python3", ["-c", py], { encoding: "utf8" });
  const [port, helper] = helperOut.stdout.trim().split(/\s+/).map(Number);
  spawned.push(helper);
  assert.ok(port > 0);
  const attached = orphan(browserArgv(bin, 605, `--remote-debugging-port=${port}`));
  sourced(dir, "sweep_orphan_browsers", { MATRX_PLAYWRIGHT_BROWSERS_DIR: pw, MATRX_PREVIEW_ORPHAN_GRACE_SEC: "0" });
  assert.ok(isAlive(attached), "a CDP client is attached, so the browser stays");
});

test("a detached launcher from agent scratch, older than the longest hold, is closed with its browser", () => {
  const dir = tempDir("stale-browsers-");
  const { dir: pw, bin } = fakeBrowsersDir();
  const scratch = tempDir("agent-scratch-");
  const { launcher, child } = detachedLauncher(browserArgv(bin, 606), scratch);
  assert.equal(ppidOf(launcher), 1, "the launcher is detached from every session");
  assert.equal(ppidOf(child), launcher);
  const env = { MATRX_PLAYWRIGHT_BROWSERS_DIR: pw, MATRX_PREVIEW_ORPHAN_GRACE_SEC: "0" };
  sourced(dir, "sweep_orphan_browsers 10800", env);
  assert.ok(isAlive(launcher) && isAlive(child), "younger than 180 min: kept");
  const out = sourced(dir, "sweep_orphan_browsers 0", env).out;
  assert.match(out, new RegExp(`detached Playwright launcher pid ${launcher} .* and its browser pid ${child}`));
  assert.ok(waitGone(launcher) && waitGone(child));
});

test("a detached launcher outside scratch dirs (a long-lived service) is never closed", () => {
  const dir = tempDir("stale-browsers-");
  const { dir: pw, bin } = fakeBrowsersDir();
  const { launcher, child } = detachedLauncher(browserArgv(bin, 607), "/");
  sourced(dir, "sweep_orphan_browsers 0", { MATRX_PLAYWRIGHT_BROWSERS_DIR: pw, MATRX_PREVIEW_ORPHAN_GRACE_SEC: "0" });
  assert.ok(isAlive(launcher) && isAlive(child));
});

// ── memory ───────────────────────────────────────────────────────────────────

test("the memory reading is real and complete: available, total, pressure, swap, preview", () => {
  const dir = tempDir("stale-memory-");
  sourced(dir, `write_memory_snapshot ${30 * 1048576}`);
  const kv = Object.fromEntries(
    readFileSync(join(dir, "memory"), "utf8").trim().split("\n").map((l) => l.split("=")),
  );
  assert.ok(Math.abs(Number(kv.epoch) - now()) < 5);
  assert.ok(Number(kv.total_gb) > 1);
  assert.ok(Number(kv.available_gb) > 0 && Number(kv.available_gb) <= Number(kv.total_gb));
  assert.ok(Number(kv.free_gb) <= Number(kv.available_gb));
  assert.ok([1, 2, 4].includes(Number(kv.pressure)), `pressure level ${kv.pressure}`);
  assert.ok(Number(kv.swap_used_gb) >= 0);
  assert.equal(kv.preview_gb, "30.0");
});

test("the watchdog writes the memory reading and names itself while it watches a server", () => {
  const dir = tempDir("stale-monitor-");
  const fake = orphan(["/bin/sleep", "600"]);
  const env = { ...process.env, MATRX_PREVIEW_STATE_DIR: dir, MATRX_PREVIEW_START_CMD: "true", MATRX_PREVIEW_MEMORY_SOURCE: "rss" };
  const mon = spawnSync("bash", ["-c", `( "${SCRIPT}" monitor ${fake} </dev/null >/dev/null 2>&1 & echo $! ) ; sleep 4`], { env, encoding: "utf8" });
  const monPid = Number(mon.stdout.trim().split("\n")[0]);
  spawned.push(monPid);
  assert.ok(existsSync(join(dir, "memory")), "memory written on the first tick");
  assert.match(readFileSync(join(dir, "shared-next-dev.monitor"), "utf8"), new RegExp(`^${monPid} 2 ${fake}$`, "m"));
  process.kill(fake, "SIGKILL");
  assert.ok(waitGone(monPid, 8000), "the watchdog ends with its server");
});

test("status prints the machine, the walks the walk cap published, and the cleanups", () => {
  const dir = tempDir("stale-status-");
  const fake = orphan(["/bin/sleep", "600"]);
  writeFileSync(
    join(dir, "shared-next-dev.meta"),
    `SESSION_ID=shared-next-dev\nPORT=1\nPID=${fake}\nDISTDIR=.next-preview\nROOT=/elsewhere\nOWNER_SESSION=s\nMODE=live\n`,
  );
  writeFileSync(join(dir, "shared-next-dev.log"), "");
  writeFileSync(
    join(dir, "walks.json"),
    JSON.stringify({
      cap: 4,
      burstCap: 8,
      memory: { state: "headroom", why: "120 GB of memory is free and the preview uses 20 GB" },
      active: [
        { host: "a.localhost:3001", tier: "base", lastPageSec: 5, lastRequestSec: 2, held: true },
        { host: "e.localhost:3001", tier: "burst", lastPageSec: 70, lastRequestSec: 65, held: false },
      ],
      paused: 3,
    }),
  );
  writeFileSync(join(dir, "cleanup.log"), `${new Date().toISOString().slice(0, 19)}-0700 hold x ended: test\n`);
  const out = sourced(dir, "cmd_status", { MATRX_PREVIEW_MEMORY_SOURCE: "rss" }).out;
  assert.match(out, /machine: [\d.]+ GB free of [\d.]+ GB, memory pressure (normal|WARNING|CRITICAL), swap [\d.]+ GB used/);
  assert.match(out, /walks: 2 signed in against the live database \(normal cap 4, up to 8 while memory is spare; 1 in extra slots\); 3 paused/);
  assert.match(out, /extra slots OPEN: 120 GB of memory is free/);
  assert.match(out, /e\.localhost:3001 \(burst\) last page 1m ago/);
  assert.match(out, /watchdog: an OLDER watchdog \(or none\)/);
  assert.match(out, /cleanups in the last 24 h: 1/);
});
