/**
 * content-lane.mjs — THE CONTENT LANE of check-package-twins (2026-10-21).
 *
 * THE CLASS. The name lane and the shape lanes catch a registered capability
 * re-grown under a known name or shape. They cannot see a WHOLE FILE copied out
 * of a package (or out of another package) and left to drift: sharing/, access
 * gate, lifted utils, audio helpers, color tables. This lane compares file
 * CONTENT, so a new copy fails the release gate whatever it is called.
 *
 * HOW. Every tracked .ts/.tsx/.js/.mjs/.cjs/.jsx file is normalized (comments, import lines,
 * `export … from` lines, whitespace and blank lines stripped). Files under 20
 * normalized lines are ignored — which is also why a pure re-export door and a
 * one-to-two-line option-binding wrapper are never findings. Candidates come
 * from an inverted index of sampled token shingles (never all-pairs), are
 * confirmed by exact shingle Jaccard, then by a line-level LCS ratio. A pair at
 * >= 0.80 is a finding.
 *
 * GENERATED FILES (`*.generated.*`) ARE IN, but only ever compared against other generated
 * files (a generated twin of a generated file is a finding; a generated file never matches a
 * hand-written one). `examples/`, demos, tests, `.d.ts` and files under 20 normalized lines
 * stay out BY DESIGN. Only `<pkg>/src/**` is package source in the pool, so a generated twin
 * must sit under a package `src/` to be seen.
 *
 * MODES (register `contentLane.mode`, the key being absent = lane off):
 *   app-vs-packages  — this repo's files vs package SOURCE in a sibling checkout
 *                      (`contentLane.packagesRoot`, `<pkg>/src/**`). A missing
 *                      sibling prints a loud SKIPPED line and does not fail.
 *   cross-package    — package src vs package src of a DIFFERENT package, inside
 *                      this root (the packages directory itself).
 *
 * THE CENSUS. `contentCensus: [{ pair, reason }]`, key "appPath|pkgPath" or
 * "pkgA path|pkgB path". Reported every run, SHRINK-ONLY: a stale entry (pair
 * no longer a finding) FAILS and the failure prints the exact line to delete.
 * `--prune-stale` removes ONLY stale entries from the register, never adds.
 * A finding not in the census fails under --strict.
 *
 * WRITE-TIME MODE (Arman 2026-10-21: "scream at them at the time they write the
 * code, not block the pathways that get the code out"). `node scripts/content-lane.mjs
 * --files <repo-relative paths...>` (run from the repo/package root) compares ONLY those
 * files, as they are on disk, against all package source, prints one
 * `  ✗ <path> — N% copy of <other>; …` line per finding NOT in contentCensus, and exits 1
 * with findings / 0 clean. It is called by matrx-ship's lint-guard.py at Stop and on the
 * session's own commit; it is never part of a release, publish or deploy path.
 * `node scripts/content-lane.mjs --self-test` proves it.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MIN_LINES = 20;
export const THRESHOLD = 0.8;
const SHINGLE = 5;
const SAMPLE_MOD = 4;
const MAX_POSTING = 60;

const SKIP_PATH =
  /(^|\/)(node_modules|dist|build|coverage|demo|demos|examples|__tests__|__mocks__|jest|\.next[^/]*|\.turbo|\.ignored_[^/]*)\/|\.(test|spec)\.[cm]?[tj]sx?$|\.min\.[cm]?js$|\.d\.ts$|(^|\/)(jest|vitest)[^/]*\.(setup|config)\.[tj]s$|(^|\/)(jest|vitest)\.setup/;

/** Source without comments, import lines, `export … from` lines, blank lines. */
export function normalize(source) {
  let s = source;
  // block + line comments (string-aware enough: skip quoted runs)
  let out = "";
  for (let i = 0; i < s.length; ) {
    const c = s[i];
    const n = s[i + 1];
    if (c === "/" && n === "/") {
      const e = s.indexOf("\n", i);
      i = e === -1 ? s.length : e;
      continue;
    }
    if (c === "/" && n === "*") {
      const e = s.indexOf("*/", i + 2);
      i = e === -1 ? s.length : e + 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < s.length && s[j] !== c) {
        if (s[j] === "\\") j++;
        else if (c !== "`" && s[j] === "\n") break;
        j++;
      }
      out += s.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    out += c;
    i++;
  }
  s = out;
  s = s.replace(/^\s*import\s[^;]*?from\s*["'][^"']+["'];?[ \t]*$/gms, "");
  s = s.replace(/^\s*import\s*["'][^"']+["'];?[ \t]*$/gm, "");
  s = s.replace(/^\s*export\s+(type\s+)?(\*|\{[^}]*\})(\s+as\s+\w+)?\s*from\s*["'][^"']+["'];?[ \t]*$/gms, "");
  return s
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const SOURCE_EXT = /\.(tsx?|[cm]?jsx?)$/;
const isGenerated = (path) => /\.generated\.[^/]+$/.test(path);

