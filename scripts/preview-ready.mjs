#!/usr/bin/env node
// scripts/preview-ready.mjs — `pnpm preview:ready [route] [--hold <min>] [--member] [--no-repair]`
//
// THE ONE PREFLIGHT for anything that tests in the browser against the shared localhost preview.
// It says READY only when YOUR session's page really loads signed in, and it repairs what it can on
// the way. Built 2026-10-15 after three real-test runs in one day died for environment reasons and
// none for the product: a preview stopped while unused (no listener, 73 s cold compile inside a
// 30 s browser timeout), a stale install showed `Export GmailMark doesn't exist in target module`
// on every page, and an agent at load 178 did not dare restart a broken server.
//
// What it does, in order (each step prints one line):
//   1. machine  — load and free memory, said plainly; never a reason to give up, only to wait longer
//   2. server   — not running: starts it. Lease held by another checkout: NOT READY, says whose.
//   3. hold     — takes a hold for this session (default 45 min): the watchdog will not recycle the
//                 server, and another session's preview:start will not replace it, while you test
//   4. listener — waits until port 3001 answers at all
//   5. sign-in  — mints a single-use dev-login nonce on YOUR hostname and loads the route through it
//                 with a cookie jar, the way the browser will; waits through cold compiles
//   6. verdict  — 200 on the route itself (not /login), no build-error page. On a build error it
//                 tells the two cases apart:
//                   STALE SERVER — the installed package DOES export the name: the server is serving
//                                  a module graph from before an install. Restarted, re-checked.
//                   CODE         — the import really is ahead of the installed package, or a file is
//                                  broken: names the file and whether it is someone's uncommitted
//                                  edit or a commit (hash, author). Not a product defect of the
//                                  page under test; not fixable by restarting.
//   6b. warm    — `--warm /a,/b`: loads every other route the run will visit, signed in, so the
//                 browser never sits on a minutes-long first compile (the census's top cost:
//                 "navigate timed out after 300s" and "pane is currently hidden" timeouts were
//                 the page waiting on a cold compile, not a crash)
//   7. browser  — prints a FRESH sign-in URL for the browser pane, the lane-lock holder, and one
//                 line of JavaScript to run in the page to confirm it there too.
//
// Exit 0 = READY (last line starts "READY"); exit 1 = NOT READY (last line says why).
// Safe to run any time, from any number of sessions: it never stops a healthy server, and a
// restart only happens for a dead or provably stale one (CLAUDE.md: "everyone blips, that is fine").

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatDurationMs, formatDurationSeconds } from "@ai-matrx/kit/format";
import { browserStability } from "./lib/preview-browser-stability.mjs";
import { diagnoseBuildError, verdictOf } from "./lib/preview-ready-judge.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SERVER = join(ROOT, "scripts", "agent-dev-server.sh");
const PORT = 3001;
const LANE_LOCK = "/tmp/matrx-browser-lane.lock";
const AGENT_HEADER = { "X-Matrx-Agent-Traffic": "preview-ready" };

// ── args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let route = "/dashboard";
let holdMin = 45;
let member = false;
let repair = true;
let budgetSec = 0; // 0 = scale with load
let warm = [];
let browserCheck = true;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--hold") holdMin = Number(args[++i]);
  else if (a === "--member") member = true;
  else if (a === "--no-repair") repair = false;
  else if (a === "--no-browser-check") browserCheck = false;
  else if (a === "--timeout") budgetSec = Number(args[++i]);
  else if (a === "--warm") warm = String(args[++i] ?? "").split(",").map((r) => r.trim()).filter((r) => r.startsWith("/"));
  else if (a === "-h" || a === "--help") {
    console.log("pnpm preview:ready [route=/dashboard] [--warm /a,/b] [--hold <min>=45] [--member] [--no-repair] [--timeout <sec>]");
    process.exit(0);
  } else if (a.startsWith("/")) route = a;
  else {
    console.error(`[ready] unknown argument: ${a}`);
    process.exit(2);
  }
}
if (!Number.isFinite(holdMin) || holdMin < 0) holdMin = 45;

