#!/usr/bin/env node
/**
 * build-time-watch.mjs — every production build of ai-matrx (and the satellites), measured from its
 * Vercel log, and ONE loud finding when a build got slow or died on a parse error. REPORT ONLY:
 * it runs in release.sh's detached after phase, after the rollout watch, and always exits 0 there.
 *
 * Per build: total minutes (buildingAt → ready), the `✓ Compiled successfully in X` line, static
 * generation seconds, "Deploying outputs" → "Deployment completed", the build-cache state, the
 * error class (conflict-marker / parse / oom / stall / type / other) with the first error line,
 * the commit sha, and the @ai-matrx package versions that changed since the previous build
 * (pnpm-lock.yaml importer versions diffed between the two shas; a package absent before is NEW).
 *
 * ALARM (one finding per alarming build): compile > 25 % above the rolling median of the
 * previous 20 green builds of the same project, or an error of class parse / conflict-marker.
 * The finding names the commit range, the packages that changed (NEW flagged), and the app's own
 * `lab:graph` totalBill delta between the two shas — each sha is `git archive`d into mktemp,
 * node_modules symlinked in, and its own scripts/build-lab/graph-report.ts run with --json.
 * Vercel compile minutes swing ±4 min for the same code (code-splitting build-time-bloat.md):
 * a slow build with no package and bill movement is most likely Vercel, and the finding says so.
 *
 * Usage:
 *   pnpm build:watch --last 30                       table of the last 30 builds per project
 *   pnpm build:watch --last 30 --project main        one project (main|admin|demos|lab)
 *   node scripts/build-time-watch.mjs --release <sha> --findings <file.jsonl>
 *       the after phase: judge the builds of <sha>, append alarm rows (release findings shape)
 *   --json                                           machine output instead of the table
 *   --no-bill                                        skip the lab:graph delta (it takes ~1 min/sha)
 *
 * Storage: Vercel's deployment logs are the record (immutable once a build ends); finished builds
 * are cached in tmp/build-watch/builds/<uid>.json and bills in tmp/build-watch/bill-<sha>.json, and
 * the after phase's alarms go to the release findings file, which aidream's release_repeats.py
 * records. No committed ledger (it would churn the repo every release).
 * Token: $VERCEL_TOKEN or the Vercel CLI's auth.json (the same lookup as release-outcome.sh).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync, appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "tmp", "build-watch");
const ARGS = process.argv.slice(2);
const arg = (name, dflt = null) => (ARGS.includes(name) ? ARGS[ARGS.indexOf(name) + 1] : dflt);
const SLOW_FACTOR = 1.25;
const BASELINE_N = 20;

/* ── Vercel ─────────────────────────────────────────────────────────────────────────────────── */

/** Project ids + team: read from release-outcome.sh, their one home. */
function vercelIds() {
  const src = readFileSync(join(ROOT, "scripts", "release-outcome.sh"), "utf8");
  const team = /RELEASE_OUTCOME_TEAM_ID:-(team_[A-Za-z0-9]+)/.exec(src)?.[1];
  const projects = {};
  for (const m of src.matchAll(/^\s+(admin|demos|lab)\)\s+echo "(prj_[A-Za-z0-9]+)"/gm)) projects[m[1]] = m[2];
  const main = /main\)\s+echo "(prj_[A-Za-z0-9]+)"/.exec(src)?.[1];
  if (main) projects.main = main;
  return { team, projects };
}

function vercelToken() {
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN;
  for (const p of [
    join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), "com.vercel.cli", "auth.json"),
    join(homedir(), "Library", "Application Support", "com.vercel.cli", "auth.json"),
  ]) {
    try { const t = JSON.parse(readFileSync(p, "utf8")).token; if (t) return t; } catch { /* next */ }
  }
  return null;
}

async function api(path, token) {
  const res = await fetch(`https://api.vercel.com${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Vercel ${res.status} on ${path.split("?")[0]}`);
  return res.json();
}

async function deployments(projectId, team, token, n) {
  const out = [];
  let until = null;
  while (out.length < n) {
    const q = `projectId=${projectId}&teamId=${team}&target=production&state=READY,ERROR&limit=${Math.min(100, n - out.length)}${until ? `&until=${until}` : ""}`;
    const j = await api(`/v6/deployments?${q}`, token);
    out.push(...j.deployments);
    if (!j.pagination?.next || !j.deployments.length) break;
    until = j.pagination.next;
  }
  return out.slice(0, n);
}

/* ── one build's log → its numbers ───────────────────────────────────────────────────────────── */

