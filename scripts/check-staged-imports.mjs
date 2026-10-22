#!/usr/bin/env node
/**
 * check-staged-imports.mjs — a commit may not carry an import of a LOCAL file or export the
 * commit itself does not carry.
 *
 * THE CLASS (2026-10-21/22, about half of 17 failed production builds): a FIRST-PARTY partial
 * commit. A committed file imported a local file or export that was still uncommitted on disk:
 * FrameHostImpl.tsx -> `./framePageHeader` (2c3ea8c9a6; the file reached main 12 h later),
 * AddMoreQuestionsButton.tsx -> `lineageSourcesOf` (9cba727cc7), nameFromSources,
 * DEFAULT_AGENT_MODEL_ID, a generated overlay-definitions export. The paths: the sweeper
 * (scripts/sync-main.py) committing one session's file while its sibling is held or unstaged;
 * temp-index / plumbing commits; pathspec commits that miss a new helper. Every checker before
 * this one read the WORKING TREE, where the sibling exists, so all of them were green.
 *
 * WHAT IT DOES. For each staged code file it reads the STAGED blob, parses its imports and
 * re-exports (static `import`, `export … from`, `import x = require()`, literal `import()`), and
 * resolves each relative and tsconfig-alias specifier (`@/` and friends, read from the indexed
 * tsconfig.json) against the INDEX tree, never the disk, with the bundler's rules: exact path,
 * then .tsx/.ts/.jsx/.js/.mjs/.cjs/.mts/.cts/.json, then <dir>/index.*, and `.js` -> `.ts`/`.tsx`
 * (also .mjs -> .mts, .cjs -> .cts, .jsx -> .tsx). It fails when:
 *   - the target file is absent from the index                          (missing-file)
 *   - a named import / re-export, or a default import, is not exported by
 *     the target's indexed blob, following `export *` chains (depth 8)    (missing-export)
 * Type-only imports (`import type`, `{ type X }`, `export type { … } from`) are erased by the
 * compiler and required of nothing. Exported types satisfy a plain named import (SWC drops an
 * import used only as a type). A target the parser cannot judge (CommonJS, `export =`, a script
 * .d.ts, JSON, a non-code asset, a star re-export of a package) satisfies every name.
 *
 * Parser: TypeScript's (as check-parse.mjs), not esbuild/SWC: it is already loaded by every
 * write-time guard here and it reports type-only specifiers exactly, which esbuild's metafile
 * does not. Parsed results are cached by blob sha in ~/.cache/matrx/staged-imports-v1.json.
 *
 *   node scripts/check-staged-imports.mjs                    # the staged files (pre-commit)
 *   node scripts/check-staged-imports.mjs --index <file>     # judge a temp index (GIT_INDEX_FILE)
 *   node scripts/check-staged-imports.mjs --files a.ts b.tsx # only these index paths
 *   node scripts/check-staged-imports.mjs --all [--tree HEAD]# every tracked code file
 *   node scripts/check-staged-imports.mjs --json             # one JSON line on stdout (the sweep)
 *   node scripts/check-staged-imports.mjs --self-test        # red on each plant, green once fixed
 *
 * Commit time only. Under MATRX_RELEASE_PATH=1 it reports and exits 0: nothing stops a release.
 * Exit: 0 clean · 1 finding(s) · 2 could not run · 3 self-test failed
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, posix } from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = [() => require("typescript"), () => require("typescript-js-api")]
  .map((load) => { try { return load(); } catch { return null; } })
  .find((m) => typeof m?.createSourceFile === "function");
if (!ts) {
  process.stderr.write("check-staged-imports: the TypeScript parser is not installed; nothing judged.\n");
  process.exit(2);
}

const ARGS = process.argv.slice(2);
const flag = (n) => ARGS.includes(n);
const opt = (n) => (ARGS.includes(n) ? ARGS[ARGS.indexOf(n) + 1] : null);
const JSON_OUT = flag("--json");
const ALL = flag("--all");
const TREE = opt("--tree");
const INDEX = opt("--index");
const FILES = flag("--files") ? ARGS.slice(ARGS.indexOf("--files") + 1).filter((a) => !a.startsWith("--")) : null;
const RELEASE_PATH = process.env.MATRX_RELEASE_PATH === "1";

export const CODE_FILE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
/** Never judged as importers: saved conflict copies, scratch, vendored trees. */
const SKIP_IMPORTER = /(^|\/)(node_modules|\.next|_conflicts|\.wt)\/|\.held$/;
const RESOLVE_EXTS = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs", ".mts", ".cts", ".json"];
const EXT_ALIAS = { ".js": [".ts", ".tsx", ".js"], ".jsx": [".tsx", ".jsx"], ".mjs": [".mts", ".mjs"], ".cjs": [".cts", ".cjs"] };
const STAR_DEPTH = 8;
const CACHE_VERSION = 1;
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

