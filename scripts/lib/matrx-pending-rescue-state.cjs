// matrx-pending-rescue-state — the hand-off between the ONE pending-import checker and `next dev`.
//
// WHY (2026-10-18): the dev-only pending-import rescue used to send EVERY file that mentions
// `@ai-matrx/` through a Turbopack webpack-loader. Turbopack runs loaders in a pool of child Node
// processes it sizes itself (no knob in Next 16.4.2): 192 `webpack-loaders` children, 5.7 GB real
// memory, on the shared :3001 preview (docs/perf/machine-guard.md). Now one long-lived checker
// (scripts/matrx-pending-checker.mjs) judges each changed file with the same judge the loader uses
// (scripts/lib/matrx-pending-imports.mjs) and lists ONLY the files that import a name the installed
// package cannot satisfy. next.config.js reads that list at load and installs the loader on exactly
// those paths — normally none, so no loader worker is ever spawned for it. A file that becomes
// pending while the server runs is not on the list the server loaded: the checker restarts next dev
// (an mtime touch of next.config.js, Next's own restart path) so the rescue covers it.
//
// CommonJS + no dependencies: next.config.js requires it on every config load.
const { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const STATE_REL = join(".matrx", "pending-imports");
const LOADER_REL = "./lib/turbopack/matrx-pending-imports-loader.cjs";
const SOURCE_GLOBS = ["*.ts", "*.tsx", "*.mts", "*.cts", "*.js", "*.jsx", "*.mjs", "*.cjs"];

function statePaths(root) {
  const dir = join(root, STATE_REL);
  return {
    dir,
    pending: join(dir, "pending.json"), // written by the checker: { files: { rel: [lines] }, scannedAt, pid, rev }
    loaded: join(dir, "loaded.json"), // written by next.config.js: { files: [rel], pid, at }
    pid: join(dir, "checker.pid"),
    log: join(dir, "checker.log"),
    cache: join(dir, "scan-cache.json"), // the checker's per-file judgement, keyed by stat

  };
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeJsonAtomic(file, value) {
  const dir = join(file, "..");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(tmp, file);
}

/** Repo-relative paths the checker currently judges pending (sorted). */
function readPendingFiles(root) {
  const state = readJson(statePaths(root).pending);
  return state && state.files && typeof state.files === "object" ? Object.keys(state.files).sort() : [];
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/** The Turbopack `rules` for exactly these repo-relative files; {} when there are none. */
function rescueRules(files, loaderPath) {
  if (!files.length) return {};
  const rule = {
    condition: { all: [{ not: "foreign" }, { path: new RegExp(`^(?:${files.map(escapeRegex).join("|")})$`) }] },
    loaders: [loaderPath],
  };
  const rules = {};
  for (const glob of SOURCE_GLOBS) rules[glob] = rule;
  return rules;
}

/**
 * Called by next.config.js for `next dev`: read the checker's list, record what this server
 * loaded (so the checker knows when a restart is needed), return the rules to merge.
 */
function loadRescueForDevServer(root) {
  let files = [];
  try {
    files = readPendingFiles(root);
    writeJsonAtomic(statePaths(root).loaded, { files, pid: process.pid, at: new Date().toISOString() });
  } catch (err) {
    // The rescue must never be what breaks the preview: no list → no rules, said out loud.
    console.error(`[matrx-pending] could not read the pending-import list; no rescue this boot: ${err?.message ?? err}`);
  }
  for (const f of files) console.error(`[matrx-pending] rescue active for ${f} (an @ai-matrx import its installed package does not ship)`);
  return { files, rules: rescueRules(files, join(root, LOADER_REL)) };
}

const alive = (pid) => {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === "EPERM";
  }
};

/** Files pending now that the running server did not load a rescue for. [] when no server runs. */
function uncoveredByRunningServer(root, pendingFiles) {
  const loaded = readJson(statePaths(root).loaded);
  if (!loaded || !alive(loaded.pid)) return [];
  const covered = new Set(Array.isArray(loaded.files) ? loaded.files : []);
  return pendingFiles.filter((f) => !covered.has(f));
}

module.exports = {
  SOURCE_GLOBS,
  alive,
  loadRescueForDevServer,
  readJson,
  readPendingFiles,
  rescueRules,
  statePaths,
  uncoveredByRunningServer,
  writeJsonAtomic,
};
