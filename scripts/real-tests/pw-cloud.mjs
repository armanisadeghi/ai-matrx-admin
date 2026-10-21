#!/usr/bin/env node
// pw.mjs's commands, but each run's browser lives in its OWN cloud machine (a matrx-sandbox box), not on this Mac.
// Why: with dozens of sessions on one Mac (load 110–190) the local headless Chrome drops mid-run, so almost no
// quick UI test could finish (2026-10-21). The box runs Chromium; this file only sends one command at a time.
// Usage: node pw-cloud.mjs <run> <command> [args] — the same vocabulary as pw.mjs:
//   start | signin [--as <email>] | goto <url> | chat [agentId] [origin] | url | title | text [selector] [max]
//   find <text> | click | rclick | hover <locator> | clickxy | rclickxy <x> <y> | type <text> | press <key>
//   upload <locator> <file...> | eval <js> | shot <path> | console | stop
// Isolation: one box per run name; the box id is kept in <tmp>/matrx-real-test-browsers/<run>/cloud.json.
// Sign-in: the password goes to the Supabase auth API from this Mac (session-cookies.mjs); only the session
// cookies reach the box. The box belongs to admin@admin.com in the fenced org "Safety Net Real Tests" and
// stops itself 30 minutes after the last command; `stop` deletes it at once.
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MATRX_AGENT_TRAFFIC, agentTrafficValue } from "../lib/agent-traffic.mjs";
import { mintSessionCookies } from "./session-cookies.mjs";

const SAFETY_NET_ORG = "226be635-194d-42dd-87c8-7a9562f70939";
const IDLE_TTL_SECONDS = 1800;
const READ_ONLY = new Set(["url", "title", "text", "find", "shot", "launch"]);
const DEFAULT_CHAT_AGENT = "ccab43ad-05e4-45d6-a49f-8e5605ed66f5"; // Chat Plumbing Test Agent (same as pw.mjs)
// The driver in the box's own /tmp (every box of one account shares one home), named by its content hash: a box
// that lacks this exact version gets it before the command runs, so a driver change never strands a live run.
const DRIVER_SRC = fs.readFileSync(new URL("./pw_cloud_box.py", import.meta.url), "utf8");
const BOX_DRIVER = `/tmp/rt/pw_cloud_box.${createHash("sha256").update(DRIVER_SRC).digest("hex").slice(0, 12)}.py`;
const DRIVER_MISSING = 97;

const [run, cmd, ...args] = process.argv.slice(2);
if (!run || !cmd) { console.error("usage: node pw-cloud.mjs <run> <command> [args]"); process.exit(2); }
const dir = path.join(os.tmpdir(), "matrx-real-test-browsers", run);
fs.mkdirSync(dir, { recursive: true });
const stateFile = path.join(dir, "cloud.json");

