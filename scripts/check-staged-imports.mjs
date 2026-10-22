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
 * THE REVERSE HALF. A staged deletion, rename, or edit that drops an export (or an `export *`) is
 * judged against the files the commit leaves alone: an index-wide reverse-import map of the BASE
 * tree (HEAD; cached per tree sha in ~/.cache/matrx/staged-imports-rev/) names every importer,
 * through re-exporting barrels; each is judged against the resulting tree, and what was not already
 * broken at the base is reported as "this commit removes X still used by Y". The sweep holds the
 * removal (never the importer) unless the importer's update is uncommitted on disk, then both go.
 *
 * PACKAGE SHIMS. A name that reaches an importer only through a local `export * from "@ai-matrx/…"`
 * is judged against the version pnpm-lock.yaml LOCKS, by check-matrx-imports.mjs's lock audit.
 *
 * Parser: TypeScript's (as check-parse.mjs), not esbuild/SWC: it is already loaded by every
 * write-time guard here and it reports type-only specifiers exactly, which esbuild's metafile
 * does not. Parsed results are cached by blob sha in ~/.cache/matrx/staged-imports-v2.json.
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
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
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
const CACHE_VERSION = 2;
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
        if (spec && !st.isTypeOnly) imports.push({ spec, line: lineOf(st), names: [], reexport: true });
        continue;
      }
      const names = [];
      for (const el of ec.elements) {
        exports.add(textOf(el.name));
        if (spec && !st.isTypeOnly && !el.isTypeOnly) names.push(textOf(el.propertyName ?? el.name));
      }
      if (spec && !st.isTypeOnly) imports.push({ spec, line: lineOf(st), names, reexport: true });
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

const kindKey = (p) => (/\.(tsx|jsx|js)$/.test(p) ? "x" : /\.(mjs|cjs)$/.test(p) ? "j" : "t") + (/\.d\.[mc]?ts$/.test(p) ? "d" : "");
const OPEN_MODULE = { imports: [], exports: [], stars: [], any: true };

/**
 * A view of one tree (`index`: path -> blob sha) that parses (through the sha cache), resolves and
 * judges imports. `check(importers)` returns findings:
 *   { file, line, specifier, kind: "missing-file"|"missing-export", name?, target?, tried: [path] }
 * and `probes`: named imports whose target passes names on from an @ai-matrx package by
 * `export * from "@ai-matrx/…"` (judged later against the LOCKED version, judgePackageProbes).
 */
