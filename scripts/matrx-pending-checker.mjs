#!/usr/bin/env node
// matrx-pending-checker — ONE long-lived process that keeps the shared preview up when a working-tree
// file imports an @ai-matrx name the INSTALLED package does not ship yet (the 2026-10-07 outages).
//
// It replaced the dev-only loader rule that sent every file mentioning `@ai-matrx/` through a
// Turbopack webpack-loader (192 loader child processes, 5.7 GB, 2026-10-17). Now:
//   1. this checker scans every source file once, then re-judges a file when it changes
//      (fs.watch recursive = macOS FSEvents, one stream per source directory) and when an install
//      rewrites node_modules/.modules.yaml — with the SAME judge the loader applies
//      (scripts/lib/matrx-pending-imports.mjs `rescuePendingImports`; one implementation);
//   2. it writes the pending files to .matrx/pending-imports/pending.json and one
//      `[matrx-pending] …` line per import to its log and the preview log;
//   3. next.config.js installs the rescue loader on exactly those paths (scripts/lib/
//      matrx-pending-rescue-state.cjs) — so the import renders the loud stand-in in that module only;
//   4. a file pending now that the running server did not load a rescue for → the checker touches
//      next.config.js (mtime only; Next restarts its server on that) once, after a short debounce.
//
//   node scripts/matrx-pending-checker.mjs ensure     # start the one daemon if absent/stale (preview:start, watchdog, status)
//   node scripts/matrx-pending-checker.mjs status     # one line for pnpm preview:status
//   node scripts/matrx-pending-checker.mjs scan       # one full scan, print pending lines, exit 1 when any
//   node scripts/matrx-pending-checker.mjs daemon     # the process itself (started by ensure)
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, statSync, utimesSync, watch, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { describePending, rescuePendingImports, resetPendingCaches } from "./lib/matrx-pending-imports.mjs";

const require = createRequire(import.meta.url);
const state = require("./lib/matrx-pending-rescue-state.cjs");

const SELF = fileURLToPath(import.meta.url);
export const ROOT = resolve(dirname(SELF), "..");
const EXTS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
// Never bundled into a page; skipped by the scan and the watcher.
const SKIP_TOP = new Set(["node_modules", "migrations", "docs", "public", "tests", "__tests__", "test-utils", "scripts", "supabase", "tmp", "_conflicts", "e2e"]);
const SKIP_SEGMENT = new Set(["node_modules", ".next", "dist"]);
const DEBOUNCE_MS = 300;
const RESTART_DEBOUNCE_MS = 1500;
const RESTART_COOLDOWN_MS = 20_000;
const INSTALL_POLL_MS = 5_000;

/** Is this repo-relative path a source file the dev server could compile? */
export function isCandidate(rel) {
  if (!EXTS.has(extname(rel)) || rel.endsWith(".d.ts")) return false;
  const parts = rel.split("/");
  if (parts.length < 2 || parts[0].startsWith(".") || SKIP_TOP.has(parts[0])) return false;
  return !parts.some((p) => SKIP_SEGMENT.has(p) || p.startsWith(".next"));
}

/** Judge one file: the `[matrx-pending]` lines for its pending imports ([] when none / unreadable). */
export function judgeFile(root, rel) {
  let text;
  try {
    text = readFileSync(join(root, rel), "utf8");
  } catch {
    return [];
  }
  if (!text.includes("@ai-matrx/")) return [];
  try {
    return rescuePendingImports(join(root, rel), text, root).pending.map(describePending);
  } catch (err) {
    return []; // the judge's own rule: unknowable is never pending
  }
}

export function listCandidates(root) {
  const out = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], { cwd: root, maxBuffer: 256 * 1024 * 1024 }).toString("utf8");
  return out.split("\0").filter((rel) => rel && isCandidate(rel));
}

/**
 * Full scan: { rel: [lines] } for every pending file. `cache` ({ key, entries: { rel: [mtimeMs, size, lines] } })
 * skips files whose stat is unchanged since the last scan under the same install + judge revision —
 * a cold scan reads ~23k files (minutes on a loaded Mac), a warm one only stats them.
 */
export function scanAll(root, cache = null, key = null) {
  const files = {};
  const reuse = cache && cache.key === key ? cache.entries : {};
  const entries = {};
  for (const rel of listCandidates(root)) {
    let st;
    try {
      st = statSync(join(root, rel));
    } catch {
      continue;
    }
    const hit = reuse[rel];
    const lines = hit && hit[0] === st.mtimeMs && hit[1] === st.size ? hit[2] : judgeFile(root, rel);
    entries[rel] = [st.mtimeMs, st.size, lines];
    if (lines.length) files[rel] = lines;
  }
  if (cache) {
    cache.key = key;
    cache.entries = entries;
  }
  return files;
}