function scriptKindOf(file) {
  if (/\.(tsx|jsx|js)$/.test(file)) return ts.ScriptKind.TSX; // Next accepts JSX in .js (as check-parse.mjs)
  if (/\.(mjs|cjs)$/.test(file)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

/* ── parsing ─────────────────────────────────────────────────────────────── */

function bindingNames(name, out) {
  if (ts.isIdentifier(name)) out.push(name.text);
  else for (const el of name.elements) if (!ts.isOmittedExpression(el)) bindingNames(el.name, out);
}
const textOf = (n) => (ts.isIdentifier(n) || ts.isStringLiteral(n) ? n.text : n.getText());
const hasMod = (node, kind) => (ts.canHaveModifiers?.(node) ? ts.getModifiers(node) : node.modifiers)?.some((m) => m.kind === kind);

/**
 * One file's module surface: what it requires of others and what it offers.
 *   imports: [{ spec, line, names: [string], dynamic? }]   (names = value names required; "default" for a default import)
 *   exports: [string]                                      (value AND type names, "default" included)
 *   stars:   [spec]                                        (`export * from spec`, to follow)
 *   any:     true when the surface cannot be judged (CJS, `export =`, a global script .d.ts)
 */
export function parseModule(file, source) {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKindOf(file));
  const imports = [];
  const exports = new Set();
  const stars = [];
  let any = false;
  let esm = false;
  const lineOf = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st)) {
      esm = true;
      if (!ts.isStringLiteral(st.moduleSpecifier)) continue;
      const clause = st.importClause;
      if (clause?.isTypeOnly) continue;
      const names = [];
      if (clause?.name) names.push("default");
      const nb = clause?.namedBindings;
      if (nb && ts.isNamedImports(nb)) {
        for (const el of nb.elements) if (!el.isTypeOnly) names.push(textOf(el.propertyName ?? el.name));
      }
      imports.push({ spec: st.moduleSpecifier.text, line: lineOf(st), names });
    } else if (ts.isExportDeclaration(st)) {
      esm = true;
      const spec = st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier) ? st.moduleSpecifier.text : null;
      const ec = st.exportClause;
      if (!ec) {
        if (spec && !st.isTypeOnly) { stars.push(spec); imports.push({ spec, line: lineOf(st), names: [] }); }
        else if (spec) stars.push(spec); // `export type * from` still offers type names
        continue;
      }
      if (ts.isNamespaceExport(ec)) {
        exports.add(textOf(ec.name));
        if (spec && !st.isTypeOnly) imports.push({ spec, line: lineOf(st), names: [] });
        continue;
      }
      const names = [];
      for (const el of ec.elements) {
        exports.add(textOf(el.name));
        if (spec && !st.isTypeOnly && !el.isTypeOnly) names.push(textOf(el.propertyName ?? el.name));
      }
      if (spec && !st.isTypeOnly) imports.push({ spec, line: lineOf(st), names });
    } else if (ts.isExportAssignment(st)) {
      esm = true;
      if (st.isExportEquals) any = true;
      else exports.add("default");
    } else if (ts.isImportEqualsDeclaration(st)) {
      if (hasMod(st, ts.SyntaxKind.ExportKeyword)) { esm = true; exports.add(st.name.text); }
      const ref = st.moduleReference;
      if (!st.isTypeOnly && ts.isExternalModuleReference(ref) && ts.isStringLiteral(ref.expression)) {
        imports.push({ spec: ref.expression.text, line: lineOf(st), names: [] });
      }
    } else if (hasMod(st, ts.SyntaxKind.ExportKeyword)) {
      esm = true;
      const isDefault = hasMod(st, ts.SyntaxKind.DefaultKeyword);
      if (ts.isVariableStatement(st)) {
        const out = [];
        for (const d of st.declarationList.declarations) bindingNames(d.name, out);
        out.forEach((n) => exports.add(n));
      } else if (isDefault) {
        exports.add("default");
      } else if (st.name && (ts.isIdentifier(st.name) || ts.isStringLiteral(st.name))) {
        exports.add(st.name.text); // function, class, interface, type, enum, namespace
      }
    }
  }
  // Literal dynamic import() anywhere: the file must exist (names are not judged).
  const visit = (n) => {
    if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const a = n.arguments[0];
      if (a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))) {
        imports.push({ spec: a.text, line: lineOf(n), names: [], dynamic: true });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  if (!esm) {
    // No module syntax at all: CommonJS, or a global-script .d.ts. Its surface is not knowable here.
    if (/\.d\.[mc]?ts$/.test(file) || /\.(c?js|jsx|cts)$/.test(file) || /\bmodule\.exports\b|\bexports\.\w/.test(source)) any = true;
  }
  return { imports, exports: [...exports], stars, any };
}