const started = Date.now();
const secs = () => ((Date.now() - started) / 1000).toFixed(0);
const say = (msg) => console.log(`[ready] ${msg}`);
function notReady(why, extra = []) {
  for (const line of extra) say(line);
  console.log(`NOT READY: ${why}`);
  process.exit(1);
}

function sh(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, encoding: "utf8", env: process.env, ...opts });
  return { out: `${r.stdout ?? ""}${r.stderr ?? ""}`, code: r.status ?? 1 };
}
const server = (...a) => sh("bash", [SERVER, ...a]);

// The session hostname, exactly as preview:start / dev-login derive it.
const HOST = sh("bash", [
  "-c",
  `source scripts/agent-harness/preview-session.sh; source scripts/agent-harness/shared-servers.sh; shared_server_host "$(preview_session_label "${ROOT}")"`,
]).out.trim();
if (!/^[a-z0-9.-]+\.localhost$/i.test(HOST)) notReady(`could not work out this session's hostname (got "${HOST}")`);

// ── 1. machine ───────────────────────────────────────────────────────────────
const cores = os.cpus().length;
const load = os.loadavg()[0];
const freePct = Number(sh("bash", ["-c", "memory_pressure 2>/dev/null | awk '/free percentage/{gsub(\"%\",\"\",$NF); print $NF}'"]).out.trim()) || null;
const overload = load / cores;
if (!budgetSec) budgetSec = overload > 3 ? 900 : overload > 1.5 ? 600 : 360;
say(
  `machine: load ${load.toFixed(0)} on ${cores} cores${freePct != null ? `, ${freePct}% memory free` : ""}` +
    (overload > 3 ? " — overloaded by other work; pages compile slowly, waiting up to " + formatDurationSeconds(budgetSec, { style: "coarse" }) : ""),
);

// ── 2. server ────────────────────────────────────────────────────────────────
function status() {
  const s = server("status").out;
  const m = s.match(/RUNNING mode=(\S+) pid=(\d+) port=(\d+) memory=([\d.]+) GB [^\n]*last-used=(\d+) min ago owner=(\S+)/);
  return {
    text: s,
    running: Boolean(m),
    pid: m ? Number(m[2]) : null,
    memGb: m ? Number(m[4]) : null,
    owner: m ? m[6] : null,
    ready: /ready: yes/.test(s),
    nmMoved: /node_modules changed under this running server/.test(s),
    crashLoop: /CRASH LOOP/.test(s),
    unmanaged: /UNMANAGED\/BLOCKING/.test(s),
  };
}

let st = status();
if (st.crashLoop && !st.running) {
  notReady("the preview keeps dying on boot (CRASH LOOP) — that is a code or install defect, not this run's fault", [
    ...st.text.split("\n").filter((l) => /CRASH LOOP|WATCHDOG/.test(l)).slice(0, 3),
    `read the end of the preview log: ${logPath()}`,
  ]);
}
if (st.unmanaged) notReady("an unmanaged dev server holds the one slot", [st.text.trim()]);
if (st.running && st.owner !== ROOT) {
  notReady(`the one preview serves another checkout (${st.owner}); test from the shared main checkout`);
}
if (!st.running) {
  if (!repair) notReady("no preview is running (re-run without --no-repair to start it)");
  say("server: not running — starting the shared preview");
  const s = server("start");
  if (s.code !== 0) notReady("preview:start failed", s.out.trim().split("\n").slice(-5));
  st = status();
} else {
  say(`server: running (pid ${st.pid}, ${st.memGb} GB real memory${st.ready ? "" : ", still warming"})`);
}