function rev() {
  const h = createHash("sha256");
  for (const f of [SELF, join(ROOT, "scripts/lib/matrx-pending-imports.mjs"), join(ROOT, "scripts/lib/matrx-package-resolve.mjs"), join(ROOT, "scripts/lib/matrx-pending-rescue-state.cjs")]) {
    try {
      h.update(readFileSync(f));
    } catch {}
  }
  return h.digest("hex").slice(0, 12);
}

const stamp = () => new Date().toISOString();

function makeLogger(root) {
  const paths = state.statePaths(root);
  const previewLog = process.env.MATRX_PREVIEW_LOG || null;
  return (line) => {
    const text = `${stamp()} ${line}\n`;
    try {
      appendFileSync(paths.log, text);
    } catch {}
    if (previewLog) {
      try {
        appendFileSync(previewLog, `${line}\n`);
      } catch {}
    }
  };
}

function installStamp(root) {
  try {
    return statSync(join(root, "node_modules", ".modules.yaml")).mtimeMs;
  } catch {
    return null;
  }
}

/** Touch next.config.js (content unchanged) — Next's dev server restarts itself on that. */
export function requestDevRestart(root) {
  const cfg = join(root, "next.config.js");
  const now = new Date();
  utimesSync(cfg, now, now);
}

function watchRoots(root) {
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !SKIP_TOP.has(d.name))
    .map((d) => d.name);
}

/**
 * The daemon. `opts.restart` / `opts.now` are seams for the test; production uses the defaults.
 * Returns { stop, settled } — `settled()` resolves after pending work (debounced rescans) drains.
 */
export function runDaemon(root, opts = {}) {
  const paths = state.statePaths(root);
  mkdirSync(paths.dir, { recursive: true });
  const log = opts.log ?? makeLogger(root);
  const restart = opts.restart ?? (() => requestDevRestart(root));
  const myRev = opts.rev ?? rev();
  const t0 = Date.now();
  resetPendingCaches();
  const cache = state.readJson(paths.cache) ?? { key: null, entries: {} };
  const cacheKey = () => `${myRev}:${installStamp(root)}`;
  const scan = () => {
    const f = scanAll(root, cache, cacheKey());
    try {
      state.writeJsonAtomic(paths.cache, cache);
    } catch {}
    return f;
  };
  let files = scan();
  let watchedFiles = Object.keys(cache.entries).length;
  const write = () =>
    state.writeJsonAtomic(paths.pending, { files, scannedAt: stamp(), pid: process.pid, rev: myRev, watchedFiles, startedAt: new Date(t0).toISOString() });
  write();
  log(`[matrx-pending] checker pid ${process.pid} (rev ${myRev}) scanned ${watchedFiles} files in ${Date.now() - t0} ms; ${Object.keys(files).length} pending`);
  for (const lines of Object.values(files)) for (const l of lines) log(l);

  let lastRestart = 0;
  let restartTimer = null;
  const considerRestart = () => {
    const uncovered = state.uncoveredByRunningServer(root, Object.keys(files).sort());
    if (!uncovered.length || restartTimer) return;
    const wait = Math.max(RESTART_DEBOUNCE_MS, lastRestart + RESTART_COOLDOWN_MS - Date.now());
    restartTimer = setTimeout(() => {
      restartTimer = null;
      const still = state.uncoveredByRunningServer(root, Object.keys(files).sort());
      if (!still.length) return;
      lastRestart = Date.now();
      log(`[matrx-pending] restarting next dev so the stand-in covers ${still.join(", ")} (the running server loaded no rescue for it)`);
      try {
        restart();
      } catch (err) {
        log(`[matrx-pending] could not request the restart: ${err?.message ?? err}`);
      }
    }, wait);
  };

  const queue = new Set();
  let timer = null;
  const flush = () => {
    timer = null;
    const batch = [...queue];
    queue.clear();
    let changed = false;
    for (const rel of batch) {
      const lines = existsSync(join(root, rel)) ? judgeFile(root, rel) : [];
      const before = JSON.stringify(files[rel] ?? []);
      if (lines.length) files[rel] = lines;
      else delete files[rel];
      if (JSON.stringify(lines) !== before) {
        changed = true;
        if (lines.length) for (const l of lines) log(l);
        else log(`[matrx-pending] ${rel}: no pending @ai-matrx import any more`);
      }
    }
    if (changed) write();
    considerRestart();
  };
  const enqueue = (rel) => {
    if (!isCandidate(rel)) return;
    queue.add(rel);
    timer ??= setTimeout(flush, DEBOUNCE_MS);
  };

  const watchers = [];
  for (const top of watchRoots(root)) {
    try {
      const w = watch(join(root, top), { recursive: true }, (_evt, name) => {
        if (name) enqueue(`${top}/${String(name).split(sep).join("/")}`);
      });
      w.on("error", (err) => log(`[matrx-pending] watcher on ${top}/ failed: ${err?.message ?? err}`));
      watchers.push(w);
    } catch (err) {
      log(`[matrx-pending] could not watch ${top}/: ${err?.message ?? err}`);
    }
  }

  // An install changes what every import resolves to: forget the caches and rescan everything.
  let lastInstall = installStamp(root);
  const poll = setInterval(() => {
    const now = installStamp(root);
    if (now === lastInstall) return;
    lastInstall = now;
    resetPendingCaches();
    files = scan();
    watchedFiles = Object.keys(cache.entries).length;
    write();
    log(`[matrx-pending] install changed node_modules: rescanned, ${Object.keys(files).length} pending`);
    considerRestart();
  }, opts.installPollMs ?? INSTALL_POLL_MS);
  considerRestart();

  return {
    stop() {
      for (const w of watchers) w.close();
      clearInterval(poll);
      if (timer) clearTimeout(timer);
      if (restartTimer) clearTimeout(restartTimer);
    },
    pending: () => ({ ...files }),
    flushNow: () => {
      if (timer) clearTimeout(timer);
      flush();
    },
  };
}