/* ── git / index ─────────────────────────────────────────────────────────── */

function makeGit(cwd, indexFile) {
  const env = { ...process.env };
  if (indexFile) env.GIT_INDEX_FILE = indexFile;
  const run = (args, opts = {}) =>
    execFileSync("git", args, { cwd, env, maxBuffer: 1 << 30, stdio: ["pipe", "pipe", "pipe"], ...opts });
  return {
    text: (args) => run(args, { encoding: "utf8" }),
    /** sha -> Buffer, via one `git cat-file --batch` per call. */
    blobs(shas) {
      const out = new Map();
      const uniq = [...new Set(shas)];
      if (!uniq.length) return out;
      const buf = run(["cat-file", "--batch"], { input: uniq.join("\n") + "\n" });
      let pos = 0;
      while (pos < buf.length) {
        const nl = buf.indexOf(10, pos);
        const header = buf.subarray(pos, nl).toString("utf8").split(" ");
        pos = nl + 1;
        if (header[1] === "missing") continue;
        const size = Number(header[2]);
        out.set(header[0], buf.subarray(pos, pos + size));
        pos += size + 1;
      }
      return out;
    },
  };
}

/** path -> blob sha, from the index (default) or a tree-ish. */
function readTree(g, tree) {
  const map = new Map();
  if (tree) {
    for (const rec of g.text(["ls-tree", "-r", "-z", "--full-tree", tree]).split("\0")) {
      if (!rec) continue;
      const tab = rec.indexOf("\t");
      const [, type, sha] = rec.slice(0, tab).split(" ");
      if (type === "blob") map.set(rec.slice(tab + 1), sha);
    }
  } else {
    for (const rec of g.text(["ls-files", "-s", "-z"]).split("\0")) {
      if (!rec) continue;
      const tab = rec.indexOf("\t");
      const [, sha, stage] = rec.slice(0, tab).split(" ");
      if (stage === "0" || !map.has(rec.slice(tab + 1))) map.set(rec.slice(tab + 1), sha);
    }
  }
  return map;
}

/* ── resolution ──────────────────────────────────────────────────────────── */

