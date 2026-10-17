// scripts/preview-recycle.test.mjs
//
// OLD NEVER BLOCKS NEW (Arman, 2026-09-29: "sessions will leave them open and
// running — we need to allow new ones and kill old ones"). An abandoned shared
// preview grew to 50 GB of REAL memory in 2 h while `ps` RSS showed ~3 GB, and
// the only stop was a 192 GB RSS cap. These tests pin the stop decision, the
// "last used" clock, the monitor's idle stop, and preview:start's takeover —
// with fake processes and fake logs only. No Next server is ever started, and
// the real shared previews are never touched (every test gets its own state dir).
//
//   node --test scripts/preview-recycle.test.mjs
//
// MATRX_PREVIEW_SCRIPT_UNDER_TEST points the suite at another copy of the
// script (it must live in scripts/) — how the fail-before proof was run.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = process.env.MATRX_PREVIEW_SCRIPT_UNDER_TEST
  ? resolve(process.env.MATRX_PREVIEW_SCRIPT_UNDER_TEST)
  : join(REPO_ROOT, "scripts/agent-dev-server.sh");

const fakes = [];
after(() => {
  for (const pid of fakes) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      /* already gone */
    }
  }
});

/** A fake "server": `sleep` in its own session, orphaned so init reaps it (no zombie). */
function fakeServer() {
  const pid = Number(
    execFileSync("/usr/bin/python3", [
      "-c",
      "import subprocess; D=subprocess.DEVNULL; print(subprocess.Popen(['sleep','600'], start_new_session=True, stdin=D, stdout=D, stderr=D).pid)",
    ])
      .toString()
      .trim(),
  );
  fakes.push(pid);
  return pid;
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const now = () => Math.floor(Date.now() / 1000);

function stateDir() {
  return mkdtempSync(join(tmpdir(), "preview-recycle-test-"));
}

/** Source the script in a fresh state dir and run `body`; returns { out (stdout+stderr), code }. */
function sourced(dir, body, env = {}) {
  const res = spawnSync("bash", ["-c", `source "${SCRIPT}"; ${body}`], {
    env: { ...process.env, MATRX_PREVIEW_STATE_DIR: dir, ...env },
    encoding: "utf8",
  });
  return { out: `${res.stdout ?? ""}${res.stderr ?? ""}`, code: res.status ?? 1 };
}

function writeLease(dir, { pid, usedAgoSec, root = "/some/other/checkout", port = 1, ready = true, touched = true }) {
  writeFileSync(
    join(dir, "shared-next-dev.meta"),
    `SESSION_ID=shared-next-dev\nPORT=${port}\nPID=${pid}\nDISTDIR=.next-preview\nROOT=${root}\nOWNER_SESSION=old-session\nMODE=live\n`,
  );
  writeFileSync(join(dir, "shared-next-dev.log"), " GET /old 200 in 5ms\n");
  if (usedAgoSec !== undefined) writeFileSync(join(dir, "shared-next-dev.used"), `${now() - usedAgoSec}\n`);
  if (ready) writeFileSync(join(dir, "shared-next-dev.ready"), "");
  if (touched) writeFileSync(join(dir, "shared-next-dev.touched"), "");
}

/** A hold file, as `agent-dev-server.sh hold` writes it. */
function writeHold(dir, label = "some-runner", minutes = 30) {
  mkdirSync(join(dir, "holds"), { recursive: true });
  writeFileSync(join(dir, "holds", label), `${now() + minutes * 60} runner-session\n`);
}

const GB = 1048576; // KB

// ── the stop decision ────────────────────────────────────────────────────────

function sourcedReason(body, env) {
  const dir = stateDir();
  try {
    return sourced(dir, body, env).out;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function reason(kb, idleSec, env) {
  const dir = stateDir();
  try {
    return sourced(dir, `preview_stop_reason ${kb} ${idleSec} footprint`, env).out;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("recycles a used preview nobody touched for 30 min once it is past keep-small, worded as a recycle", () => {
  const out = reason(20 * GB, 31 * 60);
  assert.match(out, /^RECYCLED: recycled after 31 min unused/);
  assert.match(out, /a fresh one starts and warms at once/);
});

// KEEP-ALIVE (2026-10-15): a small idle server is no hog — stopping it only handed the next
// test runner no listener and a cold compile.
test("keeps a small idle preview running however long it sits", () => {
  assert.equal(reason(1 * GB, 300 * 60), "");
  assert.equal(reason(15 * GB, 31 * 60), "");
});

test("a HOLD (a test run) blocks every idle stop and recycle — only the hard cap (raised to 64 GB) still fires", () => {
  const held = (kb, idleSec) => sourcedReason(`preview_stop_reason ${kb} ${idleSec} footprint 1 1`);
  // Unheld, 50 GB is past the 48 GB cap.
  assert.match(sourcedReason(`preview_stop_reason ${50 * GB} 0 footprint 0 1`), /\(cap 48 GB\)/);
  assert.equal(held(44 * GB, 60 * 60), "");
  assert.equal(held(30 * GB, 60 * 60), "");
  // MKT-176: a hold gives NO headroom; the 48 GB cap acts at once and says so.
  assert.match(held(50 * GB, 0), /^preview restarted at 50\.0 GB real memory \(cap 48 GB, stopped even though a test run holds it\)/);
  assert.match(held(Math.round(58.8 * GB), 0), /cap 48 GB/);
});

test("a server nobody used since its own start is never recycled for idleness (no restart loop)", () => {
  const fresh = (kb, idleSec) => sourcedReason(`preview_stop_reason ${kb} ${idleSec} footprint 0 0`);
  assert.equal(fresh(44 * GB, 60 * 60), "");
  assert.match(fresh(50 * GB, 0), /^preview restarted at 50\.0 GB/);
});

test("recycles a bloated preview once idle 5 min", () => {
  const out = reason(44 * GB, 6 * 60);
  assert.match(out, /^RECYCLED: recycled at 44\.0 GB real memory after 6 min idle/);
});

test("never recycles a bloated preview that is in use", () => {
  assert.equal(reason(44 * GB, 60), "");
});

test("leaves a small idle-for-10-min preview alone", () => {
  assert.equal(reason(10 * GB, 10 * 60), "");
});

test("hard cap is 48 GB of real memory, and is a watchdog restart, not a recycle", () => {
  const out = reason(50 * GB, 0);
  assert.match(out, /^preview restarted at 50\.0 GB real memory \(cap 48 GB\)/);
  assert.equal(reason(47 * GB, 0), "");
});

test("the idle limits are knobs", () => {
  assert.match(reason(20 * GB, 11 * 60, { MATRX_PREVIEW_IDLE_STOP_MIN: "10" }), /recycled after 11 min unused/);
  assert.match(reason(5 * GB, 31 * 60, { MATRX_PREVIEW_KEEP_SMALL_GB: "4" }), /recycled after 31 min unused/);
  assert.equal(reason(44 * GB, 6 * 60, { MATRX_PREVIEW_RECYCLE_GB: "60" }), "");
});

// ── real memory ──────────────────────────────────────────────────────────────

test("measures real memory (phys_footprint) on macOS, RSS only as an announced fallback", () => {
  const dir = stateDir();
  const pid = fakeServer();
  try {
    const out = sourced(dir, `real_memory_kb ${pid}`).out.trim();
    const expected = process.platform === "darwin" ? "footprint" : "rss";
    assert.match(out, new RegExp(`^[0-9]+ ${expected}$`));
    assert.match(sourced(dir, `real_memory_kb ${pid}`, { MATRX_PREVIEW_MEMORY_SOURCE: "rss" }).out.trim(), /^[0-9]+ rss$/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── the "last used" clock ────────────────────────────────────────────────────

test("only an HTTP request line counts as use — compile output does not", () => {
  const dir = stateDir();
  try {
    const log = join(dir, "shared-next-dev.log");
    const used = join(dir, "shared-next-dev.used");
    writeFileSync(log, " GET /before-monitor 200 in 5ms\n");
    const scan = (line) =>
      sourced(
        dir,
        `SCAN_OFFSET=$(stat_fmt %s %z "$LOG"); printf '%s\\n' ${JSON.stringify(line)} >>"$LOG"; note_requests`,
      );
    scan(" ✓ Compiled /notes in 3.2s");
    assert.ok(!existsSync(used), "compile output is not use");
    scan(" GET /notes 200 in 82ms (next.js: 1ms, application-code: 80ms)");
    assert.ok(existsSync(used), "a request line is use");
    assert.ok(Math.abs(Number(readFileSync(used, "utf8")) - now()) <= 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── the monitor stops an abandoned preview, loudly ───────────────────────────

test("the monitor recycles a used preview unused for 30 min, says so, and starts a fresh one", () => {
  const dir = stateDir();
  const pid = fakeServer();
  const marker = join(dir, "restart-ran");
  try {
    writeLease(dir, { pid, usedAgoSec: 31 * 60, root: REPO_ROOT, port: 3001 });
    execFileSync("bash", [SCRIPT, "monitor", String(pid), "--live"], {
      env: {
        ...process.env,
        MATRX_PREVIEW_STATE_DIR: dir,
        MATRX_PREVIEW_KEEP_SMALL_GB: "0",
        MATRX_PREVIEW_START_CMD: `touch '${marker}'`,
      },
      stdio: "pipe",
      timeout: 20000,
    });
    assert.ok(!isAlive(pid), "the abandoned server must be stopped");
    assert.ok(existsSync(marker), "KEEP-ALIVE: a fresh preview must be started");
    const failed = readFileSync(join(dir, "shared-next-dev.failed"), "utf8");
    assert.match(failed, /^RECYCLED: recycled after 31 min unused/);
    const log = readFileSync(join(dir, "shared-next-dev.log"), "utf8");
    assert.match(log, /\[preview\] RECYCLED: recycled after 31 min unused/);
    assert.match(log, /KEEP-ALIVE: starting a fresh preview/);
    // Isolated from any real server running on this machine: only the lease in `dir` counts.
    const status = sourced(dir, "running_server() { :; }; cmd_status_one").out;
    assert.match(status, /recycled \(normal\)/);
    assert.doesNotMatch(status, /WATCHDOG STOPPED/, "a recycle must not print as a crash");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the monitor restarts a preview that died on its own, and names the last error", async () => {
  const dir = stateDir();
  const pid = fakeServer();
  const marker = join(dir, "restart-ran");
  try {
    writeLease(dir, { pid, usedAgoSec: 0, root: REPO_ROOT, port: 3001 });
    writeFileSync(join(dir, "shared-next-dev.log"), "Error: read ECONNRESET\n");
    const monitor = spawn("bash", [SCRIPT, "monitor", String(pid), "--live"], {
      env: { ...process.env, MATRX_PREVIEW_STATE_DIR: dir, MATRX_PREVIEW_START_CMD: `touch '${marker}'` },
      stdio: "ignore",
    });
    const exited = new Promise((r) => monitor.on("exit", r));
    await new Promise((r) => setTimeout(r, 2500));
    process.kill(pid, "SIGKILL");
    await Promise.race([exited, new Promise((r) => setTimeout(r, 10000))]);
    assert.ok(existsSync(marker), "a dead preview must be restarted");
    assert.match(readFileSync(join(dir, "shared-next-dev.failed"), "utf8"), /died on its own \(last error: Error: read ECONNRESET\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a deliberate stop by another process is never read as a crash: no restart, no 'died on its own'", async () => {
  const dir = stateDir();
  const pid = fakeServer();
  const marker = join(dir, "restart-ran");
  try {
    writeLease(dir, { pid, usedAgoSec: 0, root: REPO_ROOT, port: 3001 });
    const monitor = spawn("bash", [SCRIPT, "monitor", String(pid), "--live"], {
      env: { ...process.env, MATRX_PREVIEW_STATE_DIR: dir, MATRX_PREVIEW_START_CMD: `touch '${marker}'` },
      stdio: "ignore",
    });
    const exited = new Promise((r) => monitor.on("exit", r));
    await new Promise((r) => setTimeout(r, 2500));
    sourced(dir, `stop_for_limit ${pid} "RECYCLED: replaced by a new pnpm preview:start (test)"`);
    await Promise.race([exited, new Promise((r) => setTimeout(r, 10000))]);
    assert.ok(!existsSync(marker), "the server's own monitor must not restart a deliberate stop");
    assert.doesNotMatch(readFileSync(join(dir, "shared-next-dev.failed"), "utf8"), /died on its own/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("stopping an OLD server never deletes the lease a NEWER server already wrote (2026-10-16 UNMANAGED)", () => {
  const dir = stateDir();
  const oldPid = fakeServer();
  const newPid = fakeServer();
  try {
    writeLease(dir, { pid: newPid, usedAgoSec: 0, root: REPO_ROOT, port: 3001 });
    sourced(dir, `stop_for_limit ${oldPid} "preview restarted at 49 GB (cap 48 GB)"`);
    assert.ok(!isAlive(oldPid), "the old server is stopped");
    assert.match(readFileSync(join(dir, "shared-next-dev.meta"), "utf8"), new RegExp(`PID=${newPid}`), "the newer server keeps its lease");
    assert.ok(existsSync(join(dir, "shared-next-dev.ready")), "and its ready marker");
    assert.ok(isAlive(newPid));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an install that leaves the server failing to resolve @ai-matrx code is not deferred for holds", () => {
  const dir = stateDir();
  try {
    const log = join(dir, "shared-next-dev.log");
    writeFileSync(log, "Module not found: Can't resolve '@ai-matrx/old/before-the-install'\n");
    const offset = readFileSync(log).length;
    const check = (extra) => {
      writeFileSync(log, "Module not found: Can't resolve '@ai-matrx/old/before-the-install'\n" + extra);
      return sourced(dir, `NM_PENDING_LOG_OFFSET=${offset}; stale_graph_failing; echo rc=$?`).out;
    };
    assert.match(check(" GET /notes 200 in 2s\n"), /rc=1/, "errors from before the install do not count");
    assert.match(check("Module not found: Can't resolve '@ai-matrx/chat/agents/redux/execution-system/utils/page-leaving'\n"), /rc=0/);
    assert.match(check("Error: Export pageIsLeaving doesn't exist in target module\n"), /rc=0/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("past the restart budget the watchdog stops restarting and says CRASH LOOP", () => {
  const dir = stateDir();
  const marker = join(dir, "restart-ran");
  try {
    writeFileSync(join(dir, "shared-next-dev.restarts"), `${now() - 60}\n${now() - 30}\n${now() - 10}\n`);
    const r = sourced(dir, "restart_after_stop 'it died'; echo rc=$?", { MATRX_PREVIEW_START_CMD: `touch '${marker}'` });
    assert.match(r.out, /rc=1/);
    assert.ok(!existsSync(marker), "no restart past the budget");
    assert.match(readFileSync(join(dir, "shared-next-dev.failed"), "utf8"), /^CRASH LOOP: 3 restarts in the last 15 min/);
    // Old restarts fall out of the window.
    writeFileSync(join(dir, "shared-next-dev.restarts"), `${now() - 3600}\n${now() - 3000}\n${now() - 2000}\n`);
    assert.match(sourced(dir, "restart_after_stop 'it died'; echo rc=$?", { MATRX_PREVIEW_START_CMD: `touch '${marker}'` }).out, /rc=0/);
    assert.ok(existsSync(marker));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an install restart is deliberate: it never counts toward the crash-loop budget", () => {
  const dir = stateDir();
  const marker = join(dir, "restart-ran");
  try {
    writeFileSync(join(dir, "shared-next-dev.restarts"), `${now() - 60}\n${now() - 30}\n${now() - 10}\n`);
    const r = sourced(dir, "restart_after_stop 'packages were installed' 0; echo rc=$?", { MATRX_PREVIEW_START_CMD: `touch '${marker}'` });
    assert.match(r.out, /rc=0/);
    assert.ok(existsSync(marker), "a budget full of crashes must not block an install restart");
    assert.equal(readFileSync(join(dir, "shared-next-dev.restarts"), "utf8").trim().split("\n").length, 3, "and it adds nothing to the budget");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// THE START LOCK (2026-10-15): a start that spent >10 s deleting a big cache had its lock taken by a
// second start, whose next dev boot wiped the running server's build folder (every page 500).
test("a start lock whose holder is alive is waited for, never taken after 10 s", async () => {
  const dir = stateDir();
  const holder = fakeServer();
  try {
    mkdirSync(join(dir, "shared-next-dev.lock"));
    writeFileSync(join(dir, "shared-next-dev.lock", "pid"), `${holder}\n`);
    const child = spawn("bash", ["-c", `source "${SCRIPT}"; acquire_start_lock; echo rc=$?`], {
      env: { ...process.env, MATRX_PREVIEW_STATE_DIR: dir },
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    await new Promise((r) => setTimeout(r, 12000));
    assert.equal(out, "", "still waiting on a live holder after 12 s");
    process.kill(holder, "SIGKILL");
    await new Promise((r) => child.on("exit", r));
    assert.match(out, /rc=0/, "takes the lock once its holder is gone");
    assert.equal(readFileSync(join(dir, "shared-next-dev.lock", "pid"), "utf8").trim(), String(child.pid));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a start lock whose holder is dead is taken at once", () => {
  const dir = stateDir();
  try {
    mkdirSync(join(dir, "shared-next-dev.lock"));
    writeFileSync(join(dir, "shared-next-dev.lock", "pid"), "999999\n");
    const t0 = Date.now();
    assert.match(sourced(dir, "acquire_start_lock; echo rc=$?").out, /rc=0/);
    assert.ok(Date.now() - t0 < 5000);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("hold writes a dated hold that status lists, release removes it, and an expired one is dropped", () => {
  const dir = stateDir();
  try {
    const env = { MATRX_PREVIEW_SESSION: "runner-a" };
    assert.match(sourced(dir, "cmd_hold 20", env).out, /held for 20 min by runner-a/);
    assert.match(sourced(dir, "active_holds", env).out, /^runner-a 20$/m);
    sourced(dir, "cmd_release", env);
    assert.equal(sourced(dir, "active_holds", env).out, "");
    mkdirSync(join(dir, "holds"), { recursive: true });
    writeFileSync(join(dir, "holds", "old"), `${now() - 5} gone\n`);
    assert.equal(sourced(dir, "active_holds", env).out, "");
    assert.ok(!existsSync(join(dir, "holds", "old")), "expired holds are removed on read");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the monitor leaves a recently used preview running", async () => {
  const dir = stateDir();
  const pid = fakeServer();
  try {
    writeLease(dir, { pid, usedAgoSec: 0, root: REPO_ROOT, port: 3001 });
    const monitor = spawn("bash", [SCRIPT, "monitor", String(pid), "--live"], {
      env: { ...process.env, MATRX_PREVIEW_STATE_DIR: dir },
      stdio: "ignore",
    });
    await new Promise((r) => setTimeout(r, 5000));
    monitor.kill("SIGKILL");
    assert.ok(isAlive(pid), "a busy preview must never be stopped");
    assert.ok(!existsSync(join(dir, "shared-next-dev.failed")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── preview:start takes over from an old preview instead of refusing ────────

function takeover(lease, env, { hold = false } = {}) {
  const dir = stateDir();
  const pid = fakeServer();
  writeLease(dir, { pid, ...lease });
  if (hold) writeHold(dir);
  const res = sourced(dir, "retire_stale_preview; echo rc=$?", env);
  const result = {
    out: res.out,
    alive: isAlive(pid),
    leaseKept: existsSync(join(dir, "shared-next-dev.meta")),
    failed: existsSync(join(dir, "shared-next-dev.failed"))
      ? readFileSync(join(dir, "shared-next-dev.failed"), "utf8")
      : "",
  };
  rmSync(dir, { recursive: true, force: true });
  return result;
}

test("start stops another checkout's preview idle 6 min and starts fresh", () => {
  const r = takeover({ usedAgoSec: 6 * 60 });
  assert.ok(!r.alive, "the idle preview must be stopped");
  assert.ok(!r.leaseKept, "its lease must be released so the new start proceeds");
  assert.match(r.out, /rc=0/);
  assert.match(r.failed, /^RECYCLED: replaced by a new pnpm preview:start .* unused for 6 min/);
});

test("start stops a preview that stopped answering once it has been idle past the busy guard", () => {
  const r = takeover({ usedAgoSec: 3 * 60, port: 1, ready: true });
  assert.ok(!r.alive);
  assert.match(r.failed, /not answering on port 1/);
});

test("start never takes over a HELD preview (a test run sitting on one page for minutes)", () => {
  const r = takeover({ usedAgoSec: 20 * 60, port: 1, ready: true }, {}, { hold: true });
  assert.ok(r.alive, "a held preview is a run in progress");
  assert.match(r.out, /rc=1/);
});

test("start reuses a healthy, small, idle preview of this same checkout instead of restarting it", () => {
  const r = takeover({ usedAgoSec: 20 * 60, root: REPO_ROOT, port: 1, ready: false });
  assert.ok(r.alive, "restarting a healthy server only hands the caller a cold compile");
  assert.match(r.out, /rc=1/);
});

test("start never kills a preview that served a request in the last few minutes", () => {
  const r = takeover({ usedAgoSec: 30, port: 1, ready: true });
  assert.ok(r.alive, "busy preview must be reused, not killed — even when its probe fails");
  assert.ok(r.leaseKept);
  assert.match(r.out, /rc=1/);
});

test("start leaves a still-compiling (never ready) preview alone", () => {
  const r = takeover({ usedAgoSec: 3 * 60, port: 1, ready: false });
  assert.ok(r.alive);
  assert.ok(r.leaseKept);
});

test("cmd_start runs the takeover before reuse", () => {
  const src = readFileSync(SCRIPT, "utf8");
  const start = src.slice(src.indexOf("cmd_start() {"));
  const retire = start.indexOf("retire_stale_preview");
  const reuse = start.indexOf("reuse_managed_meta && return 0");
  assert.ok(retire > 0 && retire < reuse, "cmd_start must retire a stale preview before reusing or refusing");
});

// ── the next start words a recycle as normal ─────────────────────────────────

test("report_previous_failure words a recycle as normal and a watchdog stop as a crash", () => {
  const dir = stateDir();
  try {
    writeFileSync(join(dir, "shared-next-dev.failed"), "RECYCLED: stopped after 30 min unused\n");
    const recycled = sourced(dir, "report_previous_failure").out;
    assert.match(recycled, /recycled \(normal\): stopped after 30 min unused/);
    assert.doesNotMatch(recycled, /WATCHDOG/);
    writeFileSync(join(dir, "shared-next-dev.failed"), "preview stopped at 130 GB real memory (cap 128 GB)\n");
    assert.match(sourced(dir, "report_previous_failure").out, /WATCHDOG STOPPED THE PREVIOUS PREVIEW/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── the mode switch and open pages ───────────────────────────────────────────
// 2026-10-02: a 20-minute agent turn logs nothing on :3001 (the stream runs to the agent
// server), so "idle 5 min" was true while a page was open; the switch flipped live→clone
// under it, the clone refused the live token (PGRST301) and the person was signed out.

function modeSwitch({ usedAgoSec, openConnections }) {
  const dir = stateDir();
  const pid = fakeServer();
  writeLease(dir, { pid, usedAgoSec, root: REPO_ROOT, port: 1 });
  const res = sourced(
    dir,
    "MODE_EXPLICIT=1; REQUESTED_MODE=clone; SESSION_RAW=test; switch_mode_if_idle; echo rc=$?",
    { MATRX_PREVIEW_OPEN_CONNECTIONS_OVERRIDE: String(openConnections) },
  );
  const result = { out: res.out, code: res.code, alive: isAlive(pid) };
  rmSync(dir, { recursive: true, force: true });
  return result;
}

test("mode switch refuses while a page is still open, even when no request was logged for 6 min", () => {
  const r = modeSwitch({ usedAgoSec: 6 * 60, openConnections: 2 });
  assert.ok(r.alive, "the server with open pages must keep running");
  assert.match(r.out, /2 page\(s\) are still open/);
  assert.notEqual(r.code, 0);
});

test("mode switch proceeds when idle 6 min and no page is open", () => {
  const r = modeSwitch({ usedAgoSec: 6 * 60, openConnections: 0 });
  assert.ok(!r.alive, "an idle server with no open page is stopped for the requested mode");
  assert.match(r.out, /switched to clone mode/);
});

test("mode switch refuses a server that served a request 1 min ago", () => {
  const r = modeSwitch({ usedAgoSec: 60, openConnections: 0 });
  assert.ok(r.alive);
  assert.match(r.out, /in use/);
});