const toSec = (n, unit) => Number(n) * (unit === "ms" ? 0.001 : unit === "min" ? 60 : 1);

/** Pure: the build-log events → metrics. Exported for the self-test. */
export function measure(events) {
  const lines = events.map((e) => ({ t: e.created, text: e.payload?.text ?? e.text ?? "" })).filter((l) => l.text);
  const find = (re) => lines.find((l) => re.test(l.text));
  const compiled = lines.map((l) => /Compiled successfully in ([\d.]+)\s*(ms|s|min)/.exec(l.text)).find(Boolean);
  const stat = lines.map((l) => /Generating static pages .*\((\d+)\/\1\) in ([\d.]+)\s*(ms|s|min)/.exec(l.text)).find(Boolean);
  const deploying = find(/^Deploying outputs/);
  const deployed = find(/^Deployment completed/);
  const cache = find(/^\[build-cache\]/)?.text.slice(0, 120) ?? null;
  const parseGuard = lines.map((l) => /\[parse-fast-fail\] OK .*\(.*?([\d.]+)s/.exec(l.text)).find(Boolean);
  const all = lines.map((l) => l.text).join("\n");
  let errorClass = null;
  let errorLine = null;
  // The first failing file + its message, from Turbopack's "build failed with N errors:" block.
  const failedAt = lines.findIndex((l) => /Turbopack build failed|Failed to compile|Build error occurred/.test(l.text));
  const firstErr = failedAt >= 0
    ? lines.slice(failedAt, failedAt + 12).map((l) => l.text.replace(/\x1b\[[0-9;]*m/g, "").trim())
      .filter((t) => /^\.\/\S+:\d+|^Error:|Expression expected|Merge conflict|Module not found|doesn't exist/.test(t) && !/Turbopack build failed/.test(t)).slice(0, 2).join(" — ").slice(0, 220) || null
    : null;
  const CLASSES = [
    ["conflict-marker", /Merge conflict marker encountered/],
    ["parse", /Expression expected|Parsing ecmascript source code failed|Unexpected token|Unterminated (string|regexp|template)|Expected '[^']+', got|Syntax error:/],
    ["missing-export", /Export \S+ doesn't exist in target module|was not found in module|is defined multiple times/],
    ["module-not-found", /Module not found|Can't resolve/],
    ["oom", /JavaScript heap out of memory|SIGKILL|exited with 137|out of memory|OOMKilled/i],
    ["stall", /\[compile-watchdog\] STALLED/],
    ["type", /Type error:/],
  ];
  for (const [cls, re] of CLASSES) {
    if (!re.test(all)) continue;
    errorClass = cls;
    errorLine = firstErr ?? lines.find((l) => re.test(l.text))?.text.trim().slice(0, 220) ?? null;
    break;
  }
  return {
    compileMin: compiled ? +(toSec(compiled[1], compiled[2]) / 60).toFixed(2) : null,
    staticSec: stat ? +toSec(stat[2], stat[3]).toFixed(1) : null,
    deployMin: deploying && deployed ? +((deployed.t - deploying.t) / 60000).toFixed(2) : null,
    cache,
    parseGuardSec: parseGuard ? Number(parseGuard[1]) : null,
    errorClass, errorLine, all,
  };
}

async function buildRecord(d, project, token, team) {
  const file = join(CACHE, "builds", `${d.uid}.v2.json`);
  if (existsSync(file)) { try { return JSON.parse(readFileSync(file, "utf8")); } catch { /* refetch */ } }
  const events = await api(`/v3/deployments/${d.uid}/events?teamId=${team}&builds=1&limit=-1`, token);
  const m = measure(Array.isArray(events) ? events : []);
  const rec = {
    project, uid: d.uid, url: d.url, state: d.state, sha: d.meta?.githubCommitSha ?? null,
    message: (d.meta?.githubCommitMessage ?? "").split("\n")[0].slice(0, 90),
    createdAt: d.created, totalMin: d.ready && d.buildingAt ? +((d.ready - d.buildingAt) / 60000).toFixed(2) : null,
    compileMin: m.compileMin, staticSec: m.staticSec, deployMin: m.deployMin, cache: m.cache,
    parseGuardSec: m.parseGuardSec,
    // No error text and ~45 min: Vercel's build cap killed a compile that never finished (the
    // 2026-10-22 Turbopack deadlock, v0.4.3447).
    errorClass: d.state === "ERROR" ? (m.errorClass ?? (d.ready - d.buildingAt > 44 * 60000 ? "timeout" : "other")) : null,
    errorLine: d.state === "ERROR" ? (m.errorLine ?? m.all.split("\n").filter((l) => /error|failed/i.test(l)).slice(-1)[0]?.slice(0, 200) ?? null) : null,
  };
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(rec));
  return rec;
}

/* ── git: packages and the compile bill ──────────────────────────────────────────────────────── */

const git = (args, opts = {}) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 << 20, stdio: ["ignore", "pipe", "ignore"], ...opts });
const fetched = new Set();
function haveSha(sha) {
  try { git(["cat-file", "-e", `${sha}^{commit}`]); return true; } catch { /* fetch below */ }
  if (fetched.has(sha)) return false;
  fetched.add(sha);
  try { git(["fetch", "-q", "origin", sha]); return true; } catch { return false; }
}

/** Pure: @ai-matrx/* importer versions from a pnpm-lock.yaml (v9). Exported for the self-test. */
export function matrxVersions(lock) {
  const start = lock.indexOf("\nimporters:\n");
  const end = lock.indexOf("\npackages:\n", start);
  const block = lock.slice(start, end > 0 ? end : undefined);
  const root = block.split(/\n {2}(?=\S)/)[1] ?? block; // the first importer is `.`
  const out = {};
  for (const m of root.matchAll(/^ {6}'?(@ai-matrx\/[^':]+)'?:\n {8}specifier:[^\n]*\n {8}version: ([^\s(]+)/gm)) out[m[1]] = m[2];
  return out;
}

const versionsCache = new Map();
function versionsAt(sha) {
  if (!sha || !haveSha(sha)) return null;
  if (!versionsCache.has(sha)) {
    try { versionsCache.set(sha, matrxVersions(git(["show", `${sha}:pnpm-lock.yaml`]))); } catch { versionsCache.set(sha, null); }
  }
  return versionsCache.get(sha);
}

/** Pure: two version maps → [{name, from, to, isNew}] */
export function packageDelta(before, after) {
  if (!before || !after) return null;
  return Object.keys(after).sort()
    .filter((k) => before[k] !== after[k])
    .map((k) => ({ name: k, from: before[k] ?? null, to: after[k], isNew: !(k in before) }));
}

function billAt(sha) {
  const file = join(CACHE, `bill-${sha}.json`);
  if (existsSync(file)) { try { return JSON.parse(readFileSync(file, "utf8")).totalBill; } catch { /* recompute */ } }
  if (!haveSha(sha)) return null;
  const dir = mkdtempSync(join(tmpdir(), "build-watch-bill-"));
  try {
    execFileSync("sh", ["-c", `git -C "${ROOT}" archive ${sha} -- . ':(exclude)public' ':(exclude)docs' ':(exclude)migrations' | tar -x -C "${dir}"`], { stdio: "ignore", maxBuffer: 1 << 30 });
    symlinkSync(join(ROOT, "node_modules"), join(dir, "node_modules"));
    const out = join(dir, "graph.json");
    execFileSync(join(ROOT, "node_modules", ".bin", "tsx"), [join(dir, "scripts", "build-lab", "graph-report.ts"), "--json", out], { cwd: dir, stdio: "ignore", timeout: 600_000 });
    const totalBill = JSON.parse(readFileSync(out, "utf8")).summary?.totalBill ?? null;
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(file, JSON.stringify({ sha, totalBill }));
    return totalBill;
  } catch { return null; } finally { rmSync(dir, { recursive: true, force: true }); }
}

/* ── judgment ────────────────────────────────────────────────────────────────────────────────── */

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };

/** Pure: builds newest-first (one project) → each with baseline + alarm reasons. Exported for the self-test. */
export function judge(builds) {
  return builds.map((b, i) => {
    const older = builds.slice(i + 1);
    const green = older.filter((x) => x.state === "READY" && x.compileMin != null).slice(0, BASELINE_N).map((x) => x.compileMin);
    const baseline = green.length >= 5 ? +median(green).toFixed(2) : null;
    const prev = older.find((x) => x.sha && x.sha !== b.sha) ?? null;
    const reasons = [];
    if (b.compileMin != null && baseline != null && b.compileMin > baseline * SLOW_FACTOR) {
      reasons.push(`compile ${b.compileMin} min is ${Math.round((b.compileMin / baseline - 1) * 100)}% above the ${green.length}-build median ${baseline} min`);
    }
    if (b.errorClass === "parse" || b.errorClass === "conflict-marker") reasons.push(`build ERROR: ${b.errorClass}${b.errorLine ? ` — ${b.errorLine}` : ""}`);
    return { ...b, baseline, prevSha: prev?.sha ?? null, reasons };
  });
}

function enrich(b, { bill }) {
  const delta = packageDelta(versionsAt(b.prevSha), versionsAt(b.sha));
  const out = { ...b, packages: delta };
  if (bill && b.reasons.length && b.reasons[0].startsWith("compile") && b.prevSha && b.sha) {
    const before = billAt(b.prevSha);
    const after = billAt(b.sha);
    out.bill = before != null && after != null ? { before, after, delta: after - before, pct: +(((after - before) / before) * 100).toFixed(1) } : null;
  }
  return out;
}

function findingRow(b) {
  const range = `${(b.prevSha ?? "?").slice(0, 10)}..${(b.sha ?? "?").slice(0, 10)}`;
  const pk = b.packages == null ? "packages unknown" : b.packages.length
    ? [...b.packages].sort((x, y) => Number(y.isNew) - Number(x.isNew)).map((p) => `${p.isNew ? "NEW " : ""}${p.name}${p.from ? ` ${p.from}→` : " "}${p.to}`).join(", ")
    : "no @ai-matrx package changed";
  const bill = b.bill ? `; app compile bill ${b.bill.before.toLocaleString()} → ${b.bill.after.toLocaleString()} (${b.bill.pct > 0 ? "+" : ""}${b.bill.pct}%)` : "";
  const vercelNoise = b.reasons[0]?.startsWith("compile") && b.packages?.length === 0 && b.bill && b.bill.pct <= 0
    ? " — no package or app-graph growth: most likely Vercel (same code swings ±4 min)" : "";
  const title = `BUILD ${b.state === "ERROR" ? "FAILED" : "SLOW"}: ${b.project} ${range} — ${b.reasons.join("; ")}`;
  const detail = `${pk}${bill}${vercelNoise}. Cache: ${b.cache ?? "?"}. https://${b.url}`;
  const norm = `${b.project}\n${b.errorClass ?? "slow"}`;
  return {
    check: "build-time-watch", category: "build-time", level: b.state === "ERROR" ? "error" : "warning",
    title: title.slice(0, 100), count: 1,
    fingerprint: createHash("sha1").update(`build-time-watch\n${norm}`).digest("hex"),
    remedy: b.state === "ERROR"
      ? "fix the file named above (pnpm check:parse finds every one); the write-time hook and pre-commit refuse it next time"
      : "read .claude/skills/code-splitting/build-time-bloat.md (Step 0: is it the tree or Vercel?); a NEW package built without splitting is the usual cause",
    detail: `${title} | ${detail}`.slice(0, 2000),
  };
}

/* ── output ──────────────────────────────────────────────────────────────────────────────────── */

function table(rows) {
  const cols = [["project", 7], ["when", 11], ["sha", 10], ["state", 5], ["total", 6], ["compile", 7], ["base", 6], ["static", 6], ["deploy", 6], ["error", 15], ["packages / alarm", 0]];
  const pad = (s, n) => (n ? String(s ?? "").slice(0, n).padEnd(n) : String(s ?? ""));
  console.log(cols.map(([c, n]) => pad(c, n)).join("  "));
  for (const b of rows) {
    const pk = b.packages == null ? "?" : b.packages.map((p) => `${p.isNew ? "NEW " : ""}${p.name.replace("@ai-matrx/", "")}@${p.to}`).join(" ");
    console.log([
      b.project, new Date(b.createdAt).toISOString().slice(5, 16).replace("T", " "), (b.sha ?? "").slice(0, 10), b.state === "READY" ? "ok" : "ERR",
      b.totalMin, b.compileMin, b.baseline, b.staticSec, b.deployMin, b.errorClass ?? "",
      `${b.reasons.length ? "ALARM " : ""}${pk}`,
    ].map((v, i) => pad(v, cols[i][1])).join("  "));
  }
}

/* ── self-test ───────────────────────────────────────────────────────────────────────────────── */

function selfTest() {
  const ev = (t, text) => ({ created: t, payload: { text } });
  const ok = measure([ev(0, "[build-cache] off for this build"), ev(1, "✓ Compiled successfully in 11.2min"), ev(2, "✓ Generating static pages using 8 workers (982/982) in 10.0s"), ev(60_000, "Deploying outputs..."), ev(210_000, "Deployment completed")]);
  const conflict = measure([ev(0, "./features/a/B.tsx:12:1"), ev(1, "Merge conflict marker encountered.")]);
  const parse = measure([ev(0, "Parsing ecmascript source code failed"), ev(1, "Expression expected")]);
  const lock = "lockfileVersion: '9.0'\n\nimporters:\n\n  .:\n    dependencies:\n      '@ai-matrx/kit':\n        specifier: latest\n        version: 1.2.0(react@19)\n      '@ai-matrx/sharing':\n        specifier: latest\n        version: 0.1.0\n\n  packages/x:\n    dependencies:\n      '@ai-matrx/other':\n        specifier: latest\n        version: 9.9.9\n\npackages:\n";
  const v = matrxVersions(lock);
  const d = packageDelta({ "@ai-matrx/kit": "1.1.0" }, v);
  const builds = [{ state: "READY", compileMin: 11.2, sha: "b" }, ...Array.from({ length: 8 }, (_, i) => ({ state: "READY", compileMin: 7 + (i % 3) * 0.5, sha: `s${i}` }))];
  const j = judge(builds);
  const steady = judge([{ state: "READY", compileMin: 8, sha: "c" }, ...builds.slice(1)]);
  const checks = [
    ["compile / static / deploy are read", ok.compileMin === 11.2 && ok.staticSec === 10 && ok.deployMin === 2.5],
    ["a conflict-marker error is classed", conflict.errorClass === "conflict-marker"],
    ["an 'Expression expected' error is classed parse", parse.errorClass === "parse"],
    ["lockfile: the root importer's @ai-matrx versions only", v["@ai-matrx/kit"] === "1.2.0" && v["@ai-matrx/sharing"] === "0.1.0" && !v["@ai-matrx/other"]],
    ["a package absent before is NEW", d.some((p) => p.name === "@ai-matrx/sharing" && p.isNew) && d.some((p) => p.name === "@ai-matrx/kit" && !p.isNew)],
    ["11.2 min against a ~7.5 min median ALARMS", j[0].reasons.length === 1],
    ["8 min against the same median does not", steady[0].reasons.length === 0],
  ];
  for (const [n, pass] of checks) console.log(`  ${pass ? "✓" : "✗"} ${n}`);
  const pass = checks.every(([, p]) => p);
  console.log(pass ? "[build-time-watch] self-test PASSED" : "[build-time-watch] self-test FAILED");
  process.exit(pass ? 0 : 3);
}

/* ── main ────────────────────────────────────────────────────────────────────────────────────── */

async function main() {
  if (ARGS.includes("--self-test")) selfTest();
  const release = arg("--release");
  const findings = arg("--findings");
  const last = Number(arg("--last", release ? "25" : "30"));
  const only = arg("--project");
  const token = vercelToken();
  const { team, projects } = vercelIds();
  if (!token || !team || !projects.main) {
    console.error(`[build-time-watch] UNMEASURED: ${!token ? "no Vercel token (VERCEL_TOKEN or `vercel login`)" : "project ids not found in scripts/release-outcome.sh"}`);
    return;
  }
  const out = [];
  for (const [project, id] of Object.entries(projects)) {
    if (only && project !== only) continue;
    let ds;
    try { ds = await deployments(id, team, token, last + BASELINE_N); } catch (e) { console.error(`[build-time-watch] ${project}: ${e.message}`); continue; }
    const recs = [];
    for (const d of ds) { try { recs.push(await buildRecord(d, project, token, team)); } catch (e) { console.error(`[build-time-watch] ${project} ${d.uid}: ${e.message}`); } }
    const judged = judge(recs);
    const pick = release ? judged.filter((b) => b.sha?.startsWith(release)) : judged.slice(0, last);
    for (const b of pick) out.push(enrich(b, { bill: !ARGS.includes("--no-bill") }));
  }
  const alarms = out.filter((b) => b.reasons.length);
  if (findings) {
    for (const b of alarms) appendFileSync(findings, JSON.stringify(findingRow(b)) + "\n");
    console.log(`[build-time-watch] ${out.length} build(s) of ${release ?? "the window"} judged, ${alarms.length} alarm(s)`);
  }
  if (ARGS.includes("--json")) console.log(JSON.stringify(out, null, 1));
  else if (!findings) {
    table(out);
    for (const b of alarms) { const r = findingRow(b); console.log(`\n${r.level.toUpperCase()}: ${r.detail}`); }
  }
}

main().catch((e) => { console.error(`[build-time-watch] crashed (report only, nothing affected): ${e?.stack ?? e}`); process.exit(release() ? 0 : 1); });
function release() { return ARGS.includes("--release"); }