export function makeTree({ g, index, cache, root = null }) {
  const parsed = new Map();
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
      try { mod = buf ? parseModule(p, buf.toString("utf8")) : OPEN_MODULE; } catch { mod = OPEN_MODULE; }
      parsed.set(p, mod);
      cache.m[`${sha}:${kindKey(p)}`] = mod;
      cache.dirty = true;
    }
  }
  const tsSha = index.get("tsconfig.json");
  const aliases = aliasesFrom(tsSha ? g.blobs([tsSha]).get(tsSha)?.toString("utf8") : null);
  function resolve(from, spec) {
    const bases = specBases(from, spec, aliases, root);
    if (!bases) return { pkg: true };
    if (bases.outside) {
      // `/x`: public/x when it is there, else a filesystem path outside the repository (not judged).
      for (const b of bases.outside) { const hit = resolveIn(index, b); if (hit) return { path: hit, bases: bases.outside }; }
      return { pkg: true };
    }
    for (const b of bases) { const hit = resolveIn(index, b); if (hit) return { path: hit, bases }; }
    return { path: null, bases };
  }
  /** Parse `targets` and everything they `export *` from, breadth-first. */
  function ensureChains(targets) {
    let frontier = [...targets];
    for (let d = 0; d < STAR_DEPTH && frontier.length; d++) {
      ensure(frontier);
      const next = [];
      for (const t of frontier) for (const s of parsed.get(t)?.stars ?? []) {
        const r = resolve(t, s);
        if (r.path && !parsed.has(r.path)) next.push(r.path);
      }
      frontier = [...new Set(next)];
    }
  }
  /** { names, pkgStars } a path offers, or null for "anything". */
  const memo = new Map();
  function surface(path, depth = 0, seen = new Set()) {
    if (depth === 0 && memo.has(path)) return memo.get(path);
    if (!CODE_FILE.test(path)) return null; // JSON, assets, package.json dirs: not judged
    const mod = parsed.get(path);
    if (!mod || mod.any) return null;
    if (seen.has(path)) return { names: new Set(), pkgStars: [] };
    seen.add(path);
    const names = new Set(mod.exports);
    const pkgStars = [];
    let open = false;
    for (const s of mod.stars) {
      const r = resolve(path, s);
      if (r.pkg) {
        if (s.startsWith("@ai-matrx/")) pkgStars.push(s);
        else open = true; // a star from any other package: its names are not judged here
        continue;
      }
      if (!r.path) continue; // a broken star is reported where it is written, not here
      if (depth + 1 >= STAR_DEPTH || !parsed.has(r.path)) { open = true; break; }
      const sub = surface(r.path, depth + 1, seen);
      if (sub === null) { open = true; break; }
      for (const n of sub.names) if (n !== "default") names.add(n);
      pkgStars.push(...sub.pkgStars);
    }
    const out = open ? null : { names, pkgStars };
    if (depth === 0) memo.set(path, out);
    return out;
  }
  function check(importers, stats = null) {
    const list = importers.filter((p) => CODE_FILE.test(p) && !SKIP_IMPORTER.test(p) && index.has(p));
    ensure(list);
    const edges = [];
    const targets = new Set();
    for (const file of list) for (const imp of parsed.get(file)?.imports ?? []) {
      const r = resolve(file, imp.spec);
      if (r.pkg) continue;
      edges.push({ file, imp, r });
      if (r.path && imp.names.length) targets.add(r.path);
    }
    ensureChains(targets);
    const findings = [];
    const probes = [];
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
        if (offered.names.has(name)) continue;
        const f = { file, line: imp.line, specifier: imp.spec, kind: "missing-export", name, target: r.path };
        if (offered.pkgStars.length) probes.push({ ...f, pkgStars: [...new Set(offered.pkgStars)] });
        else findings.push(f);
      }
    }
    return { findings, probes };
  }
  return { index, parsed, ensure, resolve, surface, check };
}

/** Back-compat entry (self-test, the sweep's callers): forward findings only. */
export function checkImports({ g, index, importers, cache, root = null, stats = null }) {
  return makeTree({ g, index, cache, root }).check(importers, stats).findings;
}

/**
 * Names that reach an importer only through a local `export * from "@ai-matrx/…"` shim, judged
 * against the version pnpm-lock.yaml LOCKS, by check-matrx-imports.mjs's own lock audit (its
 * fetched-tarball cache and resolver; one synthetic `import { name } from "<pkg spec>"` per probe).
 * A name no shim star offers becomes a missing-export finding. Returns { findings, note }.
 */
export async function judgePackageProbes(root, indexFile, probes) {
  if (!probes.length) return { findings: [], note: null };
  let lockAudit;
  try { ({ lockAudit } = await import("./check-matrx-imports.mjs")); } catch (e) { return { findings: [], note: `package names not judged (${e.message})` }; }
  const extra = new Map();
  const lines = [];
  const rel = "__staged_imports_probe__/probe.ts";
  for (const [i, p] of probes.entries()) for (const spec of p.pkgStars) lines.push({ i, spec, text: `import { ${p.name === "default" ? "default as __d" + i : p.name} } from ${JSON.stringify(spec)};` });
  extra.set(rel, lines.map((l) => l.text).join("\n") + "\n");
  const prev = process.env.GIT_INDEX_FILE;
  try {
    if (indexFile) process.env.GIT_INDEX_FILE = indexFile;
    const res = lockAudit(root, { only: [rel], extra });
    const bad = new Set(res.findings.filter((f) => f.file.endsWith("probe.ts")).map((f) => f.line));
    const okProbe = new Set();
    lines.forEach((l, n) => { if (!bad.has(n + 1)) okProbe.add(l.i); });
    const findings = probes.filter((_, i) => !okProbe.has(i)).map(({ pkgStars, ...f }) => ({
      ...f, via: pkgStars.join(", "),
      locked: res.findings.find((x) => lines[x.line - 1]?.i !== undefined && pkgStars.includes(lines[x.line - 1].spec))?.version ?? null,
    }));
    return { findings, note: null };
  } catch (e) {
    return { findings: [], note: `package names not judged (${String(e.message).split("\n")[0]})` };
  } finally {
    if (indexFile) { if (prev === undefined) delete process.env.GIT_INDEX_FILE; else process.env.GIT_INDEX_FILE = prev; }
  }
}