/** tsconfig `paths` -> [{ prefix, exact, targets: [prefix] }], longest prefix first. */
export function aliasesFrom(tsconfigText) {
  const parsed = ts.parseConfigFileTextToJson("tsconfig.json", tsconfigText ?? "{}").config ?? {};
  const paths = parsed.compilerOptions?.paths ?? {};
  const base = (parsed.compilerOptions?.baseUrl ?? ".").replace(/^\.\/?/, "");
  const out = [];
  for (const [key, targets] of Object.entries(paths)) {
    const wild = key.endsWith("*");
    out.push({
      prefix: wild ? key.slice(0, -1) : key,
      exact: !wild,
      targets: targets.map((t) => posix.normalize(posix.join(base, t.replace(/\*$/, ""))).replace(/^\.\/?$/, "").replace(/^\.\//, "")),
    });
  }
  return out.sort((a, b) => b.prefix.length - a.prefix.length);
}

/** Candidate base paths (repo-relative, no resolution yet) for a specifier, or null if it is a package. */
export function specBases(fromFile, spec, aliases, root = null) {
  const s = spec.replace(/[?#].*$/, "");
  if (s.startsWith("./") || s.startsWith("../") || s === "." || s === "..") {
    const p = posix.normalize(posix.join(posix.dirname(fromFile), s));
    // A path that climbs out of the repository (../aidream/...) is not this commit's to carry.
    return p.startsWith("../") || p === ".." ? null : [p];
  }
  // An absolute filesystem path inside this checkout is judged repo-relative; any other absolute
  // path is the tsconfig `/*` -> public/* asset alias, or a file outside the repository.
  if (root && s.startsWith(root + "/")) return [s.slice(root.length + 1)];
  for (const a of aliases) {
    if (a.exact ? s === a.prefix : s.startsWith(a.prefix)) {
      // `/*` -> public/* is for URL-like asset specifiers only; never claim a bare package for it.
      if (a.prefix === "/" && !s.startsWith("/")) continue;
      if (a.prefix === "/") return { outside: a.targets.map((t) => posix.join(t, s.slice(1))) };
      const rest = a.exact ? "" : s.slice(a.prefix.length);
      return a.targets.map((t) => posix.normalize(t ? posix.join(t, rest) : rest || "."));
    }
  }
  return null;
}

/** The bundler's resolution of one base against the index; returns the path or null. */
export function resolveIn(index, base, dirs) {
  const tryOne = (p) => (index.has(p) ? p : null);
  const ext = posix.extname(base);
  if (ext && tryOne(base)) return base;
  if (EXT_ALIAS[ext]) {
    const stem = base.slice(0, -ext.length);
    for (const e of EXT_ALIAS[ext]) if (tryOne(stem + e)) return stem + e;
  }
  for (const e of RESOLVE_EXTS) if (tryOne(base + e)) return base + e;
  for (const e of RESOLVE_EXTS) if (tryOne(`${base}/index${e}`)) return `${base}/index${e}`;
  if (tryOne(`${base}/package.json`)) return `${base}/package.json`;
  // A specifier with a non-code extension that exists as a directory prefix is still a miss.
  void dirs;
  return null;
}

/* ── the check ───────────────────────────────────────────────────────────── */

function loadCache(path) {
  try {
    const c = JSON.parse(readFileSync(path, "utf8"));
    if (c.v === CACHE_VERSION) return c;
  } catch {}
  return { v: CACHE_VERSION, m: {} };
}

/**
 * Judge `importers` (repo paths in `index`) against `index`. Returns findings:
 *   { file, line, specifier, kind: "missing-file"|"missing-export", name?, target?, tried: [path] }
 */
export function checkImports({ g, index, importers, cache, root = null, stats = null }) {
  const parsed = new Map(); // path -> module surface
  const kindKey = (p) => (/\.(tsx|jsx|js)$/.test(p) ? "x" : /\.(mjs|cjs)$/.test(p) ? "j" : "t") + (/\.d\.[mc]?ts$/.test(p) ? "d" : "");
  function ensure(paths) {
    const need = [];
    for (const p of paths) {
      if (parsed.has(p) || !CODE_FILE.test(p)) continue;
      const sha = index.get(p);
      if (!sha) continue;
      const hit = cache.m[`${sha}:${kindKey(p)}`];
      if (hit) parsed.set(p, hit);
      else need.push(p);
    }
    if (!need.length) return;
    const blobs = g.blobs(need.map((p) => index.get(p)));
    for (const p of need) {
      const sha = index.get(p);
      const buf = blobs.get(sha);
      let mod;
      try {
        mod = buf ? parseModule(p, buf.toString("utf8")) : { imports: [], exports: [], stars: [], any: true };
      } catch {
        mod = { imports: [], exports: [], stars: [], any: true };
      }
      parsed.set(p, mod);
      cache.m[`${sha}:${kindKey(p)}`] = mod;
      cache.dirty = true;
    }
  }

  const aliases = aliasesFrom(index.has("tsconfig.json") ? g.blobs([index.get("tsconfig.json")]).get(index.get("tsconfig.json"))?.toString("utf8") : null);
  const resolve = (from, spec) => {
    const bases = specBases(from, spec, aliases, root);
    if (!bases) return { pkg: true };
    if (bases.outside) {
      // `/x`: public/x when it is there, else a filesystem path outside the repository (not judged).
      for (const b of bases.outside) { const hit = resolveIn(index, b); if (hit) return { path: hit, bases: bases.outside }; }
      return { pkg: true };
    }
    for (const b of bases) {
      const hit = resolveIn(index, b);
      if (hit) return { path: hit, bases };
    }
    return { path: null, bases };
  };

  const list = importers.filter((p) => CODE_FILE.test(p) && !SKIP_IMPORTER.test(p) && index.has(p));
  ensure(list);

  // Round 2: every target named by an importer; then follow `export *` chains breadth-first.
  const edges = [];
  const targets = new Set();
  for (const file of list) {
    for (const imp of parsed.get(file)?.imports ?? []) {
      const r = resolve(file, imp.spec);
      if (r.pkg) continue;
      edges.push({ file, imp, r });
      if (r.path && imp.names.length) targets.add(r.path);
    }
  }
  let frontier = [...targets];
  for (let d = 0; d < STAR_DEPTH && frontier.length; d++) {
    ensure(frontier);
    const next = [];
    for (const t of frontier) {
      for (const s of parsed.get(t)?.stars ?? []) {
        const r = resolve(t, s);
        if (r.path && !parsed.has(r.path)) next.push(r.path);
      }
    }
    frontier = [...new Set(next)];
  }

  /** Every name `path` offers, or null for "anything". */
  const surfaceMemo = new Map();
  function surface(path, depth = 0, seen = new Set()) {
    if (surfaceMemo.has(path)) return surfaceMemo.get(path);
    if (!CODE_FILE.test(path)) return null; // JSON, assets, package.json dirs: not judged
    const mod = parsed.get(path);
    if (!mod || mod.any) return null;
    if (seen.has(path)) return new Set();
    seen.add(path);
    const names = new Set(mod.exports);
    for (const s of mod.stars) {
      const r = resolve(path, s);
      if (r.pkg) return null; // `export * from "pkg"`: the package's names are not judged here
      if (!r.path) continue; // a broken star is reported where it is written, not here
      if (depth + 1 >= STAR_DEPTH || !parsed.has(r.path)) return null;
      const sub = surface(r.path, depth + 1, seen);
      if (sub === null) return null;
      for (const n of sub) if (n !== "default") names.add(n);
    }
    if (depth === 0) surfaceMemo.set(path, names);
    return names;
  }

  const findings = [];
  for (const { file, imp, r } of edges) {
    if (!r.path) {
      findings.push({ file, line: imp.line, specifier: imp.spec, kind: "missing-file", tried: r.bases });
      continue;
    }
    if (!imp.names.length) continue;
    const offered = surface(r.path);
    if (stats) stats[offered === null ? "unjudged" : "judged"] = (stats[offered === null ? "unjudged" : "judged"] ?? 0) + 1;
    if (offered === null) { if (stats) (stats.unjudgedTargets ??= {})[r.path] = 1; continue; }
    for (const name of imp.names) {
      if (!offered.has(name)) findings.push({ file, line: imp.line, specifier: imp.spec, kind: "missing-export", name, target: r.path });
    }
  }
  return findings;
}

/** The working-tree path that would satisfy a finding, if one exists on disk (the sweep's sibling). */
export function diskSibling(root, finding) {
  if (finding.kind === "missing-export") return existsSync(join(root, finding.target)) ? finding.target : null;
  for (const b of finding.tried ?? []) {
    const disk = { has: (p) => { try { return statSync(join(root, p)).isFile(); } catch { return false; } } };
    const hit = resolveIn(disk, b);
    if (hit) return hit;
  }
  return null;
}

export function describe(f) {
  return f.kind === "missing-file"
    ? `${f.file}:${f.line}  imports "${f.specifier}" — no such file in this commit (tried ${f.tried.map((t) => t + ".*").join(", ")})`
    : `${f.file}:${f.line}  imports { ${f.name} } from "${f.specifier}" — ${f.target} as committed does not export it`;
}

export function run(opts) {
  const { cwd, indexFile = null, tree = null, all = false, files = null } = opts;
  const t0 = Date.now();
  const g = makeGit(cwd, indexFile);
  const root = g.text(["rev-parse", "--show-toplevel"]).trim();
  const index = readTree(g, tree);
  let importers;
  if (files) importers = files;
  else if (all || tree) importers = [...index.keys()];
  else {
    let base = "HEAD";
    try { g.text(["rev-parse", "--verify", "-q", "HEAD"]); } catch { base = EMPTY_TREE; }
    importers = g.text(["diff", "--cached", "--name-only", "-z", "--diff-filter=ACMR", base]).split("\0").filter(Boolean);
  }
  const cacheFile = join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "matrx", "staged-imports-v1.json");
  const cache = loadCache(cacheFile);
  const findings = checkImports({ g, index, importers, cache, root, stats: opts.stats ?? null });
  if (cache.dirty) {
    try {
      mkdirSync(dirname(cacheFile), { recursive: true });
      delete cache.dirty;
      writeFileSync(cacheFile, JSON.stringify(cache));
    } catch {}
  }
  for (const f of findings) f.sibling = diskSibling(root, f);
  return { root, findings, checked: importers.filter((p) => CODE_FILE.test(p)).length, seconds: ((Date.now() - t0) / 1000).toFixed(2) };
}

/* ── self-test ───────────────────────────────────────────────────────────── */

function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), "staged-imports-"));
  const sh = (args, input) => execFileSync("git", args, { cwd: dir, encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"] });
  const put = (p, text) => { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), text); };
  let failed = 0;
  const expect = (label, cond) => { if (!cond) failed++; process.stdout.write(`${cond ? "ok  " : "FAIL"} ${label}\n`); };
  try {
    sh(["init", "-q", "-b", "main"]);
    put("tsconfig.json", '{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }\n');
    put("lib/base.ts", "export const a = 1;\nexport type T = string;\nexport default function f() {}\n");
    put("lib/barrel.ts", 'export * from "./base";\nexport { a as renamed } from "./base";\n');
    sh(["add", "."]); sh(["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "base"]);

    // R1 missing file: the importer is staged, its new helper is only on disk.
    put("features/page.tsx", 'import { helper } from "./framePageHeader";\nexport const P = helper;\n');
    put("features/framePageHeader.ts", "export const helper = 1;\n");
    sh(["add", "features/page.tsx"]);
    let r = run({ cwd: dir });
    expect("R1 missing file is red", r.findings.length === 1 && r.findings[0].kind === "missing-file" && r.findings[0].file === "features/page.tsx");
    expect("R1 names the disk sibling", r.findings[0]?.sibling === "features/framePageHeader.ts");
    sh(["add", "features/framePageHeader.ts"]);
    expect("R1 green once the sibling is staged", run({ cwd: dir }).findings.length === 0);

    // R2 missing export via the `@/` alias and through an `export *` chain.
    put("features/q.tsx", 'import { lineageSourcesOf, a, type T } from "@/lib/barrel";\nimport f from "@/lib/base";\nexport const Q = [lineageSourcesOf, a, f];\n');
    sh(["add", "features/q.tsx"]);
    r = run({ cwd: dir });
    expect("R2 missing export is red", r.findings.length === 1 && r.findings[0].kind === "missing-export" && r.findings[0].name === "lineageSourcesOf");
    put("lib/base.ts", "export const a = 1;\nexport type T = string;\nexport const lineageSourcesOf = 2;\nexport default function f() {}\n");
    expect("R2 still red while the export is only on disk", run({ cwd: dir }).findings.length === 1);
    sh(["add", "lib/base.ts"]);
    expect("R2 green once the export is staged (followed through export *)", run({ cwd: dir }).findings.length === 0);

    // R3 missing re-export.
    put("lib/index.ts", 'export { nameFromSources } from "./names";\nexport type { Ghost } from "./ghost";\n');
    put("lib/names.ts", "export const other = 1;\n");
    sh(["add", "lib/index.ts", "lib/names.ts"]);
    r = run({ cwd: dir });
    expect("R3 missing re-export is red (type-only re-export of a missing file is not)", r.findings.length === 1 && r.findings[0].name === "nameFromSources");
    put("lib/names.ts", "export const other = 1;\nexport function nameFromSources() {}\n");
    sh(["add", "lib/names.ts"]);
    expect("R3 green once the re-export target exports it", run({ cwd: dir }).findings.length === 0);

    // R4 `.js` -> `.ts`, index files, dynamic import, and --index on a temp index.
    put("tools/a.mjs", 'import { x } from "./b.js";\nexport const y = () => import("./dyn");\n');
    put("tools/b.ts", "export const x = 1;\n");
    sh(["add", "tools/a.mjs", "tools/b.ts"]);
    r = run({ cwd: dir });
    expect("R4 dynamic import of a missing file is red, .js->.ts resolves", r.findings.length === 1 && r.findings[0].specifier === "./dyn");
    const tmpIndex = join(dir, ".git", "tmp-index");
    execFileSync("git", ["read-tree", "HEAD"], { cwd: dir, env: { ...process.env, GIT_INDEX_FILE: tmpIndex } });
    execFileSync("git", ["update-index", "--add", "features/page.tsx"], { cwd: dir, env: { ...process.env, GIT_INDEX_FILE: tmpIndex } });
    r = run({ cwd: dir, indexFile: tmpIndex, files: ["features/page.tsx"] });
    expect("R5 --index judges the temp index, not the real one", r.findings.length === 1 && r.findings[0].kind === "missing-file");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  process.stdout.write(failed ? `check-staged-imports self-test: ${failed} FAILED\n` : "check-staged-imports self-test: all rules red then green\n");
  process.exit(failed ? 3 : 0);
}

/* ── CLI ─────────────────────────────────────────────────────────────────── */

const isMain = (() => {
  try { return import.meta.url === new URL(`file://${require("node:fs").realpathSync(process.argv[1])}`).href; } catch { return false; }
})();

if (isMain) {
  if (flag("--self-test")) selfTest();
  let res;
  try {
    res = run({ cwd: process.cwd(), indexFile: INDEX, tree: TREE, all: ALL, files: FILES });
  } catch (e) {
    process.stderr.write(`check-staged-imports could not run: ${e.message?.split("\n")[0]}\n`);
    process.exit(2);
  }
  const { findings } = res;
  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({ checked: res.checked, seconds: Number(res.seconds), findings }) + "\n");
  } else if (findings.length) {
    process.stderr.write(`\ncheck-staged-imports: ${findings.length} import(s) of a local file or export this commit does not carry:\n`);
    for (const f of findings) process.stderr.write(`  ${describe(f)}\n`);
    const files = [...new Set(findings.map((f) => f.sibling).filter(Boolean))];
    process.stderr.write(files.length
      ? `\n  Stage ${files.join(", ")} too (git add -- <file>), or remove the import.\n`
      : "\n  Stage the file that provides it too, or remove the import.\n");
  } else {
    process.stderr.write(`check-staged-imports: ${res.checked} file(s), every local import resolves in the commit (${res.seconds}s)\n`);
  }
  if (findings.length && RELEASE_PATH) process.exit(0);
  process.exit(findings.length ? 1 : 0);
}
