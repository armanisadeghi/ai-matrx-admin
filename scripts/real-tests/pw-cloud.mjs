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
import { formatDurationSeconds } from "@ai-matrx/kit/format";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MATRX_AGENT_TRAFFIC, agentTrafficValue } from "../lib/agent-traffic.mjs";
import { mintSessionCookies } from "./session-cookies.mjs";

// The fenced org "Safety Net Real Tests": its one home is fixtures.json (`organization`).
const SAFETY_NET_ORG = JSON.parse(fs.readFileSync(new URL("./fixtures.json", import.meta.url), "utf8")).organization;
const IDLE_TTL_SECONDS = 1800;
const READ_ONLY = new Set(["url", "title", "text", "find", "shot", "launch"]);
const DEFAULT_CHAT_AGENT = "ccab43ad-05e4-45d6-a49f-8e5605ed66f5"; // Chat Plumbing Test Agent (same as pw.mjs)
// The driver in the box's own /tmp (every box of one account shares one home), named by its content hash: a box
// that lacks this exact version gets it before the command runs, so a driver change never strands a live run.
const DRIVER_SRC = fs.readFileSync(new URL("./pw_cloud_box.py", import.meta.url), "utf8");
const BOX_DRIVER = `/tmp/rt/pw_cloud_box.${createHash("sha256").update(DRIVER_SRC).digest("hex").slice(0, 12)}.py`;
const DRIVER_MISSING = 97;
// The orchestrator's lease refusal, sent before the request reaches the box (matrx-sandbox orchestrator
// middleware/hosted_operation_lease.py `_deny`, main.py `hosted_operation_denied_handler`): safe to retry for any command.
const LEASE_REFUSAL = "sandbox operation temporarily unavailable";
const OWNER_ID_FILE = path.join(os.tmpdir(), "matrx-real-test-browsers", ".owner-user-id");
class Gone extends Error {}

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
  if (up.json?.exit_code !== 0) throw new Error(`could not put the driver on ${sandboxId} (${up.status}): ${up.text.slice(0, 300)}`);
}

async function box(sandboxId, request, timeoutSec = 180) {
  let r, uploaded = false;
  for (let attempt = 1; attempt <= 8; attempt++) {
    r = await api("POST", `/sandboxes/${sandboxId}/exec`, { command: `test -f ${BOX_DRIVER} || exit ${DRIVER_MISSING}; python3 ${BOX_DRIVER}`, stdin: JSON.stringify(request), timeout: timeoutSec }, (timeoutSec + 30) * 1000);
    if (r.status === 200 && r.json?.exit_code === DRIVER_MISSING && !uploaded) { await putDriver(sandboxId); uploaded = true; attempt--; continue; }
    // Retried: the lease refusal (it never reached the box), or any 502/503 for a command that changes nothing.
    // Another 503 or a 502 may come after the command ran, so a click or a keystroke is never sent twice.
    const leaseRefusal = r.status === 503 && r.json?.detail === LEASE_REFUSAL;
    if (!leaseRefusal && !([502, 503].includes(r.status) && READ_ONLY.has(request.cmd))) break;
    console.error(`pw-cloud: the orchestrator is busy (${r.status}); retrying in 15 s (${attempt}/8)`);
    await new Promise((res) => setTimeout(res, 15000));
  }
  if (r.status === 410 || r.status === 404) throw new Gone(`run ${run}'s cloud machine is gone (expired after ${formatDurationSeconds(IDLE_TTL_SECONDS, { style: "long" })} idle or stopped); use: node pw-cloud.mjs ${run} start`);
  if (r.status !== 200 || !r.json) throw new Error(`the machine answered ${r.status}: ${r.text.slice(0, 400)}`);
  return r.json;
}

const TERMINAL = new Set(["stopped", "expired", "failed", "error", "deleted"]);
async function deleteMachine(id) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const del = await api("DELETE", `/sandboxes/${id}?graceful=false&purge=true`).catch((e) => ({ status: 0, text: String(e) }));
    if (del.status === 204 || del.status === 404 || del.status === 410) return null;
    // A machine already deleted answers 409 here; read it back before calling the delete a failure.
    const now = await api("GET", `/sandboxes/${id}`).catch(() => null);
    if (now && (now.status === 404 || now.status === 410 || TERMINAL.has(now.json?.status))) return null;
    if (attempt === 4) return `${del.status}: ${del.text.slice(0, 200)}`;
    await new Promise((r) => setTimeout(r, 15000));
  }
}

// The machine's owner (the test account) never changes, so its id is learned once, not by a sign-in per start.
async function ownerUserId() {
  try { return fs.readFileSync(OWNER_ID_FILE, "utf8").trim(); } catch {}
  const { userId } = await mintSessionCookies();
  fs.writeFileSync(OWNER_ID_FILE, userId);
  return userId;
}