// node_modules moved under a live server: the watchdog restarts it once the install settles, after
// any held run. Do it now only when no OTHER session holds the server — a restart under someone's run
// is the very thing holds exist to stop. Otherwise go on: the page check below still restarts if the
// stale code really breaks this page (STALE SERVER).
function otherHoldsNow(text = status().text) {
  return (text.match(/holds: ([^\n]*?)\s{3}ready:/)?.[1] || "")
    .split(", ")
    .map((h) => h.split(" (")[0].trim())
    .filter((h) => h && h !== "none" && `${h}.localhost` !== HOST);
}
const otherHolds = otherHoldsNow(st.text);
if (st.nmMoved && repair) {
  if (otherHolds.length) {
    say(`server: packages were installed under it; another run holds it (${otherHolds.join(", ")}), so it restarts after that run — this check goes on`);
  } else {
    say("server: packages were installed under the running server — restarting it now so it serves what is on disk");
    restartServer();
  }
}

// ── 2b. an install running in this checkout ─────────────────────────────────
// A pnpm install relinks node_modules under the live server: while it runs, pages render whole
// packages as "not installed" placeholders (seen 2026-10-15 mid-run). Wait for it to finish; the
// watchdog (or the stale check below) restarts the server onto what it installed.
function installsRunning() {
  const pids = sh("pgrep", ["-f", "pnpm (install|add|update|up|remove|i)( |$)"]).out.trim().split(/\s+/).filter(Boolean);
  return pids.filter((pid) => {
    const cwd = sh("lsof", ["-a", "-p", pid, "-d", "cwd", "-Fn"]).out.split("\n").find((l) => l.startsWith("n"))?.slice(1);
    return cwd === ROOT;
  });
}
{
  let said = 0;
  const installWaitUntil = Date.now() + Math.min(budgetSec * 1000, 10 * 60 * 1000);
  for (let pids = installsRunning(); pids.length && Date.now() < installWaitUntil; pids = installsRunning()) {
    if (Date.now() - said > 30000) {
      say(`install: a package install is running in this checkout (pid ${pids.join(", ")}); waiting for it to finish (${secs()}s)`);
      said = Date.now();
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  if (said) {
    say(`install: finished (${secs()}s)`);
    st = status();
    if (st.nmMoved && repair && !otherHoldsNow().length) {
      say("server: restarting it onto the packages just installed");
      restartServer();
    }
  }
}

// ── 3. hold ──────────────────────────────────────────────────────────────────
if (holdMin > 0) {
  const h = server("hold", String(holdMin));
  say(h.code === 0 ? `hold: ${holdMin} min for this session — no recycle or takeover until then (pnpm preview:release when done)` : `hold: could not take one (${h.out.trim()})`);
}

// ── 4. listener ──────────────────────────────────────────────────────────────
function request(path, { cookies = {}, timeoutMs = 30000, host = HOST } = {}) {
  return new Promise((resolveReq) => {
    const cookieHeader = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    const req = http.request(
      {
        host: "127.0.0.1",
        port: PORT,
        path,
        method: "GET",
        headers: { Host: `${host}:${PORT}`, ...AGENT_HEADER, ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolveReq({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") }));
        res.on("error", (e) => resolveReq({ status: 0, error: String(e) }));
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolveReq({ status: 0, error: "timeout" });
    });
    req.on("error", (e) => resolveReq({ status: 0, error: e.code || String(e) }));
    req.end();
  });
}

// The budget starts here, after any install wait, so a long install never eats the page check.
const deadline = Date.now() + budgetSec * 1000;
const left = () => Math.max(0, deadline - Date.now());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForListener() {
  let lastSay = 0;
  while (left() > 0) {
    const r = await request("/_next/static/__matrx_health", { timeoutMs: 10000, host: "localhost" });
    if (r.status > 0) return true;
    if (Date.now() - lastSay > 20000) {
      say(`listener: waiting for port ${PORT} (${secs()}s)`);
      lastSay = Date.now();
    }
    // A server that died during the wait: the watchdog restarts it; if nothing is there, start it.
    if (!status().running && repair) {
      say("listener: the server is gone — starting it");
      server("start");
    }
    await sleep(2000);
  }
  return false;
}

function restartServer() {
  const stop = server("stop");
  if (stop.code !== 0) say(`restart: stop said: ${stop.out.trim().split("\n").pop()}`);
  const s = server("start");
  if (s.code !== 0) notReady("restart failed", s.out.trim().split("\n").slice(-5));
  // The old hold lived in the state dir and survives a stop; re-take it to be sure.
  if (holdMin > 0) server("hold", String(holdMin));
}

function logPath() {
  const dir = process.env.MATRX_PREVIEW_STATE_DIR || join(process.env.TMPDIR || "/tmp", `matrx-frontend-preview-${process.getuid()}`);
  return join(dir, "shared-next-dev.log");
}

function logTailSince(bytesAtStart) {
  try {
    const p = logPath();
    const size = statSync(p).size;
    const from = size >= bytesAtStart ? bytesAtStart : 0;
    const fd = readFileSync(p);
    return fd.subarray(Math.max(from, size - 400000)).toString("utf8");
  } catch {
    return "";
  }
}
function logSize() {
  try {
    return statSync(logPath()).size;
  } catch {
    return 0;
  }
}

// ── 5. sign-in load ──────────────────────────────────────────────────────────
function mintLoginPath(target) {
  const r = sh("bash", [join(ROOT, "scripts", "dev-login.sh"), target, ...(member ? ["--member"] : [])]);
  const m = r.out.match(/OPEN\s*:\s*http:\/\/[^/]+(\/api\/dev-login\?\S+)/);
  if (!m) notReady("could not mint a dev-login nonce", r.out.trim().split("\n").slice(-3));
  return m[1];
}

// ONE sign-in per preflight (2026-10-17): every dev-login handshake used to be a fresh password
// sign-in — the page check, the browser check and every --warm route each minted one — and ~10 seats
// doing that pushed the auth host into 429. The first handshake's cookies are kept here and every
// later load (warm routes, the headless browser) reuses them; a new handshake happens only if the
// stored session stops working.
const sessionJar = {};
const jarSignedIn = () => Object.keys(sessionJar).some((k) => /^sb-[\w-]*auth/.test(k));

async function signedInLoad(target, { reuse = true } = {}) {
  const usingJar = reuse && jarSignedIn();
  const cookies = sessionJar;
  let path = usingJar ? target : mintLoginPath(target);
  const hops = [];
  let current = path;
  let lastSay = Date.now();
  const ticker = setInterval(() => {
    if (Date.now() - lastSay > 20000) {
      say(`sign-in: still loading ${current.split("?")[0]} (${secs()}s; a first compile can take minutes)`);
      lastSay = Date.now();
    }
  }, 5000);
  try {
    for (let hop = 0; hop < 6; hop++) {
      current = path;
      const r = await request(path, { cookies, timeoutMs: Math.max(5000, left()) });
      hops.push({ path, status: r.status });
      for (const c of [].concat(r.headers?.["set-cookie"] ?? [])) {
        const [pair] = c.split(";");
        const eq = pair.indexOf("=");
        if (eq > 0) cookies[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
      }
      if (r.status >= 300 && r.status < 400 && r.headers.location) {
        const loc = new URL(r.headers.location, `http://${HOST}:${PORT}`);
        path = loc.pathname + loc.search;
        continue;
      }
      const landed = path.split("?")[0];
      // The kept session stopped working (signed out): one fresh handshake, then judge that.
      if (usingJar && (landed.startsWith("/login") || landed.startsWith("/sign"))) {
        for (const k of Object.keys(sessionJar)) delete sessionJar[k];
        return signedInLoad(target, { reuse: false });
      }
      return { ...r, finalPath: path, hops, signedInCookie: jarSignedIn() /* sb-matrx-auth-v2.N (chunked) */ };
    }
    return { status: 0, error: "too many redirects", finalPath: path, hops };
  } finally {
    clearInterval(ticker);
  }
}

// ── run ──────────────────────────────────────────────────────────────────────
if (!(await waitForListener())) notReady(`port ${PORT} never answered in ${formatDurationSeconds(budgetSec, { style: "coarse" })}`);
say(`listener: port ${PORT} answers (${secs()}s)`);

let restarted = false;
let rateLimitWaits = 0;
let verified = false;
let capWaitSaid = 0;
let settleWaits = 0;
for (let attempt = 1; attempt <= 2; attempt++) {
  const logStart = logSize();
  const r = await signedInLoad(route);
  // The AUTH HOST is rate-limiting sign-ins from this machine (dev-login answers 429). The page
  // would render signed out; that is never READY. Wait as the host asks, a few times, then say so.
  if (r.status === 429) {
    const retryAfter = Math.max(20, Number(r.headers?.["retry-after"]) || 0);
    if (rateLimitWaits < 3 && left() > (retryAfter + 20) * 1000) {
      rateLimitWaits++;
      say(`sign-in: the auth host is rate-limiting sign-ins from this machine (429); waiting ${retryAfter}s (try ${rateLimitWaits} of 3)`);
      await sleep(retryAfter * 1000);
      attempt--;
      continue;
    }
    notReady("the auth host is rate-limiting sign-ins from this machine (dev-login answers 429) — pages would render signed out. Too many seats are signing in at once; retry in a few minutes");
  }
  // THE LIVE-DATABASE WALK CAP (utils/supabase/walkCap.ts): at most N session hosts sign in against
  // production at once. Our hold keeps us in once admitted; while every slot is busy, wait for one.
  if (r.status === 503 && r.headers?.["x-matrx-walk-cap"] === "refused" && left() > 25000) {
    if (Date.now() - capWaitSaid > 60000) {
      const holders = [...(r.body || "").matchAll(/<code>([^<]+\.localhost[^<]*)<\/code> — last signed-in request ([^<]+)</g)].map((m) => `${m[1]} (${m[2]})`);
      say(`walk cap: every live-database slot is in use${holders.length ? ` — ${holders.join(", ")}` : ""}; waiting for one (${secs()}s)`);
      capWaitSaid = Date.now();
    }
    await sleep(20000);
    attempt--;
    continue;
  }
  // The server went away mid-request (a restart after an install, or a crash the watchdog is
  // restarting): wait for it to answer again and load again — never call that a timeout.
  if (r.status === 0 && /ECONNRESET|ECONNREFUSED|socket hang up|EPIPE/.test(r.error || "") && left() > 25000) {
    say(`sign-in: the server restarted under the request (${r.error}); waiting for it and loading again (${secs()}s)`);
    if (!(await waitForListener())) notReady(`port ${PORT} never answered again after a restart`);
    attempt--;
    continue;
  }
  const v = verdictOf(r, route, say);
  if (v.ok) {
    verified = true;
    say(`sign-in: ${route} loaded signed in as ${member ? "test@test.com" : "admin@admin.com"} on ${HOST} (${secs()}s)`);
    break;
  }
  say(`sign-in: FAILED — ${v.why}`);
  if (v.kind === "timeout") notReady(`${route} did not load within ${formatDurationSeconds(budgetSec, { style: "coarse" })} (${r.error}; machine load ${os.loadavg()[0].toFixed(0)})`);
  if (v.kind !== "page-error") {
    if (v.kind === "signed-out" && attempt === 1) continue; // one retry: a nonce raced another mint
    notReady(v.why);
  }
  const d = await diagnoseBuildError(`${r.body || ""}\n${logTailSince(logStart)}`, ROOT);
  for (const line of d.lines) say(line);
  if (d.stale && repair && !restarted) {
    // A restart under someone else's held run is exactly what holds exist to stop.
    const others = otherHoldsNow();
    if (others.length) {
      notReady(`the preview serves code from before a package install, and another run holds it (${others.join(", ")}); it restarts when that run ends`);
    }
    say("repair: restarting the preview so it serves the installed packages");
    restartServer();
    restarted = true;
    if (!(await waitForListener())) notReady("the restarted preview never answered");
    attempt--; // the restart earns a fresh look, never a READY without one
    continue;
  }
  // Another session's edit in progress: those usually settle within a minute (the next save fixes
  // the file). Wait and look again a few times before calling it a block.
  if (d.uncommitted && settleWaits < 3 && left() > 75000) {
    settleWaits++;
    say(`waiting 60s for that in-progress edit to settle (try ${settleWaits} of 3)`);
    await sleep(60000);
    attempt--;
    continue;
  }
  if (v.kind === "signed-out" && attempt === 1) continue; // one retry: a nonce raced another mint
  notReady(v.why);
}

// READY only after a verified signed-in load — never by falling out of the loop.
if (!verified) notReady(`${route} never loaded signed in`);

// ── 6a. the same route in a real browser, watched for 20 s ───────────────────
if (browserCheck) {
  say(`browser: opening ${route} signed in, headless, and watching it for 20 s`);
  const b = await browserStability({
    url: jarSignedIn() ? `http://${HOST}:${PORT}${route}` : `http://${HOST}:${PORT}${mintLoginPath(route)}`,
    cookies: jarSignedIn() ? Object.entries(sessionJar).map(([name, value]) => ({ name, value, domain: HOST, path: "/" })) : [],
    port: PORT,
    windowSec: 20,
    timeoutMs: Math.max(60000, left()),
    say,
  });
  if (b.skipped) say(`browser: check skipped — ${b.why}`);
  else if (!b.ok) notReady(`${route} is not stable in a real browser: ${b.why}`);
  else say(`browser: ${route} loaded and held still for 20 s (no reload, readyState complete)`);
}

// ── 6b. warm the run's other routes ──────────────────────────────────────────
for (const extra of warm) {
  if (left() < 15000) {
    say(`warm: out of time before ${extra} — it will compile on first visit`);
    break;
  }
  const t0 = Date.now();
  const r = await signedInLoad(extra);
  const v = verdictOf(r, extra, say);
  say(v.ok ? `warm: ${extra} compiled and loads signed in (${formatDurationMs(Date.now() - t0, { style: "compact" })})` : `warm: ${extra} — ${v.why}`);
  if (!v.ok && v.kind === "page-error") {
    const d = await diagnoseBuildError(r.body || "", ROOT);
    for (const line of d.lines) say(`  ${line}`);
  }
}

// ── 7. browser ───────────────────────────────────────────────────────────────
let lane = "free";
try {
  if (existsSync(LANE_LOCK)) {
    const owner = existsSync(join(LANE_LOCK, "owner")) ? readFileSync(join(LANE_LOCK, "owner"), "utf8").trim() : "unknown";
    lane = `held by ${owner} for ${formatDurationMs(Date.now() - statSync(LANE_LOCK).mtimeMs, { style: "coarse" })}`;
  }
} catch {
  /* unreadable lock: report free */
}
say(`browser lane: ${lane}`);
const browserUrl = `http://${HOST}:${PORT}${mintLoginPath(route)}`;
say("in the page, confirm with javascript_tool:");
say(
  "  ({ path: location.pathname, signedOut: location.pathname.startsWith('/login'), overlay: (document.querySelector('nextjs-portal')?.shadowRoot?.textContent || '').match(/Build Error|Runtime Error|Unhandled Runtime/)?.[0] || null, heapMb: Math.round((performance.memory?.usedJSHeapSize || 0) / 1048576) })",
);
console.log(`READY ${browserUrl}`);