export function isCandidatePath(path, excludePrefixes = []) {
  if (!SOURCE_EXT.test(path)) return false;
  if (SKIP_PATH.test(path)) return false;
  return !excludePrefixes.some((p) => path.startsWith(p) || path.includes(`/${p}`));
}

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shingles(lines) {
  const toks = lines.join("\n").match(/[A-Za-z_$][\w$]*|\d+|\S/g) ?? [];
  const set = new Set();
  for (let i = 0; i + SHINGLE <= toks.length; i++) {
    set.add(hash32(toks.slice(i, i + SHINGLE).join(" ")));
  }
  return set;
}

function jaccard(a, b) {
  const [s, l] = a.size <= b.size ? [a, b] : [b, a];
  let inter = 0;
  for (const x of s) if (l.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

function lcsRatio(a, b) {
  const n = a.length;
  const m = b.length;
  let prev = new Uint32Array(m + 1);
  let cur = new Uint32Array(m + 1);
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    [prev, cur] = [cur, prev];
  }
  return (2 * prev[m]) / (n + m);
}

export function prepare(files) {
  const out = [];
  for (const f of files) {
    const lines = normalize(f.src);
    if (lines.length < MIN_LINES) continue;
    const sh = shingles(lines);
    if (sh.size < 10) continue;
    out.push({ ...f, lines, n: lines.length, sh, sample: [...sh].filter((h) => h % SAMPLE_MOD === 0) });
  }
  return out;
}

/**
 * left/right: [{ path, pkg, src }]. mode "cross" compares left against right
 * (different `side`); mode "within" compares every pair of `left` from
 * DIFFERENT pkgs. Returns [{ a, b, ratio }] with a/b the paths.
 */
export function findContentPairs({ left, right = null, crossPackage = false, differentPkg = false }) {
  const L = prepare(left);
  const R = crossPackage ? L : right.every((r) => r.sh) ? right : prepare(right);
  const index = new Map();
  R.forEach((f, i) => {
    for (const h of f.sample) {
      let p = index.get(h);
      if (!p) index.set(h, (p = []));
      p.push(i);
    }
  });
  for (const [h, p] of index) if (p.length > MAX_POSTING) index.delete(h);
  const found = [];
  L.forEach((f, li) => {
    const votes = new Map();
    for (const h of f.sample) {
      const p = index.get(h);
      if (p) for (const ri of p) votes.set(ri, (votes.get(ri) ?? 0) + 1);
    }
    for (const [ri, v] of votes) {
      const g = R[ri];
      if (crossPackage && (ri <= li || g.pkg === f.pkg)) continue;
      if (!crossPackage && g.path === f.path) continue;
      if (differentPkg && g.pkg === f.pkg) continue;
      if (isGenerated(f.path) !== isGenerated(g.path)) continue;
      const lo = Math.min(f.n, g.n);
      const hi = Math.max(f.n, g.n);
      if ((2 * lo) / (lo + hi) < THRESHOLD) continue;
      if (v < Math.min(f.sample.length, g.sample.length) * 0.4) continue;
      if (jaccard(f.sh, g.sh) < 0.6) continue;
      const ratio = lcsRatio(f.lines ?? f.loadLines(), g.lines ?? g.loadLines());
      if (ratio >= THRESHOLD) found.push({ a: f.path, b: g.path, ratio });
    }
  });
  return found;
}

export function pairKey(f) {
  return crossKey(f.a, f.b);
}
function crossKey(a, b) {
  return `${a}|${b}`;
}

/**
 * Tracked source files of a checkout with their INDEX content, read in ONE
 * `git cat-file --batch` stream (18k files in ~6s; opening them one by one took
 * over a minute on a busy Mac). The lane judges what is tracked/staged, which
 * is what the release gate ships; an unstaged edit is not seen until `git add`.
 * Returns [{ path, src }] for candidate paths with >= 400 bytes.
 */
function foreignEnv(foreign) {
  // A sibling checkout must not inherit THIS repo's GIT_INDEX_FILE / GIT_DIR (set by hooks and plumbing commits).
  const env = { ...process.env };
  if (foreign) for (const k of ["GIT_INDEX_FILE", "GIT_DIR", "GIT_WORK_TREE", "GIT_PREFIX"]) delete env[k];
  return env;
}

/** [{ path, hash }] of tracked source index entries passing `keep`. */
function trackedRows(dir, keep, { foreign = false } = {}) {
  return execFileSync("git", ["ls-files", "-s", "-z", "--", "*.ts", "*.tsx", "*.js", "*.mjs", "*.cjs", "*.jsx"], {
    cwd: dir,
    env: foreignEnv(foreign),
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  })
    .split("\0")
    .filter(Boolean)
    .map((r) => {
      const tab = r.indexOf("\t");
      return { hash: r.slice(0, tab).split(" ")[1], path: r.slice(tab + 1) };
    })
    .filter((r) => keep(r.path));
}

/** Blob contents for hashes, one `git cat-file --batch` stream. Returns Map hash -> string (blobs >= 400 bytes only). */
function readBlobs(dir, hashes, { foreign = false } = {}) {
  const out = new Map();
  if (hashes.length === 0) return out;
  const buf = execFileSync("git", ["cat-file", "--batch"], {
    cwd: dir,
    env: foreignEnv(foreign),
    input: hashes.join("\n") + "\n",
    maxBuffer: 1024 * 1024 * 1024,
  });
  let pos = 0;
  for (const h of hashes) {
    const nl = buf.indexOf(10, pos);
    const [, type, size] = buf.toString("latin1", pos, nl).split(" ");
    const len = Number(size);
    pos = nl + 1;
    if (type === "blob" && len >= 400) out.set(h, buf.toString("utf8", pos, pos + len));
    pos += len + 1;
  }
  return out;
}

function trackedSources(dir, keep, opts = {}) {
  const rows = trackedRows(dir, keep, opts);
  const blobs = readBlobs(dir, rows.map((r) => r.hash), opts);
  return rows
    .filter((r) => blobs.has(r.hash))
    .map((r) => ({ path: r.path, src: blobs.get(r.hash) }))
    .sort((x, y) => (x.path < y.path ? -1 : 1));
}

const CACHE_FILE = join(tmpdir(), "content-lane-pool-cache-v2.json");

/**
 * The write-time pool, prepared once and remembered by blob hash (content-addressed, so it is
 * valid for any checkout and any revision): a warm run reads NO package blob and tokenizes none —
 * only the few candidate pairs re-read their two blobs for the exact line comparison.
 * An unreadable/corrupt cache is ignored (rebuilt), never an error.
 */
function preparedPool(dir, keep, { foreign = false } = {}) {
  const rows = trackedRows(dir, keep, { foreign });
  let cache = {};
  try {
    cache = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
  } catch {
    cache = {};
  }
  const missing = [...new Set(rows.filter((r) => !(r.hash in cache)).map((r) => r.hash))];
  if (missing.length > 0) {
    const blobs = readBlobs(dir, missing, { foreign });
    for (const h of missing) {
      const src = blobs.get(h);
      const lines = src === undefined ? [] : normalize(src);
      const sh = lines.length < MIN_LINES ? new Set() : shingles(lines);
      cache[h] = sh.size < 10 ? 0 : [lines.length, [...sh]];
    }
    try {
      const tmp = `${CACHE_FILE}.${process.pid}.tmp`;
      writeFileSync(tmp, JSON.stringify(cache));
      renameSync(tmp, CACHE_FILE);
    } catch {
      /* a cache that cannot be written only costs the next run time */
    }
  }
  const out = [];
  for (const r of rows) {
    const c = cache[r.hash];
    if (!c) continue;
    const sh = new Set(c[1]);
    out.push({
      path: r.path,
      pkg: r.path.split("/")[0],
      n: c[0],
      sh,
      sample: c[1].filter((h) => h % SAMPLE_MOD === 0),
      loadLines: () => normalize(readBlobs(dir, [r.hash], { foreign }).get(r.hash) ?? ""),
    });
  }
  return out;
}

/** Which census lines are stale: pure, so the self-test can plant against it. */
export function staleContentCensus(census, foundKeys) {
  return (census ?? []).filter((e) => !foundKeys.has(e.pair)).map((e) => e.pair);
}

/** Remove only stale entry lines from the register text. Returns {text, removed}. */
export function pruneStaleText(text, stalePairs) {
  const lines = text.split("\n");
  let removed = 0;
  const kept = lines.filter((l) => {
    const hit = stalePairs.some((p) => l.includes(`"pair": ${JSON.stringify(p)}`));
    if (hit) removed++;
    return !hit;
  });
  return { text: kept.join("\n"), removed };
}

/**
 * Run the lane for a root. Returns { skipped, found, uncensused, stale, ms }.
 * `excludePrefixes` = vendored prefixes + register `contentLane.exclude`.
 */
export async function runContentLane({ root, register, registerPath, excludePrefixes, prune, log, error }) {
  const cfg = register.contentLane;
  if (!cfg) return { skipped: true, silent: true, ok: true };
  const t0 = Date.now();
  const ex = [...(excludePrefixes ?? []), ...(cfg.exclude ?? [])];
  let found;
  let scope;
  if (cfg.mode === "app-vs-packages") {
    const pkgRoot = resolve(root, cfg.packagesRoot);
    if (!existsSync(pkgRoot)) {
      error(`check:package-twins content lane SKIPPED: no package source at ${pkgRoot}`);
      return { skipped: true, ok: true };
    }
    const pkgSrc = trackedSources(pkgRoot, (p) => /^[^/]+\/src\//.test(p) && isCandidatePath(p, ex), { foreign: true }).map((f) => ({ ...f, pkg: f.path.split("/")[0] }));
    const appSrc = trackedSources(root, (p) => isCandidatePath(p, ex)).map((f) => ({ ...f, pkg: "app" }));
    found = findContentPairs({ left: appSrc, right: pkgSrc });
    scope = `${appSrc.length} app file(s) vs ${pkgSrc.length} package source file(s)`;
  } else if (cfg.mode === "cross-package") {
    const src = trackedSources(root, (p) => /^[^/]+\/src\//.test(p) && isCandidatePath(p, ex)).map((f) => ({ ...f, pkg: f.path.split("/")[0] }));
    found = findContentPairs({ left: src, crossPackage: true });
    found = found.map((f) => (f.a <= f.b ? f : { ...f, a: f.b, b: f.a }));
    scope = `${src.length} package source file(s), across different packages`;
  } else {
    error(`check:package-twins: contentLane.mode "${cfg.mode}" is not app-vs-packages or cross-package`);
    return { ok: false };
  }
  const census = register.contentCensus ?? [];
  const censusKeys = new Set(census.map((e) => e.pair));
  const keys = new Set(found.map(pairKey));
  const censused = found.filter((f) => censusKeys.has(pairKey(f)));
  const uncensused = found.filter((f) => !censusKeys.has(pairKey(f)));
  const stale = staleContentCensus(census, keys);
  const ms = Date.now() - t0;
  log(
    `check:package-twins content lane: ${scope}; ${found.length} duplicate pair(s) at >=${THRESHOLD} ` +
      `(${censused.length} censused DEBT, ${uncensused.length} new) in ${ms}ms.`,
  );
  if (stale.length > 0 && prune) {
    const text = readFileSync(registerPath, "utf8");
    const r = pruneStaleText(text, stale);
    writeFileSync(registerPath, r.text);
    log(`check:package-twins --prune-stale: removed ${r.removed} stale contentCensus line(s) from ${registerPath}.`);
    return { found, uncensused, stale: [], ms, ok: uncensused.length === 0 };
  }
  for (const f of uncensused) {
    error(
      `  content copy ${(f.ratio * 100).toFixed(0)}%: ${f.a}  <->  ${f.b}\n` +
        `    fix: delete one side and import the other. A copy you cannot remove this session goes in ` +
        `scripts/package-twins.json "contentCensus" as {"pair": "${pairKey(f)}", "reason": "…"} — debt, shrink-only.`,
    );
  }
  for (const s of stale) {
    error(
      `  STALE contentCensus entry (the copy is gone — good): delete the line containing\n` +
        `      "pair": "${s}"\n` +
        `    from ${registerPath}, or run \`node scripts/check-package-twins.mjs --prune-stale\` ` +
        `(removes only stale entries, never adds).`,
    );
  }
  return { found, uncensused, stale, ms, ok: uncensused.length === 0 && stale.length === 0 };
}

/**
 * Pure core of the write-time mode: `files` are the given files ([{path, src}]),
 * `pool` the package source ([{path, pkg, src}]). app-vs-packages: each file vs the
 * pool. cross-package: only files that are package source (`<pkg>/src/…`), each vs
 * the pool of a DIFFERENT package. Returns [{ file, other, ratio, key }] not in `censusKeys`.
 */
export function findFileCopies({ mode, files, pool, censusKeys = new Set() }) {
  let pairs;
  if (mode === "cross-package") {
    const left = files.filter((f) => /^[^/]+\/src\//.test(f.path)).map((f) => ({ ...f, pkg: f.path.split("/")[0] }));
    pairs = findContentPairs({ left, right: pool, differentPkg: true });
  } else {
    pairs = findContentPairs({ left: files.map((f) => ({ ...f, pkg: "app" })), right: pool });
  }
  const out = [];
  for (const p of pairs) {
    const key = mode === "cross-package" ? crossKey(...[p.a, p.b].sort()) : pairKey(p);
    if (censusKeys.has(key)) continue;
    out.push({ file: p.a, other: p.b, ratio: p.ratio, key });
  }
  return out;
}

export function formatFileCopy(f) {
  return (
    `  \u2717 ${f.file} \u2014 ${(f.ratio * 100).toFixed(0)}% copy of ${f.other}; delete one side and import the other ` +
    `(census entries in scripts/package-twins.json are existing debt)`
  );
}

/** Write-time entry: reads the given files from disk, indexes package source once. Returns the exit code. */
export function runFilesMode({ root, register, files, log = console.log, error = console.error }) {
  const cfg = register.contentLane;
  if (!cfg) return 0;
  const t0 = Date.now();
  const ex = [...(cfg.exclude ?? []), ...(register.vendored ?? []).map((v) => v?.path).filter((p) => typeof p === "string")];
  const given = [];
  for (const rel of files) {
    if (!isCandidatePath(rel, ex)) continue;
    const abs = resolve(root, rel);
    if (!existsSync(abs)) continue;
    const src = readFileSync(abs, "utf8");
    if (src.length >= 400) given.push({ path: rel.replace(/^\.\//, ""), src });
  }
  if (given.length === 0) return 0;
  let pool;
  if (cfg.mode === "app-vs-packages") {
    const pkgRoot = resolve(root, cfg.packagesRoot);
    if (!existsSync(pkgRoot)) {
      error(`content-lane --files SKIPPED: no package source at ${pkgRoot}; nothing was checked.`);
      return 0;
    }
    pool = preparedPool(pkgRoot, (p) => /^[^/]+\/src\//.test(p) && isCandidatePath(p, ex), { foreign: true });
  } else if (cfg.mode === "cross-package") {
    pool = preparedPool(root, (p) => /^[^/]+\/src\//.test(p) && isCandidatePath(p, ex));
  } else {
    error(`content-lane --files SKIPPED: contentLane.mode "${cfg.mode}" unknown; nothing was checked.`);
    return 0;
  }
  const censusKeys = new Set((register.contentCensus ?? []).map((e) => e.pair));
  const found = findFileCopies({ mode: cfg.mode, files: given, pool, censusKeys });
  for (const f of found) error(formatFileCopy(f));
  log(`content-lane --files: ${given.length} file(s) vs ${pool.length} package source file(s), ${found.length} new copy(ies) in ${Date.now() - t0}ms.`);
  return found.length > 0 ? 1 : 0;
}

// ── self-test ───────────────────────────────────────────────────────────────
const SYNTH = Array.from({ length: 30 }, (_, i) =>
  `export function planted${i}(value: number, scale: number): number { const r = value * ${i + 3} + scale; return r > ${i * 7} ? r : ${i}; }`,
).join("\n");

export function selfTestContentLane({ sampleSource = null } = {}) {
  const fail = (msg) => {
    console.error(`check:package-twins content lane self-test FAILED — ${msg}`);
    process.exit(1);
  };
  const body = sampleSource && normalize(sampleSource).length >= MIN_LINES ? sampleSource : SYNTH;
  const pkg = [
    { path: "sharing/src/real.ts", pkg: "sharing", src: body },
    { path: "kit/src/other.ts", pkg: "kit", src: SYNTH.replace(/planted/g, "different").replace(/\* (\d+)/g, "+ $1") + "\nconst z = 1;\n".repeat(0) },
  ];
  // 1. a copy under an app path (imports and comments differ) IS reported
  const copy = `import { x } from "@/somewhere";\n// my copy\n${body}\n/* trailing */\n`;
  let r = findContentPairs({ left: [{ path: "features/x/copy.ts", pkg: "app", src: copy }], right: pkg });
  if (!r.some((f) => f.a === "features/x/copy.ts" && f.b === "sharing/src/real.ts")) fail("a planted copy was NOT reported");
  // 2. an unrelated file is not
  const unrelated = Array.from({ length: 30 }, (_, i) => `const unrelated${i} = fetch("/api/thing/${i}").then((res) => res.json()).catch(() => null);`).join("\n");
  r = findContentPairs({ left: [{ path: "features/x/unrelated.ts", pkg: "app", src: unrelated }], right: pkg });
  if (r.length) fail("an unrelated file was reported");
  // 3. a pure re-export door (25 export-from lines) is not
  const door = Array.from({ length: 25 }, (_, i) => `export { planted${i} } from "@ai-matrx/sharing";`).join("\n");
  r = findContentPairs({ left: [{ path: "features/x/door.ts", pkg: "app", src: door }], right: [{ path: "sharing/src/door.ts", pkg: "sharing", src: door }] });
  if (r.length) fail("a pure re-export door was reported");
  // 4. a two-line option-binding wrapper is not
  const wrap = `import { f } from "@ai-matrx/kit";\nexport const g = (v: number) => f(v, { style: "coarse" });\n`;
  r = findContentPairs({ left: [{ path: "a/wrap.ts", pkg: "app", src: wrap }], right: [{ path: "kit/src/wrap.ts", pkg: "kit", src: wrap }] });
  if (r.length) fail("an option-binding wrapper was reported");
  // 5. cross-package: same package twice is not, different packages is
  r = findContentPairs({ crossPackage: true, left: [{ path: "a/src/1.ts", pkg: "a", src: body }, { path: "a/src/2.ts", pkg: "a", src: copy }] });
  if (r.length) fail("a same-package pair was reported");
  r = findContentPairs({ crossPackage: true, left: [{ path: "a/src/1.ts", pkg: "a", src: body }, { path: "b/src/2.ts", pkg: "b", src: copy }] });
  if (r.length !== 1) fail("a cross-package copy was not reported");
  // 6. the census ratchet: stale entries are named, live ones are not
  const stale = staleContentCensus([{ pair: "gone|gone2" }, { pair: "x|y" }], new Set(["x|y"]));
  if (stale.length !== 1 || stale[0] !== "gone|gone2") fail("the stale-census ratchet did not name the stale entry");
  const pruned = pruneStaleText('  { "pair": "gone|gone2", "reason": "r" },\n  { "pair": "x|y", "reason": "r" }\n', ["gone|gone2"]);
  if (pruned.removed !== 1 || pruned.text.includes("gone")) fail("--prune-stale did not remove exactly the stale line");
  // 7. skip rules
  if (isCandidatePath("a/b.test.ts") || isCandidatePath("demo/a.ts") || isCandidatePath("examples/a.ts") || isCandidatePath("x/dist/a.ts") || isCandidatePath("a/b.d.ts")) fail("a skipped path was a candidate");
  if (!isCandidatePath("a/b.tsx") || !isCandidatePath("a/b.mjs") || !isCandidatePath("a/b.js") || !isCandidatePath("a/b.generated.ts")) fail("a normal, .js/.mjs or generated path was skipped");
  // 7b. generated twins: caught against another generated file, never against a hand-written one
  r = findContentPairs({ crossPackage: true, left: [{ path: "a/src/keys.generated.ts", pkg: "a", src: body }, { path: "b/src/keys.generated.ts", pkg: "b", src: body }] });
  if (r.length !== 1) fail("a planted generated twin was NOT reported");
  r = findContentPairs({ crossPackage: true, left: [{ path: "a/src/keys.generated.ts", pkg: "a", src: body }, { path: "b/src/keys.ts", pkg: "b", src: body }] });
  if (r.length) fail("a generated file was compared against a hand-written one");
  // 7c. a .mjs twin is seen (the lane used to read .ts/.tsx only)
  r = findContentPairs({ left: [{ path: "scripts/copy.mjs", pkg: "app", src: copy }], right: [{ path: "sharing/src/real.mjs", pkg: "sharing", src: body }] });
  if (r.length !== 1) fail("a planted .mjs twin was NOT reported");
  // 8. write-time --files mode: a planted copy is reported; a censused pair, a door, an unrelated file, a same-package file are not
  const poolPkg = [{ path: "sharing/src/real.ts", pkg: "sharing", src: body }];
  let w = findFileCopies({ mode: "app-vs-packages", files: [{ path: "features/x/copy.ts", src: copy }], pool: poolPkg });
  if (w.length !== 1 || w[0].file !== "features/x/copy.ts" || w[0].other !== "sharing/src/real.ts") fail("--files: a planted copy was NOT reported");
  if (!/^ {2}\u2717 features\/x\/copy\.ts \u2014 \d+% copy of sharing\/src\/real\.ts; delete one side/.test(formatFileCopy(w[0]))) fail("--files: the finding line does not match the lint-guard format");
  w = findFileCopies({ mode: "app-vs-packages", files: [{ path: "features/x/copy.ts", src: copy }], pool: poolPkg, censusKeys: new Set(["features/x/copy.ts|sharing/src/real.ts"]) });
  if (w.length) fail("--files: a censused pair was reported");
  w = findFileCopies({ mode: "app-vs-packages", files: [{ path: "features/x/door.ts", src: door }], pool: [{ path: "sharing/src/door.ts", pkg: "sharing", src: door }] });
  if (w.length) fail("--files: a door file was reported");
  w = findFileCopies({ mode: "app-vs-packages", files: [{ path: "features/x/unrelated.ts", src: unrelated }], pool: poolPkg });
  if (w.length) fail("--files: an unrelated file was reported");
  w = findFileCopies({ mode: "cross-package", files: [{ path: "b/src/2.ts", src: copy }], pool: [{ path: "a/src/1.ts", pkg: "a", src: body }, { path: "b/src/2.ts", pkg: "b", src: copy }] });
  if (w.length !== 1 || w[0].other !== "a/src/1.ts") fail("--files: a cross-package copy was not reported (or its own file / same package was)");
  w = findFileCopies({ mode: "cross-package", files: [{ path: "b/src/2.ts", src: copy }], pool: [{ path: "a/src/1.ts", pkg: "a", src: body }], censusKeys: new Set(["a/src/1.ts|b/src/2.ts"]) });
  if (w.length) fail("--files: a censused cross-package pair was reported");
  if (findFileCopies({ mode: "cross-package", files: [{ path: "scripts/x.ts", src: copy }], pool: [{ path: "a/src/1.ts", pkg: "a", src: body }] }).length) fail("--files: a non-package file was compared in cross-package mode");
  console.log("check:package-twins content lane self-test PASSED (copy reported, incl. a .mjs twin and a generated twin; unrelated, door, wrapper, same-package, generated-vs-handwritten not; stale census named and prunable; --files mode reports a copy, skips censused/door/unrelated).");
}

// ── CLI: `node scripts/content-lane.mjs --files <paths...> | --self-test` ────
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.includes("--self-test")) {
    selfTestContentLane();
  } else if (argv.includes("--files")) {
    const files = argv.slice(argv.indexOf("--files") + 1).filter((a) => !a.startsWith("--"));
    const registerPath = resolve(dirname(fileURLToPath(import.meta.url)), "package-twins.json");
    process.exit(runFilesMode({ root: process.cwd(), register: JSON.parse(readFileSync(registerPath, "utf8")), files }));
  } else {
    console.error("usage: node scripts/content-lane.mjs --files <repo-relative paths...> | --self-test");
    process.exit(2);
  }
}