async function start() {
  const st = readState();
  if (st) {
    const r = await api("GET", `/sandboxes/${st.sandbox_id}`);
    if (r.status === 200 && ["ready", "running"].includes(r.json?.status)) {
      const res = await box(st.sandbox_id, { cmd: "launch" }, 400);
      if (res.exit_code === 0) return console.log(`${res.stdout.trim()} (cloud machine ${st.sandbox_id})`);
    } else if (!(r.status === 404 || r.status === 410 || TERMINAL.has(r.json?.status))) {
      // A passing hiccup is not a dead machine: keep the run's browser and say so.
      throw new Error(`could not read cloud machine ${st.sandbox_id} (${r.status} ${r.json?.status ?? ""}); try start again`);
    }
    await deleteMachine(st.sandbox_id);
    fs.rmSync(stateFile, { force: true });
  }
  const userId = await ownerUserId();
  const name = `real-test browser ${run}`.slice(0, 100);
  let created, id = null, ok = false;
  try {
    for (let attempt = 1; attempt <= 6; attempt++) {
      created = await api("POST", "/sandboxes", {
        user_id: userId, organization_id: SAFETY_NET_ORG, name,
        template: "bare", ttl_seconds: IDLE_TTL_SECONDS, labels: { feature: "real-tests-browser", run },
      }, 300000).catch((e) => ({ status: 0, json: null, text: String(e) }));
      if (created.status !== 503 && created.status !== 429) break;
      console.error(`pw-cloud: the orchestrator is busy (${created.status}); retrying in 20 s (${attempt}/6)`);
      await new Promise((r) => setTimeout(r, 20000));
    }
    id = created.json?.sandbox_id ?? null;
    if (created.status >= 300 || !id) throw new Error(`could not create a cloud machine (${created.status}): ${created.text.slice(0, 400)}`);
    fs.writeFileSync(stateFile, JSON.stringify({ sandbox_id: id, created_at: new Date().toISOString() }));
    const res = await box(id, { cmd: "launch" }, 400);
    if (res.exit_code !== 0) throw new Error(`the browser did not start on ${id}: ${(res.stderr || res.stdout).trim().split("\n").slice(-5).join(" | ")}`);
    console.log(`${res.stdout.trim()} (cloud machine ${id})`);
    ok = true;
  } finally {
    if (!ok) {
      // Never leave a machine behind (each counts against the account's ceiling of 5), including one whose create
      // answer was lost: find it by this run's name.
      if (!id) {
        const list = await api("GET", `/sandboxes?user_id=${userId}`).catch(() => null);
        const rows = Array.isArray(list?.json) ? list.json : list?.json?.sandboxes ?? [];
        id = rows.find((x) => x.name === name && !TERMINAL.has(x.status))?.sandbox_id ?? null;
      }
      if (id) { await deleteMachine(id); console.error(`pw-cloud: machine ${id} deleted after the failed start`); }
      fs.rmSync(stateFile, { force: true });
    }
  }
}

// The agent-traffic marker (scripts/lib/agent-traffic.mjs) as a cookie on the page's origin; none for data:/about: pages.
const trafficCookie = (u) => (/^https?:/.test(u) ? [{ name: MATRX_AGENT_TRAFFIC.cookie, value: agentTrafficValue("real-tests"), url: new URL(u).origin, sameSite: "Lax" }] : []);

const fail = (e) => { console.error(e instanceof Gone ? e.message : `pw-cloud: ${e?.message ?? e}`); process.exit(1); };
if (cmd === "start") { await start().catch(fail); process.exit(0); }
const st = readState();
if (!st) { console.error(`run ${run} has no cloud browser of its own running; use: node pw-cloud.mjs ${run} start`); process.exit(1); }
const id = st.sandbox_id;

if (cmd === "stop") {
  // Whatever the box answers (or if it is already gone), the machine is deleted.
  const res = await box(id, { cmd: "stop" }, 60).catch((e) => (e instanceof Gone ? { stdout: "stopped (the machine was already gone)" } : null));
  const failed = await deleteMachine(id);
  if (failed) {
    console.error(`pw-cloud: the cloud machine ${id} was NOT deleted (${failed}); it ends by itself ${formatDurationSeconds(IDLE_TTL_SECONDS, { style: "long" })} after its last command`);
    process.exit(1);
  }
  fs.rmSync(stateFile, { force: true });
  console.log(res?.stdout?.trim() || "stopped");
  process.exit(0);
}

// Every command keeps the box alive for another IDLE_TTL_SECONDS; an abandoned run's box ends by itself.
const keepAlive = api("POST", `/sandboxes/${id}/extend`, { ttl_seconds: IDLE_TTL_SECONDS })
  .then((r) => { if (r.status >= 300) console.error(`pw-cloud: warning: the machine's idle timer was not extended (${r.status}); it may end ${formatDurationSeconds(IDLE_TTL_SECONDS, { style: "long" })} after an earlier command`); })
  .catch((e) => console.error(`pw-cloud: warning: the machine's idle timer was not extended (${e.message})`));

let request = { cmd, args };
if (cmd === "signin") {
  const asAt = args.indexOf("--as");
  const { email, cookies } = await mintSessionCookies(asAt >= 0 ? args[asAt + 1] : undefined);
  request = { cmd, args: [], email, cookies: [...cookies, ...trafficCookie("https://www.aimatrx.com/")] };
} else if (cmd === "goto") {
  request = { cmd, args, cookies: trafficCookie(args[0]) };
} else if (cmd === "chat") {
  let origin = args[1];
  if (!origin) { const cur = (await box(id, { cmd: "url" }).catch(fail)).stdout.trim(); origin = /^https?:/.test(cur) ? new URL(cur).origin : "https://www.aimatrx.com"; }
  const u = `${origin}/chat/a/${args[0] || process.env.CHAT_TEST_AGENT_ID || DEFAULT_CHAT_AGENT}`;
  request = { cmd: "goto", args: [u], cookies: trafficCookie(u) };
} else if (cmd === "upload") {
  request = { cmd, args: [args[0]], files: args.slice(1).map((f) => ({ name: path.basename(f), b64: fs.readFileSync(f).toString("base64") })) };
}

const res = await box(id, request).catch(fail);
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