/* ── the reverse check: what this commit removes, still used by files it leaves alone ─────────── */

const REV_VERSION = 1;
const revDir = () => join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "matrx", "staged-imports-rev");

/**
 * Index-wide reverse-import map of a tree: target path -> [{ file, reexport }], where `reexport`
 * marks an edge that passes the target's names on (`export * from` / `export { x } from`). Built
 * from the sha-cached parses; cached on disk per tree sha (the last 4 kept).
 */
export function reverseMap(tree, treeSha) {
  const file = treeSha ? join(revDir(), `${treeSha}.json`) : null;
  if (file) { try { const c = JSON.parse(readFileSync(file, "utf8")); if (c.v === REV_VERSION) return c.map; } catch {} }
  const paths = [...tree.index.keys()].filter((p) => CODE_FILE.test(p) && !SKIP_IMPORTER.test(p));
  tree.ensure(paths);
  const map = {};
  for (const p of paths) {
    const mod = tree.parsed.get(p);
    if (!mod) continue;
    const stars = new Set(mod.stars);
    for (const imp of mod.imports) {
      const r = tree.resolve(p, imp.spec);
      if (!r.path) continue;
      (map[r.path] ??= []).push([p, stars.has(imp.spec) || imp.reexport ? 1 : 0]);
    }
  }
  if (file) {
    try {
      mkdirSync(revDir(), { recursive: true });
      writeFileSync(file, JSON.stringify({ v: REV_VERSION, map }));
      const old = readdirSync(revDir()).map((n) => join(revDir(), n)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
      for (const o of old.slice(4)) rmSync(o, { force: true });
    } catch {}
  }
  return map;
}

/** [{ status: "D"|"M"|"R"|"A"|…, path, from?, oldSha, newSha }] between base and the index or `tree`. */
export function changesOf(g, base, tree) {
  const out = tree
    ? g.text(["diff-tree", "-r", "-z", "--raw", "--no-abbrev", "-M", base, tree])
    : g.text(["diff-index", "--cached", "-z", "--raw", "--no-abbrev", "-M", base]);
  const parts = out.split("\0");
  const res = [];
  for (let i = 0; i < parts.length; i++) {
    const head = parts[i];
    if (!head || head[0] !== ":") continue;
    const [, , oldSha, newSha, st] = head.slice(1).split(" ");
    if (st[0] === "R" || st[0] === "C") { res.push({ status: st[0], from: parts[i + 1], path: parts[i + 2], oldSha, newSha }); i += 2; }
    else { res.push({ status: st[0], path: parts[i + 1], oldSha, newSha }); i += 1; }
  }
  return res;
}

/** The base tree's path -> sha, derived from the resulting one and the change list (no second listing). */
export function baseIndexOf(index, changes) {
  const head = new Map(index);
  for (const c of changes) {
    if (c.status === "A" || c.status === "C") head.delete(c.path);
    else if (c.status === "R") { head.delete(c.path); head.set(c.from, c.oldSha); }
    else head.set(c.path, c.oldSha); // M, D, T
  }
  return head;
}

/**
 * Files this commit leaves alone that import something it deletes, renames away, or stops
 * exporting. `head` is the base tree, `next` the resulting one. Each finding is the importer's,
 * new in `next` (not already broken in `head`), with `reverse: true` and `cause` = the changed path.
 */
export function reverseCheck({ head, next, headSha, changes, forward }) {
  const seeds = new Map(); // changed path -> why
  for (const c of changes) {
    if (c.status === "D") seeds.set(c.path, "deleted");
    else if (c.status === "R") seeds.set(c.from, `renamed to ${c.path}`);
    else if (c.status === "M" && CODE_FILE.test(c.path)) {
      head.ensure([c.path]); next.ensure([c.path]);
      const a = head.parsed.get(c.path), b = next.parsed.get(c.path);
      if (!a || !b || a.any) continue;
      const nb = new Set(b.exports), sb = new Set(b.stars);
      if (b.any) continue;
      if (a.exports.some((n) => !nb.has(n)) || a.stars.some((s) => !sb.has(s))) seeds.set(c.path, "export removed");
    }
  }
  if (!seeds.size) return [];
  const rev = reverseMap(head, headSha);
  // Importers of every seed; a re-exporter passes the loss on, so its importers count too.
  const affected = new Map(); // importer -> cause
  let frontier = [...seeds.keys()].map((p) => [p, p]);
  const seen = new Set(frontier.map(([p]) => p));
  for (let d = 0; d < STAR_DEPTH && frontier.length; d++) {
    const nxt = [];
    for (const [p, cause] of frontier) for (const [imp, re] of rev[p] ?? []) {
      if (!affected.has(imp)) affected.set(imp, cause);
      if (re && !seen.has(imp)) { seen.add(imp); nxt.push([imp, cause]); }
    }
    frontier = nxt;
  }
  const fwd = new Set(forward);
  const judged = [...affected.keys()].filter((p) => next.index.has(p) && !fwd.has(p));
  if (!judged.length) return [];
  const key = (f) => `${f.file}\0${f.specifier}\0${f.kind}\0${f.name ?? ""}`;
  const before = new Set(head.check(judged).findings.map(key));
  return next.check(judged).findings.filter((f) => !before.has(key(f))).map((f) => {
    const cause = affected.get(f.file);
    return { ...f, reverse: true, cause, why: seeds.get(cause) };
  });
}

/** The working-tree path that would satisfy a finding, if one exists on disk (the sweep's sibling). */
export function diskSibling(root, finding) {
  if (finding.reverse) return finding.file; // the importer's own update is the fix
  if (finding.via) return null; // the package must ship it; no local file fixes that
  if (finding.kind === "missing-export") return existsSync(join(root, finding.target)) ? finding.target : null;
  for (const b of finding.tried ?? []) {
    const disk = { has: (p) => { try { return statSync(join(root, p)).isFile(); } catch { return false; } } };
    const hit = resolveIn(disk, b);
    if (hit) return hit;
  }
  return null;
}

export function describe(f) {
  if (f.reverse) {
    const what = f.kind === "missing-file" ? f.cause : `{ ${f.name} } of ${f.cause}`;
    return `this commit removes ${what} (${f.why}) still used by ${f.file}:${f.line} ("${f.specifier}"): stage ${f.file}'s update too, or keep ${f.kind === "missing-file" ? "the file" : f.name}`;
  }
  if (f.via) return `${f.file}:${f.line}  imports { ${f.name} } from "${f.specifier}" — ${f.target} passes on ${f.via}${f.locked ? `@${f.locked} (locked)` : ""}, which does not export it`;
  return f.kind === "missing-file"
    ? `${f.file}:${f.line}  imports "${f.specifier}" — no such file in this commit (tried ${f.tried.map((t) => t + ".*").join(", ")})`
    : `${f.file}:${f.line}  imports { ${f.name} } from "${f.specifier}" — ${f.target} as committed does not export it`;
}

export async function run(opts) {
  const { cwd, indexFile = null, tree = null, all = false, files = null, packages = true, base: baseOpt = null } = opts;
  const t0 = Date.now();
  const T = (l) => process.env.STAGED_IMPORTS_TIMING && process.stderr.write(`[timing] ${l} ${Date.now() - t0}ms\n`);
  const g = makeGit(cwd, indexFile);
  const root = g.text(["rev-parse", "--show-toplevel"]).trim();
  const index = readTree(g, tree);
  let base = baseOpt ?? (tree ? `${tree}^` : "HEAD");
  try { g.text(["rev-parse", "--verify", "-q", `${base}^{tree}`]); } catch { base = null; }
  let importers;
  if (files) importers = files;
  else if (all) importers = [...index.keys()];
  else if (tree) importers = base ? g.text(["diff-tree", "-r", "-z", "--name-only", "--diff-filter=ACMR", base, tree]).split("\0").filter(Boolean) : [...index.keys()];
  else importers = g.text(["diff", "--cached", "--name-only", "-z", "--diff-filter=ACMR", base ?? EMPTY_TREE]).split("\0").filter(Boolean);
  const cacheFile = join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "matrx", "staged-imports-v2.json");
  T("trees listed");
  const cache = loadCache(cacheFile);
  T("cache loaded");
  const next = makeTree({ g, index, cache, root });
  const fwd = next.check(importers, opts.stats ?? null);
  let findings = fwd.findings;
  let note = null;
  T("forward");
  if (packages && fwd.probes.length) {
    const p = await judgePackageProbes(root, indexFile, tree ? [] : fwd.probes);
    findings = findings.concat(p.findings);
    note = p.note;
  }
  if (!all && base) {
    const headSha = g.text(["rev-parse", `${base}^{tree}`]).trim();
    const changes = changesOf(g, base, tree);
    const head = makeTree({ g, index: baseIndexOf(index, changes), cache, root });
    T("head derived");
    findings = findings.concat(reverseCheck({ head, next, headSha, changes, forward: importers }));
    T("reverse");
  }
  if (cache.dirty) {
    try {
      mkdirSync(dirname(cacheFile), { recursive: true });
      delete cache.dirty;
      writeFileSync(cacheFile, JSON.stringify(cache));
    } catch {}
  }
  T("cache written");
  for (const f of findings) {
    f.sibling = diskSibling(root, f);
    if (f.reverse) f.hold = f.cause; // the sweep holds the deletion / export removal
  }
  return { root, findings, note, checked: importers.filter((p) => CODE_FILE.test(p)).length, seconds: ((Date.now() - t0) / 1000).toFixed(2) };
}