function orchestrator() {
  let url = process.env.SANDBOX_ORCHESTRATOR_URL, key = process.env.SANDBOX_ORCHESTRATOR_API_KEY;
  if (!url || !key) {
    const text = (() => { try { return fs.readFileSync(new URL("../../../aidream/.env", import.meta.url), "utf8"); } catch { return ""; } })();
    for (const line of text.split("\n")) {
      const m = line.match(/^(SANDBOX_ORCHESTRATOR_URL|SANDBOX_ORCHESTRATOR_API_KEY)=(.*)$/);
      if (m && m[1].endsWith("URL")) url ||= m[2].trim().replace(/^["']|["']$/g, "");
      if (m && m[1].endsWith("KEY")) key ||= m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  if (!url || !key) { console.error("pw-cloud: SANDBOX_ORCHESTRATOR_URL / SANDBOX_ORCHESTRATOR_API_KEY not in the environment or ../aidream/.env"); process.exit(1); }
  return { url: url.replace(/\/$/, ""), key };
}
const orch = orchestrator();
async function api(method, p, body, timeoutMs = 60000) {
  const res = await fetch(orch.url + p, {
    method, headers: { "X-API-Key": orch.key, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, json, text };
}

const readState = () => { try { return JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch { return null; } };

async function putDriver(sandboxId) {
  const up = await api("POST", `/sandboxes/${sandboxId}/exec`, { command: `mkdir -p /tmp/rt && cat > ${BOX_DRIVER}`, stdin: DRIVER_SRC, timeout: 60 }, 90000);
  if (up.json?.exit_code !== 0) { console.error(`pw-cloud: could not put the driver on ${sandboxId} (${up.status}): ${up.text.slice(0, 300)}`); process.exit(1); }
}

async function box(sandboxId, request, timeoutSec = 180) {
  let r, uploaded = false;
  // A 503 is the orchestrator refusing before the command reaches the box (it answers that while it restarts),
  // so retrying cannot run a command twice.
  for (let attempt = 1; attempt <= 8; attempt++) {
    r = await api("POST", `/sandboxes/${sandboxId}/exec`, { command: `test -f ${BOX_DRIVER} || exit ${DRIVER_MISSING}; python3 ${BOX_DRIVER}`, stdin: JSON.stringify(request), timeout: timeoutSec }, (timeoutSec + 30) * 1000);
    if (r.status === 200 && r.json?.exit_code === DRIVER_MISSING && !uploaded) { await putDriver(sandboxId); uploaded = true; attempt--; continue; }
    // A 502 may come after the command ran, so only a command that changes nothing is retried on it.
    if (r.status !== 503 && !(r.status === 502 && READ_ONLY.has(request.cmd))) break;
    console.error(`pw-cloud: the orchestrator is busy (${r.status}); retrying in 15 s (${attempt}/8)`);
    await new Promise((res) => setTimeout(res, 15000));
  }
  if (r.status === 410 || r.status === 404) { console.error(`run ${run}'s cloud machine is gone (expired after ${IDLE_TTL_SECONDS / 60} idle minutes or stopped); use: node pw-cloud.mjs ${run} start`); process.exit(1); }
  if (r.status !== 200 || !r.json) { console.error(`pw-cloud: the machine answered ${r.status}: ${r.text.slice(0, 400)}`); process.exit(1); }
  return r.json;
}

async function start() {
  const st = readState();
  if (st) {
    const r = await api("GET", `/sandboxes/${st.sandbox_id}`);
    if (r.status === 200 && ["ready", "running"].includes(r.json?.status)) {
      const res = await box(st.sandbox_id, { cmd: "launch" }, 400);
      if (res.exit_code === 0) return console.log(`${res.stdout.trim()} (cloud machine ${st.sandbox_id})`);
    }
    await api("DELETE", `/sandboxes/${st.sandbox_id}?graceful=false&purge=true`).catch(() => null);
    fs.rmSync(stateFile, { force: true });
  }
  // The box is owned by the test account; mint (and discard) a session only to learn its user id.
  const { userId } = await mintSessionCookies();
  let created;
  for (let attempt = 1; attempt <= 6; attempt++) {
    created = await api("POST", "/sandboxes", {
      user_id: userId, organization_id: SAFETY_NET_ORG, name: `real-test browser ${run}`.slice(0, 100),
      template: "bare", ttl_seconds: IDLE_TTL_SECONDS, labels: { feature: "real-tests-browser", run },
    }, 300000);
    if (created.status !== 503 && created.status !== 429) break;
    console.error(`pw-cloud: the orchestrator is busy (${created.status}); retrying in 20 s (${attempt}/6)`);
    await new Promise((r) => setTimeout(r, 20000));
  }
  if (created.status >= 300 || !created.json?.sandbox_id) { console.error(`pw-cloud: could not create a cloud machine (${created.status}): ${created.text.slice(0, 400)}`); process.exit(1); }
  const id = created.json.sandbox_id;
  fs.writeFileSync(stateFile, JSON.stringify({ sandbox_id: id, created_at: new Date().toISOString() }));
  const res = await box(id, { cmd: "launch" }, 400);
  if (res.exit_code !== 0) {
    // Never leave a machine behind: each one counts against the account's sandbox ceiling (5).
    await api("DELETE", `/sandboxes/${id}?graceful=false&purge=true`).catch(() => null);
    fs.rmSync(stateFile, { force: true });
    console.error(`pw-cloud: the browser did not start on ${id} (machine deleted): ${(res.stderr || res.stdout).trim().split("\n").slice(-5).join(" | ")}`);
    process.exit(1);
  }
  console.log(`${res.stdout.trim()} (cloud machine ${id})`);
}

// The agent-traffic marker (scripts/lib/agent-traffic.mjs) as a cookie on the page's origin; none for data:/about: pages.
const trafficCookie = (u) => (/^https?:/.test(u) ? [{ name: MATRX_AGENT_TRAFFIC.cookie, value: agentTrafficValue("real-tests"), url: new URL(u).origin, sameSite: "Lax" }] : []);

if (cmd === "start") { await start(); process.exit(0); }
const st = readState();
if (!st) { console.error(`run ${run} has no cloud browser of its own running; use: node pw-cloud.mjs ${run} start`); process.exit(1); }
const id = st.sandbox_id;

if (cmd === "stop") {
  const res = await box(id, { cmd: "stop" }, 60).catch(() => null);
  let del;
  for (let attempt = 1; attempt <= 4; attempt++) {
    del = await api("DELETE", `/sandboxes/${id}?graceful=false&purge=true`).catch((e) => ({ status: 0, text: String(e) }));
    if (del.status === 204 || del.status === 404) break;
    await new Promise((r) => setTimeout(r, 15000));
  }
  if (del.status !== 204 && del.status !== 404) {
    console.error(`pw-cloud: the cloud machine ${id} was NOT deleted (${del.status}: ${del.text.slice(0, 200)}); it ends by itself ${IDLE_TTL_SECONDS / 60} minutes after its last command`);
    process.exit(1);
  }
  fs.rmSync(stateFile, { force: true });
  console.log(res?.stdout?.trim() || "stopped");
  process.exit(0);
}

// Every command keeps the box alive for another IDLE_TTL_SECONDS; an abandoned run's box ends by itself.
const keepAlive = api("POST", `/sandboxes/${id}/extend`, { ttl_seconds: IDLE_TTL_SECONDS }).catch(() => null);

let request = { cmd, args };
if (cmd === "signin") {
  const asAt = args.indexOf("--as");
  const { email, cookies } = await mintSessionCookies(asAt >= 0 ? args[asAt + 1] : undefined);
  request = { cmd, args: [], email, cookies: [...cookies, ...trafficCookie("https://www.aimatrx.com/")] };
} else if (cmd === "goto") {
  request = { cmd, args, cookies: trafficCookie(args[0]) };
} else if (cmd === "chat") {
  let origin = args[1];
  if (!origin) { const cur = (await box(id, { cmd: "url" })).stdout.trim(); origin = /^https?:/.test(cur) ? new URL(cur).origin : "https://www.aimatrx.com"; }
  const u = `${origin}/chat/a/${args[0] || process.env.CHAT_TEST_AGENT_ID || DEFAULT_CHAT_AGENT}`;
  request = { cmd: "goto", args: [u], cookies: trafficCookie(u) };
} else if (cmd === "upload") {
  request = { cmd, args: [args[0]], files: args.slice(1).map((f) => ({ name: path.basename(f), b64: fs.readFileSync(f).toString("base64") })) };
}

const res = await box(id, request);
await keepAlive;
if (cmd === "shot" && res.exit_code === 0) {
  const line = res.stdout.split("\n").find((l) => l.startsWith("[png base64] "));
  if (!line) { console.error("pw-cloud: the machine returned no screenshot"); process.exit(1); }
  fs.writeFileSync(args[0], Buffer.from(line.slice("[png base64] ".length), "base64"));
  console.log(args[0]);
} else {
  if (res.stdout) process.stdout.write(res.stdout.endsWith("\n") ? res.stdout : res.stdout + "\n");
  if (res.stderr) process.stderr.write(res.stderr.split("\n").filter((l) => l.trim()).slice(-12).join("\n") + "\n");
}
process.exit(res.exit_code ?? 1);