// ── single instance ──────────────────────────────────────────────────────────

function daemonPid(root) {
  const paths = state.statePaths(root);
  let pid;
  try {
    pid = Number(readFileSync(paths.pid, "utf8").trim());
  } catch {
    return null;
  }
  if (!state.alive(pid)) return null;
  try {
    const cmd = execFileSync("ps", ["-o", "command=", "-p", String(pid)]).toString();
    if (!cmd.includes("matrx-pending-checker.mjs") || !cmd.includes("daemon")) return null;
  } catch {
    return null;
  }
  return pid;
}

async function ensure(root) {
  const paths = state.statePaths(root);
  mkdirSync(paths.dir, { recursive: true });
  const pid = daemonPid(root);
  const current = state.readJson(paths.pending);
  const myRev = rev();
  if (pid && current?.rev === myRev && current?.pid === pid) return pid;
  if (pid) {
    // Its source changed under it: replace it (our own daemon, verified by pid + command line).
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
    for (let i = 0; i < 40 && state.alive(pid); i++) await new Promise((r) => setTimeout(r, 50));
  }
  const out = openSync(paths.log, "a");
  const child = spawn(process.execPath, [SELF, "daemon"], { cwd: root, detached: true, stdio: ["ignore", out, out], env: { ...process.env } });
  child.unref();
  closeSync(out);
  // Wait for the first scan so a next dev booting right after reads a complete list.
  for (let i = 0; i < 600; i++) {
    const s = state.readJson(paths.pending);
    if (s?.pid === child.pid && s?.rev === myRev) return child.pid;
    await new Promise((r) => setTimeout(r, 100));
  }
  return child.pid;
}

function status(root) {
  const paths = state.statePaths(root);
  const s = state.readJson(paths.pending);
  const pid = daemonPid(root);
  if (!pid || !s) return `pending-import checker: NOT RUNNING (pnpm preview:status starts it)`;
  const pend = Object.entries(s.files ?? {});
  const head = `pending-import checker: pid ${pid} (rev ${s.rev}), ${s.watchedFiles} files watched, ${pend.length ? `${pend.length} file(s) PENDING` : "nothing pending"}`;
  const loaded = state.readJson(paths.loaded);
  const uncovered = state.uncoveredByRunningServer(root, pend.map(([f]) => f));
  const lines = [head];
  for (const [, ls] of pend) for (const l of ls) lines.push(`  ${l}`);
  if (uncovered.length) lines.push(`  restart pending: the running server (pid ${loaded?.pid}) has no stand-in for ${uncovered.join(", ")}`);
  return lines.join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === SELF) {
  const cmd = process.argv[2];
  if (cmd === "daemon") {
    const paths = state.statePaths(ROOT);
    mkdirSync(paths.dir, { recursive: true });
    const other = daemonPid(ROOT);
    if (other && other !== process.pid) {
      console.error(`[matrx-pending] checker already running (pid ${other}); exiting`);
      process.exit(0);
    }
    writeFileSync(paths.pid, `${process.pid}\n`);
    const d = runDaemon(ROOT);
    const bye = () => {
      d.stop();
      process.exit(0);
    };
    process.on("SIGTERM", bye);
    process.on("SIGINT", bye);
  } else if (cmd === "ensure") {
    ensure(ROOT).then(() => process.exit(0), (err) => {
      console.error(`[matrx-pending] ensure failed: ${err?.stack ?? err}`);
      process.exit(0); // never what stops the preview from starting
    });
  } else if (cmd === "status") {
    console.log(status(ROOT));
  } else if (cmd === "scan") {
    const files = scanAll(ROOT);
    for (const ls of Object.values(files)) for (const l of ls) console.log(l);
    process.exitCode = Object.keys(files).length ? 1 : 0;
  } else {
    console.error("usage: matrx-pending-checker.mjs ensure|status|scan|daemon");
    process.exitCode = 2;
  }
}