/* ── self-test ───────────────────────────────────────────────────────────── */

async function selfTest() {
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
    let r = await run({ cwd: dir });
    expect("R1 missing file is red", r.findings.length === 1 && r.findings[0].kind === "missing-file" && r.findings[0].file === "features/page.tsx");
    expect("R1 names the disk sibling", r.findings[0]?.sibling === "features/framePageHeader.ts");
    sh(["add", "features/framePageHeader.ts"]);
    expect("R1 green once the sibling is staged", (await run({ cwd: dir })).findings.length === 0);

    // R2 missing export via the `@/` alias and through an `export *` chain.
    put("features/q.tsx", 'import { lineageSourcesOf, a, type T } from "@/lib/barrel";\nimport f from "@/lib/base";\nexport const Q = [lineageSourcesOf, a, f];\n');
    sh(["add", "features/q.tsx"]);
    r = await run({ cwd: dir });
    expect("R2 missing export is red", r.findings.length === 1 && r.findings[0].kind === "missing-export" && r.findings[0].name === "lineageSourcesOf");
    put("lib/base.ts", "export const a = 1;\nexport type T = string;\nexport const lineageSourcesOf = 2;\nexport default function f() {}\n");
    expect("R2 still red while the export is only on disk", (await run({ cwd: dir })).findings.length === 1);
    sh(["add", "lib/base.ts"]);
    expect("R2 green once the export is staged (followed through export *)", (await run({ cwd: dir })).findings.length === 0);

    // R3 missing re-export.
    put("lib/index.ts", 'export { nameFromSources } from "./names";\nexport type { Ghost } from "./ghost";\n');
    put("lib/names.ts", "export const other = 1;\n");
    sh(["add", "lib/index.ts", "lib/names.ts"]);
    r = await run({ cwd: dir });
    expect("R3 missing re-export is red (type-only re-export of a missing file is not)", r.findings.length === 1 && r.findings[0].name === "nameFromSources");
    put("lib/names.ts", "export const other = 1;\nexport function nameFromSources() {}\n");
    sh(["add", "lib/names.ts"]);
    expect("R3 green once the re-export target exports it", (await run({ cwd: dir })).findings.length === 0);

    // R4 `.js` -> `.ts`, index files, dynamic import, and --index on a temp index.
    put("tools/a.mjs", 'import { x } from "./b.js";\nexport const y = () => import("./dyn");\n');
    put("tools/b.ts", "export const x = 1;\n");
    sh(["add", "tools/a.mjs", "tools/b.ts"]);
    r = await run({ cwd: dir });
    expect("R4 dynamic import of a missing file is red, .js->.ts resolves", r.findings.length === 1 && r.findings[0].specifier === "./dyn");
    const tmpIndex = join(dir, ".git", "tmp-index");
    execFileSync("git", ["read-tree", "HEAD"], { cwd: dir, env: { ...process.env, GIT_INDEX_FILE: tmpIndex } });
    execFileSync("git", ["update-index", "--add", "features/page.tsx"], { cwd: dir, env: { ...process.env, GIT_INDEX_FILE: tmpIndex } });
    r = await run({ cwd: dir, indexFile: tmpIndex, files: ["features/page.tsx"] });
    expect("R5 --index judges the temp index, not the real one", r.findings.length === 1 && r.findings[0].kind === "missing-file");

    // The reverse half: what a commit removes, still used by files it leaves alone.
    put("tools/dyn.ts", "export default 1;\n");
    sh(["add", "."]); sh(["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "all"]);
    const commit = () => sh(["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "step"]);
    expect("R6 a clean tree is green", (await run({ cwd: dir })).findings.length === 0);
    sh(["rm", "-q", "--cached", "features/framePageHeader.ts"]);
    r = await run({ cwd: dir });
    expect("R6 a deleted file still imported is red", r.findings.length === 1 && r.findings[0].reverse && r.findings[0].file === "features/page.tsx" && r.findings[0].hold === "features/framePageHeader.ts");
    put("features/page.tsx", "export const P = 1;\n");
    sh(["add", "features/page.tsx"]);
    expect("R6 green once the importer's update is staged", (await run({ cwd: dir })).findings.length === 0);
    commit();
    put("lib/base.ts", "export type T = string;\nexport const lineageSourcesOf = 2;\nexport default function f() {}\n");
    sh(["add", "lib/base.ts"]);
    r = await run({ cwd: dir });
    expect("R7 a removed export is red at its re-export and through `export *`",
      r.findings.length === 2 && r.findings.every((f) => f.reverse && f.name === "a" && f.cause === "lib/base.ts")
      && r.findings.some((f) => f.file === "features/q.tsx") && r.findings.some((f) => f.file === "lib/barrel.ts"));
    if (r.findings.length !== 2) console.log(r.findings);
    sh(["reset", "-q", "--", "lib/base.ts"]);
    sh(["mv", "lib/names.ts", "lib/names2.ts"]);
    r = await run({ cwd: dir });
    expect("R8 a rename still imported by its old path is red", r.findings.length === 1 && r.findings[0].reverse && r.findings[0].file === "lib/index.ts" && /renamed/.test(r.findings[0].why));
    put("lib/index.ts", 'export { nameFromSources } from "./names2";\n');
    sh(["add", "lib/index.ts"]);
    expect("R8 green once the importer follows the rename", (await run({ cwd: dir })).findings.length === 0);
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
  if (flag("--self-test")) await selfTest();
  let res;
  try {
    res = await run({ cwd: process.cwd(), indexFile: INDEX, tree: TREE, all: ALL, files: FILES });
  } catch (e) {
    process.stderr.write(`check-staged-imports could not run: ${e.message?.split("\n")[0]}\n`);
    process.exit(2);
  }
  const { findings } = res;
  if (res.note) process.stderr.write(`check-staged-imports: ${res.note}\n`);
  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({ checked: res.checked, seconds: Number(res.seconds), findings }) + "\n");
  } else if (findings.length) {
    process.stderr.write(`\ncheck-staged-imports: ${findings.length} import(s) would break in this commit:\n`);
    for (const f of findings) process.stderr.write(`  ${describe(f)}\n`);
    const fwd = findings.filter((f) => !f.reverse && !f.via);
    const files = [...new Set(fwd.map((f) => f.sibling).filter(Boolean))];
    if (fwd.length) process.stderr.write(files.length
      ? `\n  Stage ${files.join(", ")} too (git add -- <file>), or remove the import.\n`
      : "\n  Stage the file that provides it too, or remove the import.\n");
    if (findings.some((f) => f.reverse)) process.stderr.write("\n  Stage each importer's update too (git add -- <file>), or keep what it uses.\n");
    if (findings.some((f) => f.via)) process.stderr.write("\n  The LOCKED package must ship the name first (publish, then pnpm sync:matrx-packages and stage the lockfile), or remove the import.\n");
  } else {
    process.stderr.write(`check-staged-imports: ${res.checked} file(s), every local import resolves in the commit (${res.seconds}s)\n`);
  }
  if (findings.length && RELEASE_PATH) process.exit(0);
  process.exit(findings.length ? 1 : 0);
}
