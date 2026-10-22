#!/usr/bin/env node
// check-matrx-imports — EVERY NAMED IMPORT FROM @ai-matrx/* EXISTS IN THE
// INSTALLED PACKAGE.
//
// THE DEFECT THIS EXISTS FOR (2026-09-25, ALC-13)
// -----------------------------------------------
// `features/content-ir/registry/kind-schema-source.ts` landed on main importing
// `createKindValidator` from `@ai-matrx/content-ir/registry`. The export existed
// in aidream's SOURCE (content-ir 0.19.0) but npm still served 0.18.6 and the
// lockfile resolved 0.18.6 — the consumer shipped before the package. The
// shared dev server answered 500 on every route ("Export createKindValidator
// doesn't exist in target module") and Vercel builds v0.4.2360 and v0.4.2361
// went red. Every existing guard was green:
//
//   • check:parse           — the file parses.
//   • check:matrx-packages  — 0.18.6 WAS npm's latest; versions agreed.
//   • check:matrx-dist-integrity — the installed bytes WERE the published bytes.
//   • type-check            — sees it (TS2305), but takes minutes, carries a
//                             backlog, and is advisory.
//
// Nothing asked the one question that mattered: does the package this checkout
// actually INSTALLED ship the name this file imports? This does, in seconds.
//
// WHAT IT CHECKS
// --------------
// Every tracked .ts/.tsx/.mts/.cts/.js/.jsx/.mjs file that mentions `@ai-matrx/`
// is parsed (TypeScript's parser, no type-checking). For every
//   import { a, b as c, type T } from "@ai-matrx/<pkg>[/<subpath>]"
//   export { a } from "@ai-matrx/<pkg>[/<subpath>]"
//   import d from "@ai-matrx/<pkg>"          (default)
// the INSTALLED copy nearest to the importing file (node_modules walked upward,
// exactly how Node and the bundler resolve it) is located, its `exports` map is
// resolved for that subpath to its types entry, and the module's exports are
// read with the TypeScript checker (so `export *` chains are followed). A
// finding names the file, the package, the installed VERSION, the subpath and
// the missing export — or a subpath the package does not export at all.
//
// Workspace links (`link:`/symlinks into source, e.g. packages/*) are skipped:
// source is ahead of npm by design and is not what a registry install ships.
//
//   node scripts/check-matrx-imports.mjs              # exit 1 on a missing export
//   node scripts/check-matrx-imports.mjs --root DIR   # audit another tree
//   node scripts/check-matrx-imports.mjs --self-test  # RED then GREEN, temp tree
//   node scripts/check-matrx-imports.mjs --staged FILES...  # commit-hook mode: index blobs only
//
// A full (un-narrowed) run ALSO checks the installed package graph — every
// `@ai-matrx/<dep>/<subpath>` one installed @ai-matrx package imports must be
// exported by the <dep> installed beside it (the 2026-10-06 case; see
// auditPackageGraph below) — and every NAMED import in it must be in that
// <dep>'s runtime exports (the 2026-10-18 formatShortcut/addressText renames).
//   node scripts/check-matrx-imports.mjs --packages   # the package graph only (sync:matrx-packages' adoption gate)
//   node scripts/check-matrx-imports.mjs --lock [--ref REF]  # LOCKFILE mode: judge the code in REF (default: the
//     index) against the @ai-matrx versions the LOCKFILE in REF names — fetched from npm when they are not what is
//     installed. A lockfile-only adoption installs nothing, so the installed-package check above is blind to it
//     (2026-10-21: 689c27aa4d adopted chat 0.8.307, which dropped setDebrief; two Vercel releases failed).
//
// Exit codes: 0 clean · 1 an import names something the installed package does
//             not ship · 2 the script itself could not run — never a silent pass.
//
// Remedy for a finding: the consumer shipped before the package. Publish the
// package (aidream's npm train), then `pnpm update "@ai-matrx/<pkg>" --latest`
// and commit the lockfile. Never pin; never delete the import to go green.

import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { emitItem, endItems } from "./checks/items.mjs";
import {
  clearPackageResolution,
  findInstalled,
  isWorkspaceSource,
  pickRuntime,
  pickTypes,
  resolveRelativeJs,
  resolveSubpath,
  splitSpecifier,
} from "./lib/matrx-package-resolve.mjs";

export { findInstalled, isWorkspaceSource, resolveSubpath, splitSpecifier };

const require = createRequire(import.meta.url);
// TypeScript 7 (the native compiler) ships no JS API; a repo on it installs the 6.x API beside it
// as "typescript-js-api" (npm:typescript@^6), matrx-local's desktop/ for one.
const ts = [() => require("typescript"), () => require("typescript-js-api")]
  .map((load) => { try { return load(); } catch { return null; } })
  .find((m) => typeof m?.createProgram === "function") ?? require("typescript");

const SCOPE = "@ai-matrx/";
const SOURCE_EXT = /\.(ts|tsx|mts|cts|js|jsx|mjs)$/;
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", ".wt", "tmp"]);

// ── file discovery ───────────────────────────────────────────────────────────

function listFiles(root) {
  try {
    // Tracked AND untracked-not-ignored: a new file is checked before it is ever committed.
    const out = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.split("\0").filter((f) => f && SOURCE_EXT.test(f)).map((f) => join(root, f));
  } catch {
    // Not a git tree (the self-test and --root proofs): walk it.
    const files = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name));
        } else if (SOURCE_EXT.test(entry.name)) files.push(join(dir, entry.name));
      }
    };
    walk(root);
    return files;
  }
}

/** Every @ai-matrx named import/re-export in one file. */
export function collectImports(file, text) {
  const kind = /\.tsx$|\.jsx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, kind);
  const found = [];
  for (const stmt of sf.statements) {
    const spec = stmt.moduleSpecifier;
    if (!spec || !ts.isStringLiteral(spec) || !spec.text.startsWith(SCOPE)) continue;
    const line = sf.getLineAndCharacterOfPosition(stmt.getStart(sf)).line + 1;
    const push = (name, typeOnly) => found.push({ specifier: spec.text, name, line, typeOnly: Boolean(typeOnly) });
    if (ts.isImportDeclaration(stmt) && stmt.importClause) {
      const clause = stmt.importClause;
      if (clause.name) push("default", clause.isTypeOnly);
      const nb = clause.namedBindings;
      if (nb && ts.isNamedImports(nb)) {
        for (const el of nb.elements) push((el.propertyName ?? el.name).text, clause.isTypeOnly || el.isTypeOnly);
      }
    } else if (ts.isExportDeclaration(stmt) && stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
      for (const el of stmt.exportClause.elements) push((el.propertyName ?? el.name).text, stmt.isTypeOnly || el.isTypeOnly);
    } else if (ts.isExportDeclaration(stmt) && (!stmt.exportClause || ts.isNamespaceExport(stmt.exportClause))) {
      // `export * from "@ai-matrx/x/sub"` — a local shim (features/content-ir/kinds/
      // kind-markdown-utils.ts, v0.4.2989). The SUBPATH must still exist; names are judged where
      // they are imported.
      push(WHOLE_MODULE, stmt.isTypeOnly);
    }
  }
  // `import("@ai-matrx/…")` and `require("@ai-matrx/…")` anywhere in the file: the bundler resolves
  // them exactly like a static import. v0.4.2984/2985 died on
  // `require("@ai-matrx/chat/ui/markdown-stream/MarkdownStream")` after chat moved that file.
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      node.arguments.length >= 1 &&
      ts.isStringLiteral(node.arguments[0]) &&
      node.arguments[0].text.startsWith(SCOPE) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
      found.push({ specifier: node.arguments[0].text, name: WHOLE_MODULE, line, typeOnly: false });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** The "name" of a whole-module reference (export *, import(), require()): only its subpath is judged. */
export const WHOLE_MODULE = "*";

// ── installed package resolution ─────────────────────────────────────────────

/** The nearest package.json above `file` (its directory + manifest), or null. */
function owningPackage(file) {
  let dir = dirname(file);
  for (;;) {
    const m = join(dir, "package.json");
    if (existsSync(m)) {
      try {
        return { dir, manifest: JSON.parse(readFileSync(m, "utf8")) };
      } catch {
        return null;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** A specifier that names the package `file` itself ships in, resolved through that package's own exports map. */
function resolveSelfSpecifier(file, spec) {
  const owner = owningPackage(file);
  if (!owner) return null;
  const { name, sub } = splitSpecifier(spec);
  if (name !== owner.manifest.name) return null;
  return runtimeFileOf(owner.dir, owner.manifest, sub);
}

const runtimeCache = new Map();
/**
 * The names an ESM file exports at RUNTIME, following relative `export * from`. Returns null
 * ("open") when that cannot be known statically — CommonJS, or `export *` from another package —
 * and then the runtime half of the check stays silent for that entry rather than guessing.
 */
export function runtimeExportsOf(file, stack = new Set()) {
  if (runtimeCache.has(file)) return runtimeCache.get(file);
  if (stack.has(file)) return new Set();
  stack.add(file);
  let result = new Set();
  try {
    if (/\.cjs$/.test(file)) throw new Error("commonjs");
    const text = readFileSync(file, "utf8");
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, ts.ScriptKind.JS);
    let sawEsm = false;
    const hasMod = (node, kind) => (ts.getModifiers?.(node) ?? node.modifiers ?? []).some((m) => m.kind === kind);
    const addBinding = (name) => {
      if (ts.isIdentifier(name)) result.add(name.text);
      else for (const el of name.elements ?? []) if (el.name) addBinding(el.name);
    };
    for (const stmt of sf.statements) {
      if (ts.isImportDeclaration(stmt)) sawEsm = true;
      if (ts.isExportDeclaration(stmt)) {
        sawEsm = true;
        const from = stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier) ? stmt.moduleSpecifier.text : null;
        if (!stmt.exportClause) {
          // A package entry that re-exports from ITS OWN package by name (content-ir 0.24.29 dist/react.js:
          // `export * from "@ai-matrx/content-ir/host-provider"`) resolves through the package's own exports map.
          const target = from?.startsWith(".") ? resolveRelativeJs(file, from) : from?.startsWith(SCOPE) ? resolveSelfSpecifier(file, from) : null;
          if (!from || (!from.startsWith(".") && !target)) throw new Error("open star");
          if (!target) throw new Error("unresolved star");
          const inner = runtimeExportsOf(target, stack);
          if (inner === null) throw new Error("open star");
          for (const n of inner) if (n !== "default") result.add(n);
        } else if (ts.isNamespaceExport(stmt.exportClause)) {
          result.add(stmt.exportClause.name.text);
        } else {
          for (const el of stmt.exportClause.elements) result.add(el.name.text);
        }
      } else if (ts.isExportAssignment(stmt)) {
        sawEsm = true;
        result.add("default");
      } else if (hasMod(stmt, ts.SyntaxKind.ExportKeyword)) {
        sawEsm = true;
        if (hasMod(stmt, ts.SyntaxKind.DefaultKeyword)) result.add("default");
        else if (ts.isVariableStatement(stmt)) for (const d of stmt.declarationList.declarations) addBinding(d.name);
        else if (stmt.name) result.add(stmt.name.text);
      }
    }
    if (!sawEsm) throw new Error("not esm");
  } catch {
    result = null;
  }
  stack.delete(file);
  runtimeCache.set(file, result);
  return result;
}

/** Forget every resolution: a long-lived caller (the dev-server rescue loader) calls this when an
 * install changed node_modules under it, so it never judges against the bytes of the old version. */
export function resetCaches() {
  clearPackageResolution();
  runtimeCache.clear();
}

// ── the run ──────────────────────────────────────────────────────────────────

/** Staged files (added/copied/modified/renamed), repo-relative. */
function gitLines(root, args) {
  const out = execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  return out.split("\0").filter(Boolean);
}

/** The blob in the index — what the commit will contain — or null when absent. */
function indexText(root, rel) {
  try {
    return execFileSync("git", ["show", `:${rel}`], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

/** Index blobs for many paths through ONE git process (a process per file takes minutes). */
function indexBlobs(root, rels, prefix = ":") {
  const out = spawnSync("git", ["cat-file", "--batch"], { cwd: root, input: rels.map((r) => `${prefix}${r}\n`).join(""), maxBuffer: 1024 * 1024 * 1024 }).stdout;
  const map = new Map();
  let pos = 0;
  for (const rel of rels) {
    const nl = out.indexOf(10, pos);
    if (nl === -1) break;
    const head = out.toString("utf8", pos, nl);
    pos = nl + 1;
    if (head.endsWith(" missing")) continue;
    const size = Number(head.split(" ")[2]);
    map.set(rel, out.toString("utf8", pos, pos + size));
    pos += size + 1;
  }
  return map;
}

/**
 * COMMIT-HOOK MODE. The commit hook guards what the COMMIT contains, not what else sits in a
 * shared working tree: another lane's untracked or unstaged file must never block an unrelated
 * commit. Audited: the index blob of every staged code file; and, when package.json or
 * pnpm-lock.yaml is staged (the installed versions change), the index blob of every tracked code
 * file plus the installed package graph. Untracked files and unstaged edits are never read.
 */
export function stagedAudit(root, staged) {
  root = resolve(root);
  const widen = staged.some((o) => /(^|\/)(package\.json|pnpm-lock\.yaml)$/.test(o));
  const rels = widen ? gitLines(root, ["ls-files", "-z", "--cached"]) : staged;
  const files = rels.filter((f) => SOURCE_EXT.test(f)).map((f) => join(root, f));
  const blobs = indexBlobs(root, files.map((f) => relative(root, f).split(sep).join("/")));
  return audit(root, { files, readText: (file) => blobs.get(relative(root, file).split(sep).join("/")) ?? null, graph: widen, narrowed: !widen });
}

const LOCK_DIRECT = /^\s+'(@ai-matrx\/[a-z0-9._-]+)':\n\s+specifier: .+\n\s+version: (\d[^(\s'"]*)/gm;

/** { "@ai-matrx/x": "1.2.3" } — the DIRECT @ai-matrx versions a pnpm-lock.yaml's first importer names. */
export function lockedDirectVersions(lockText) {
  const out = {};
  for (const m of lockText.matchAll(LOCK_DIRECT)) if (!(m[1] in out)) out[m[1]] = m[2];
  // Packages only other packages depend on (agents, api, ...) still have to sit beside them, or the
  // package-graph half reports them "not installed": the highest locked version stands in.
  const cmp = (a, b) => a.localeCompare(b, undefined, { numeric: true });
  for (const m of lockText.matchAll(/^\s+'(@ai-matrx\/[a-z0-9._-]+)@(\d[^(':\s]*)/gm)) {
    if (m[1] in out) continue;
    const best = out[`\0${m[1]}`];
    if (!best || cmp(m[2], best) > 0) out[`\0${m[1]}`] = m[2];
  }
  for (const k of Object.keys(out)) {
    if (!k.startsWith("\0")) continue;
    if (!(k.slice(1) in out)) out[k.slice(1)] = out[k];
    delete out[k];
  }
  return out;
}

/** Fetch one package version from npm into a cache dir; returns its extracted directory. */
export function fetchFromNpm(name, version) {
  // The path must contain "node_modules": a package outside one reads as workspace SOURCE and is skipped.
  const cache = join(tmpdir(), "matrx-lock-pack-cache", "node_modules", `${name}@${version}`);
  if (existsSync(join(cache, "package", "package.json"))) return join(cache, "package");
  mkdirSync(cache, { recursive: true });
  const r = spawnSync("npm", ["pack", `${name}@${version}`, "--pack-destination", cache, "--silent"], { encoding: "utf8", timeout: 180000 });
  const tgz = readdirSync(cache).find((f) => f.endsWith(".tgz"));
  if (r.status !== 0 || !tgz) {
    rmSync(cache, { recursive: true, force: true });
    throw new Error(`could not fetch ${name}@${version} from npm (${(r.stderr || r.stdout || "no output").trim().split("\n").pop()})`);
  }
  const x = spawnSync("tar", ["-xzf", join(cache, tgz), "-C", cache], { encoding: "utf8" });
  if (x.status !== 0) {
    rmSync(cache, { recursive: true, force: true });
    throw new Error(`could not unpack ${name}@${version}: ${x.stderr}`);
  }
  return join(cache, "package");
}

/**
 * LOCKFILE MODE (--lock). Judges the code in `ref` ("" = the index) against the @ai-matrx versions the
 * pnpm-lock.yaml in the same ref names. Installed copies are used where the version matches; any other
 * version is fetched (`fetch(name, version)` -> extracted dir). The tree is rebuilt in a scratch dir so
 * the checkout's node_modules is never touched. A finding names file, package, version and the export.
 */
export function lockAudit(root, { ref = "", fetch = fetchFromNpm, only = null, disk = false, extra = null } = {}) {
  root = resolve(root);
  const prefix = ref ? `${ref}:` : ":";
  const lockText = indexBlobs(root, ["pnpm-lock.yaml"], prefix).get("pnpm-lock.yaml");
  if (lockText == null) throw new Error(`no pnpm-lock.yaml in ${ref || "the index"}`);
  const locked = lockedDirectVersions(lockText);
  // `only` narrows to these repo-relative files (the commit hook, the sweep, the edit hook); a staged
  // pnpm-lock.yaml changes what EVERY import resolves to, so it widens to the tree.
  // `disk` reads those files from the working tree (the edit hook: the file was just written).
  // (package.json alone resolves nothing: the lockfile decides the versions, so only it widens.)
  const widen = !only || only.some((o) => /(^|\/)pnpm-lock\.yaml$/.test(o));
  const rels = widen
    ? (ref ? gitLines(root, ["ls-tree", "-r", "-z", "--name-only", ref]) : gitLines(root, ["ls-files", "-z", "--cached"])).filter((f) => SOURCE_EXT.test(f))
    : only.filter((f) => SOURCE_EXT.test(f));
  const blobs = disk && !widen
    ? new Map(rels.map((r) => { try { return [r, readFileSync(join(root, r), "utf8")]; } catch { return [r, null]; } }))
    : indexBlobs(root, rels, prefix);
  // `extra`: rel -> text judged as if it were in the index (check-staged-imports.mjs asks whether a
  // name a local `export * from "@ai-matrx/…"` shim passes on exists at the LOCKED version).
  if (extra) for (const [rel, text] of extra) blobs.set(rel, text);
  const t0 = Date.now();
  const tmp = realpathSync(mkdtempSync(join(tmpdir(), "matrx-lock-audit-")));
  try {
    const scope = join(tmp, "node_modules", "@ai-matrx");
    mkdirSync(scope, { recursive: true });
    const swapped = [];
    // Narrowed: only the packages these files import are judged at their locked version (fetching
    // every other locked package would cost a minute of npm per call for nothing).
    const wanted = widen ? null : new Set([...blobs].flatMap(([rel, text]) =>
      text && text.includes(SCOPE) ? collectImports(join(root, rel), text).map((i) => splitSpecifier(i.specifier).name) : []));
    for (const [name, version] of Object.entries(locked)) {
      if (wanted && !wanted.has(name)) continue;
      const installed = join(root, "node_modules", name);
      let have = null;
      try {
        have = JSON.parse(readFileSync(join(installed, "package.json"), "utf8")).version;
      } catch {
        /* not installed */
      }
      const dest = join(scope, name.slice(SCOPE.length));
      if (have === version) symlinkSync(realpathSync(installed), dest);
      else {
        symlinkSync(fetch(name, version), dest);
        swapped.push(`${name} ${have ?? "(not installed)"} -> ${version}`);
      }
    }
    // Packages the lockfile does not version (workspace links, `link:`) stay as installed.
    for (const n of existsSync(join(root, "node_modules", "@ai-matrx")) ? readdirSync(join(root, "node_modules", "@ai-matrx")) : []) {
      const dest = join(scope, n);
      if (!existsSync(dest)) symlinkSync(realpathSync(join(root, "node_modules", "@ai-matrx", n)), dest);
    }
    const T = (label) => process.env.MATRX_LOCK_TIMING && console.error(`[lock timing] ${label} ${Date.now() - t0}ms`);
    T("packages ready");
    const files = [];
    for (const [rel, text] of blobs) {
      if (text == null || !text.includes(SCOPE)) continue;
      const f = join(tmp, rel);
      mkdirSync(dirname(f), { recursive: true });
      writeFileSync(f, text);
      files.push(f);
    }
    clearPackageResolution();
    runtimeCache.clear();
    // The package-to-package graph is not judged here: installed copies are linked in place, so their
    // siblings are the INSTALLED ones and the report would be noise. `--packages` is that gate.
    const result = audit(tmp, { files, graph: false, narrowed: !widen });
    T("audit done");
    clearPackageResolution();
    runtimeCache.clear();
    // Which version WOULD ship each missing name: the copy installed here, when it is a different one
    // and has it. That is the version the commit must adopt (package.json + pnpm-lock.yaml with it).
    if (result.findings.length) {
      const sources = new Map(files.map((f) => [relative(tmp, f).split(sep).join("/"), f]));
      const back = audit(root, {
        files: [...sources.keys()].map((r) => join(root, r)),
        readText: (file) => readFileSync(sources.get(relative(root, file).split(sep).join("/")), "utf8"),
        graph: false,
        narrowed: true,
      });
      const missingInstalled = new Set(back.findings.map(findingKey));
      clearPackageResolution();
      runtimeCache.clear();
      for (const f of result.findings) {
        let have = null;
        try { have = JSON.parse(readFileSync(join(root, "node_modules", f.pkg, "package.json"), "utf8")).version; } catch { /* none */ }
        f.installed = have;
        f.installedHasIt = have != null && have !== f.version && !missingInstalled.has(findingKey(f));
      }
    }
    return { ...result, swapped, locked: Object.keys(locked).length, lockMode: true };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export function audit(root, { only = null, files: given = null, readText = null, graph: wantGraph = null, narrowed = null } = {}) {
  root = resolve(root);
  // `only` narrows the scan to the given repo-relative files/directories (`pnpm findings <paths>`,
  // a changed-files run). A narrowed run never claims a full scan (no end-of-scan marker).
  const files = (given ?? listFiles(root)).filter((f) => {
    if (!only) return true;
    const rel = relative(root, f).split(sep).join("/");
    return only.some((o) => o === "" || rel === o || rel.startsWith(`${o}/`));
  });
  const imports = []; // { file, line, specifier, name, pkgDir, version, sub, entry }
  const findings = [];
  const skipped = { workspace: 0, notInstalled: new Set(), unresolved: [] };

  for (const file of files) {
    let text;
    try {
      text = readText ? readText(file) : readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (text == null || !text.includes(SCOPE)) continue;
    for (const imp of collectImports(file, text)) {
      const { name: pkg, sub } = splitSpecifier(imp.specifier);
      const pkgDir = findInstalled(dirname(file), pkg, root);
      if (!pkgDir) {
        // NOT A SKIP. 2026-10-05: a lockfile bump to a version whose tarball still 404'd made
        // `pnpm install --frozen-lockfile` fail half-way and left node_modules WITHOUT
        // @ai-matrx/design-system and @ai-matrx/agents. An import of a package that is not
        // installed is exactly the broken build this check exists to name.
        skipped.notInstalled.add(pkg);
        findings.push({ file: relative(root, file), line: imp.line, pkg, version: "(not installed)", sub, name: imp.name, why: "not-installed" });
        continue;
      }
      if (isWorkspaceSource(pkgDir)) {
        skipped.workspace++;
        continue;
      }
      const manifest = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
      const res = resolveSubpath(pkgDir, manifest, sub);
      const rel = relative(root, file);
      if (res.missingSubpath) {
        findings.push({ file: rel, line: imp.line, pkg, version: manifest.version, sub, name: imp.name, why: "subpath" });
        continue;
      }
      if (res.missingFile) {
        findings.push({ file: rel, line: imp.line, pkg, version: manifest.version, sub, name: imp.name, why: "subpath-file", target: res.missingFile });
        continue;
      }
      if (res.unresolved) {
        skipped.unresolved.push(`${pkg}@${manifest.version} ${sub}: ${res.unresolved}`);
        continue;
      }
      imports.push({
        file: rel,
        line: imp.line,
        pkg,
        version: manifest.version,
        sub,
        name: imp.name,
        typeOnly: imp.typeOnly,
        entry: res.entry,
        runtime: res.runtime,
      });
    }
  }

  // A JSON subpath (`@ai-matrx/x/package.json`) exports its top-level keys + default.
  const exportsOf = new Map();
  const valuesOf = new Map();
  const runtimeOpen = new Set();
  let runtimeChecked = 0;
  let runtimeOpenImports = 0;
  for (const entry of new Set(imports.map((i) => i.entry))) {
    if (!entry.endsWith(".json")) continue;
    const data = JSON.parse(readFileSync(entry, "utf8"));
    exportsOf.set(entry, new Set(["default", ...(data && typeof data === "object" ? Object.keys(data) : [])]));
  }
  // One program over every distinct declaration entry: the checker follows `export *`.
  const entries = [...new Set(imports.map((i) => i.entry))].filter((e) => !e.endsWith(".json"));
  const program = ts.createProgram(entries, {
    noEmit: true,
    skipLibCheck: true,
    allowJs: true,
    jsx: ts.JsxEmit.Preserve,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ESNext,
    types: [],
  });
  const checker = program.getTypeChecker();
  for (const entry of entries) {
    const sf = program.getSourceFile(entry);
    const sym = sf && checker.getSymbolAtLocation(sf);
    if (!sym) {
      // A declaration with no import/export is a global script: nothing to check against.
      exportsOf.set(entry, null);
      skipped.unresolved.push(`${relative(root, entry)}: not a module (no exports to check)`);
      continue;
    }
    const exported = checker.getExportsOfModule(sym);
    // ts.symbolName, never escapedName: TypeScript stores `__x` as `___x` (2026-10-06: the chat
    // test helpers `__resetAgentAddressCache` / `__resetCustomFieldsDoors` read as missing).
    const names = new Set(exported.map((s) => ts.symbolName(s)));
    if (sym.exports?.has("export=")) names.add("default").add("*export=*");
    exportsOf.set(entry, names);
    // Which of those names the declaration promises as a VALUE (only those must exist at runtime;
    // an interface imported without `type` is erased and never reaches the bundler).
    const values = new Set();
    for (const s of exported) {
      let target = s;
      try {
        if (s.flags & ts.SymbolFlags.Alias) target = checker.getAliasedSymbol(s);
      } catch {
        /* unresolvable alias: treat as not-a-value, never guess a finding */
      }
      if (target.flags & ts.SymbolFlags.Value) values.add(ts.symbolName(s));
    }
    valuesOf.set(entry, values);
  }
  for (const imp of imports) {
    if (imp.name === WHOLE_MODULE) continue;
    const names = exportsOf.get(imp.entry);
    if (!names || names.has("*export=*")) continue;
    if (!names.has(imp.name)) {
      findings.push({ ...imp, why: "export" });
      continue;
    }
    // Runtime half: a value the types promise must be in the JavaScript the bundler will load.
    if (imp.typeOnly || !imp.runtime || !valuesOf.get(imp.entry)?.has(imp.name)) continue;
    const runtimeNames = runtimeExportsOf(imp.runtime);
    if (runtimeNames === null) {
      runtimeOpen.add(relative(root, imp.runtime));
      runtimeOpenImports++;
      continue;
    }
    runtimeChecked++;
    if (!runtimeNames.has(imp.name)) findings.push({ ...imp, why: "runtime" });
  }
  skipped.runtimeOpen = runtimeOpen;
  skipped.runtimeOpenImports = runtimeOpenImports;
  // The package graph changes only with the lockfile, so a narrowed run leaves it alone.
  const doGraph = wantGraph ?? !only;
  const graph = doGraph ? auditPackageGraph(root) : { packages: 0, specifiers: 0, findings: [] };
  findings.push(...graph.findings);
  return {
    files: files.length,
    imports: imports.length,
    runtimeChecked,
    findings,
    skipped,
    narrowed: narrowed ?? Boolean(only),
    graphPackages: graph.packages,
    graphSpecifiers: graph.specifiers,
    graphNamed: graph.namedChecked ?? 0,
    graphUnreadable: graph.unreadable ?? 0,
  };
}

// ── the installed package graph: one @ai-matrx package importing another ─────
//
// THE DEFECT THIS EXISTS FOR (2026-10-06, v0.4.2925 red on all four Vercel projects)
// design-system 0.69.1 shipped `import … from "@ai-matrx/kit/content-transfer"`;
// it depends on kit `latest`, and kit 0.25.0 had renamed that subpath to
// `./transfer-json`. Every app import was fine, so the scan above was green; the
// break lived entirely INSIDE node_modules, and only `next build` saw it
// ("Module not found: Can't resolve '@ai-matrx/kit/content-transfer'").
//
// So: every @ai-matrx package this tree resolves (and every @ai-matrx package
// those resolve, transitively) has its shipped JavaScript read, and every
// `@ai-matrx/<dep>/<subpath>` specifier in it must be in the exports map of
// the copy of <dep> Node would resolve beside it.

const GRAPH_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\(\s*|\bimport\s+)["'](@ai-matrx\/[a-z0-9._-]+)(\/[^"'\s]*)?["']/g;

function exportsHasSubpath(exportsField, sub) {
  if (exportsField == null) return true; // no exports map: every path is reachable
  if (typeof exportsField === "string" || Array.isArray(exportsField)) return sub === ".";
  const keys = Object.keys(exportsField);
  if (!keys.some((k) => k.startsWith("."))) return sub === "."; // a bare conditions object
  for (const k of keys) {
    if (k === sub) return exportsField[k] !== null;
    const star = k.indexOf("*");
    if (star !== -1 && sub.startsWith(k.slice(0, star)) && sub.endsWith(k.slice(star + 1)) && sub.length >= k.length - 1)
      return exportsField[k] !== null;
  }
  return false;
}

/** False only when the exports map MATCHES `sub` but no file it names exists (a wildcard over a deleted directory). */
function subpathFileShipped(pkgDir, exportsField, sub) {
  if (exportsField == null || typeof exportsField !== "object" || Array.isArray(exportsField)) return true;
  if (!Object.keys(exportsField).some((k) => k.startsWith("."))) return true;
  let target = exportsField[sub];
  if (target === undefined) {
    for (const [k, v] of Object.entries(exportsField)) {
      const star = k.indexOf("*");
      if (star === -1) continue;
      const pre = k.slice(0, star);
      const post = k.slice(star + 1);
      if (sub.startsWith(pre) && sub.endsWith(post) && sub.length >= pre.length + post.length) {
        target = JSON.parse(JSON.stringify(v).split("*").join(sub.slice(pre.length, sub.length - post.length)));
        break;
      }
    }
  }
  if (target == null) return true;
  const runtimeRel = pickRuntime(target);
  const typesRel = pickTypes(target);
  if (!runtimeRel && !typesRel) return true;
  return [runtimeRel, typesRel].some((r) => r && existsSync(join(pkgDir, r)));
}

/** The runtime JS file `<dep>/<sub>` resolves to (import condition first), or null. */
function runtimeFileOf(depDir, manifest, sub) {
  const exp = manifest.exports;
  if (exp == null) {
    if (sub !== ".") return null;
    const main = manifest.module ?? manifest.main ?? "index.js";
    return resolveRelativeJs(join(depDir, "package.json"), `./${main.replace(/^\.\//, "")}`);
  }
  let map = exp;
  if (typeof exp === "string" || Array.isArray(exp) || !Object.keys(exp).some((k) => k.startsWith("."))) map = { ".": exp };
  let target = map[sub];
  if (target === undefined) {
    for (const [k, v] of Object.entries(map)) {
      const star = k.indexOf("*");
      if (star === -1) continue;
      const pre = k.slice(0, star);
      const post = k.slice(star + 1);
      if (sub.startsWith(pre) && sub.endsWith(post) && sub.length >= pre.length + post.length) {
        target = JSON.parse(JSON.stringify(v).split("*").join(sub.slice(pre.length, sub.length - post.length)));
        break;
      }
    }
  }
  if (target == null) return null;
  const rel = pickRuntime(target);
  if (!rel) return null;
  const abs = join(depDir, rel);
  return existsSync(abs) ? abs : null;
}

function shippedScripts(pkgDir) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (e.name !== "node_modules") walk(join(dir, e.name));
      } else if (/\.(m?js|cjs)$/.test(e.name)) out.push(join(dir, e.name));
    }
  };
  walk(pkgDir);
  return out;
}

export function auditPackageGraph(root) {
  const findings = [];
  const seen = new Set();
  const realRoot = realpathSync(root);
  let specifiers = 0;
  let namedChecked = 0;
  let unreadable = 0; // named imports whose target's runtime exports cannot be read statically: counted, never silent
  const queue = [];
  const enqueueFrom = (fromDir) => {
    const scopeDir = join(fromDir, "node_modules", "@ai-matrx");
    if (!existsSync(scopeDir)) return;
    for (const name of readdirSync(scopeDir)) {
      const dir = join(scopeDir, name);
      if (!existsSync(join(dir, "package.json")) || isWorkspaceSource(dir)) continue;
      const real = realpathSync(dir);
      if (seen.has(real)) continue;
      seen.add(real);
      queue.push(real);
    }
  };
  enqueueFrom(root);
  while (queue.length) {
    const pkgDir = queue.shift();
    const manifest = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
    // pnpm puts a package's own dependencies beside it: <store>/node_modules/@ai-matrx/<dep>.
    enqueueFrom(dirname(dirname(pkgDir)));
    const specs = new Map();
    // spec -> name -> first shipped file importing it (the 2026-10-18 case: names, not just subpaths).
    const named = new Map();
    for (const file of shippedScripts(pkgDir)) {
      const text = readFileSync(file, "utf8");
      if (!text.includes(SCOPE)) continue;
      for (const m of text.matchAll(GRAPH_SPECIFIER)) {
        const spec = m[1] + (m[2] ?? "");
        if (!specs.has(spec)) specs.set(spec, file);
      }
      for (const imp of collectImports(file, text)) {
        if (imp.typeOnly || imp.name === WHOLE_MODULE) continue;
        if (!named.has(imp.specifier)) named.set(imp.specifier, new Map());
        const names = named.get(imp.specifier);
        if (!names.has(imp.name)) names.set(imp.name, { file, line: imp.line });
      }
    }
    for (const [spec, file] of specs) {
      const { name, sub } = splitSpecifier(spec);
      if (name === manifest.name) continue;
      specifiers++;
      // Store copies live under the REAL root (macOS: /var → /private/var), so bound the walk by it.
      const depDir = findInstalled(pkgDir, name, realRoot) ?? findInstalled(dirname(dirname(pkgDir)), name, realRoot);
      const where = `${manifest.name}@${manifest.version}/${relative(pkgDir, file).split(sep).join("/")}`;
      if (!depDir) {
        findings.push({ file: where, line: 0, pkg: name, version: "(not installed)", sub, name: spec, why: "graph-missing", importer: manifest.name });
        continue;
      }
      const dep = JSON.parse(readFileSync(join(depDir, "package.json"), "utf8"));
      if (!exportsHasSubpath(dep.exports, sub))
        findings.push({ file: where, line: 0, pkg: name, version: dep.version, sub, name: spec, why: "graph", importer: manifest.name });
      else if (!subpathFileShipped(depDir, dep.exports, sub))
        findings.push({ file: where, line: 0, pkg: name, version: dep.version, sub, name: spec, why: "graph-file", importer: manifest.name });
      else {
        // THE 2026-10-18 CASE: design-system 0.86.194 renamed formatShortcut -> formatTapShortcut while
        // the published records-ui 0.116.17 still imported formatShortcut from ./tap-target (61 app files
        // failed to load; release v0.4.3327 was cut with the pair). The subpath existed; the NAME did not.
        const names = named.get(spec);
        if (!names?.size) continue;
        const runtimeFile = runtimeFileOf(depDir, dep, sub);
        const shipped = runtimeFile ? runtimeExportsOf(runtimeFile) : null;
        if (!shipped) { unreadable += names.size; continue; } // CommonJS / open `export *`: not statically knowable, never guessed, always counted
        for (const [imported, at] of names) {
          namedChecked++;
          if (shipped.has(imported)) continue;
          findings.push({
            file: `${manifest.name}@${manifest.version}/${relative(pkgDir, at.file).split(sep).join("/")}`,
            line: at.line,
            pkg: name,
            version: dep.version,
            sub,
            name: imported,
            why: "graph-name",
            importer: manifest.name,
            importerVersion: manifest.version,
          });
        }
      }
    }
  }
  return { packages: seen.size, specifiers, namedChecked, unreadable, findings };
}

export function findingKey(f) {
  const target = f.sub === "." ? f.pkg : `${f.pkg}/${f.sub.slice(2)}`;
  return `${f.why}|${f.file}|${target}|${f.name}`;
}

function describe(f) {
  const target = f.sub === "." ? f.pkg : `${f.pkg}/${f.sub.slice(2)}`;
  if (f.why === "subpath") return `subpath "${f.sub}" is not in the package's exports map`;
  if (f.why === "subpath-file") return `subpath "${f.sub}" matches the exports map but the package ships no ${f.target} (Module not found)`;
  if (f.why === "graph-file")
    return `${f.importer} imports "${f.name}", but the ${f.pkg}@${f.version} installed beside it ships no file for "${f.sub}"`;
  if (f.why === "not-installed") return `"${f.name}" from "${target}": ${f.pkg} is NOT INSTALLED (node_modules has no copy)`;
  if (f.why === "graph")
    return `${f.importer} imports "${f.name}", but the ${f.pkg}@${f.version} installed beside it does not export "${f.sub}"`;
  if (f.why === "graph-name")
    return `${f.importer}@${f.importerVersion} imports { ${f.name} } from "${target}", but the ${f.pkg}@${f.version} installed beside it does not export "${f.name}" (renamed or removed)`;
  if (f.why === "graph-missing") return `${f.importer} imports "${f.name}", but ${f.pkg} is not installed beside it`;
  if (f.why === "runtime")
    return `export "${f.name}" is declared in "${target}"'s types but MISSING from its runtime JavaScript`;
  return `export "${f.name}" is missing from "${target}"`;
}

function report(result) {
  const { findings } = result;
  const { unresolved, workspace, runtimeOpen, runtimeOpenImports } = result.skipped;
  if (unresolved.length || workspace || runtimeOpen?.size || result.graphUnreadable) {
    console.log(
      `[matrx-imports] NOT CHECKED — ${workspace} workspace-source import(s)` +
        (runtimeOpen?.size ? `; ${runtimeOpenImports} app import(s) unreadable at runtime (${runtimeOpen.size} entry file(s)): ${[...runtimeOpen].join(", ")}` : "") +
        (result.graphUnreadable ? `; ${result.graphUnreadable} package-to-package named import(s) unreadable at runtime` : "") +
        (unresolved.length ? `; unresolvable entries:\n    ${unresolved.join("\n    ")}` : ""),
    );
  }
  for (const f of findings) {
    emitItem({
      key: findingKey(f),
      title: `${f.pkg}@${f.version}: ${describe(f)}`.slice(0, 200),
      file: f.file,
      line: f.line,
      unit: f.pkg,
      rule: f.why,
    });
  }
  if (!result.narrowed) endItems();
  const scope = result.narrowed ? ` (narrowed to ${result.files} file(s))` : "";
  const graphDone = !result.narrowed || result.graphPackages > 0;
  if (findings.length === 0) {
    console.log(
      `[matrx-imports] OK — ${result.imports} @ai-matrx import name(s) exist in the installed packages` +
        ` (${result.runtimeChecked} value import(s) also found in the runtime JavaScript)` +
        (!graphDone ? "" : `; ${result.graphSpecifiers} cross-package import(s) (${result.graphNamed ?? 0} named) across ${result.graphPackages} installed @ai-matrx package(s) resolve`) +
        `${scope}.`,
    );
    return 0;
  }
  const byPkg = new Map();
  for (const f of findings) {
    const key = `${f.pkg}@${f.version}`;
    if (!byPkg.has(key)) byPkg.set(key, []);
    byPkg.get(key).push(f);
  }
  console.error(
    `[FAIL] [matrx-imports] ${findings.length} import(s) name something the ${result.lockMode ? "LOCKED (pnpm-lock.yaml — what Vercel installs)" : "INSTALLED"} @ai-matrx package does not ship${scope}:`,
  );
  for (const [key, list] of byPkg) {
    console.error(`\n  ${key}${result.lockMode ? " (locked)" : ""}`);
    for (const f of list) console.error(`    ${f.file}:${f.line}  ${describe(f)}`);
  }
  if (result.lockMode) {
    const need = [...new Map(findings.filter((f) => f.installedHasIt).map((f) => [f.pkg, f.installed])).entries()];
    for (const [pkg, v] of need) console.error(`\n  NEEDED: ${pkg}@${v} (installed here) has it; pnpm-lock.yaml still locks ${byPkgVersion(findings, pkg)}.`);
    const none = [...new Set(findings.filter((f) => !f.installedHasIt).map((f) => f.pkg))];
    if (none.length) console.error(`\n  NO installed version has it: ${none.join(", ")} — the package must publish it first (aidream npm train).`);
    console.error(
      `\n  The fix goes in THE SAME COMMIT: run \`pnpm sync:matrx-packages\` (adopts the published versions into\n` +
        `  package.json + pnpm-lock.yaml), then stage package.json and pnpm-lock.yaml with this change. If the\n` +
        `  locked version DROPPED the name, fix the importer instead. Never pin; never delete the import to go green.`,
    );
    return 1;
  }
  console.error(
    `\n  The consumer shipped before the package (or the install is broken). Never commit app code that\n` +
      `  uses a new package API until the tarball is served, the install succeeds and the app compiles:\n` +
      `    pnpm check:matrx-lockfile     # every @ai-matrx version in pnpm-lock.yaml answers 200\n` +
      `    pnpm sync:matrx-packages      # waits for the tarballs, then updates the lockfile\n` +
      `  Never pin; never delete the import to go green.`,
  );
  return 1;
}

function byPkgVersion(findings, pkg) {
  return `${pkg}@${findings.find((f) => f.pkg === pkg)?.version}`;
}

/** --packages report: one line per broken importer -> dependency name. */
function reportPackages(graph) {
  if (!graph.findings.length) {
    console.log(
      `[matrx-imports --packages] OK — ${graph.specifiers} cross-package specifier(s), ${graph.namedChecked} named import(s) across ${graph.packages} installed @ai-matrx package(s) resolve.` +
        (graph.unreadable ? ` NOT CHECKED: ${graph.unreadable} named import(s) whose target runtime is not statically readable.` : ""),
    );
    return 0;
  }
  console.error(`[FAIL] [matrx-imports --packages] ${graph.findings.length} installed @ai-matrx package(s) import something their installed sibling does not ship:`);
  for (const f of graph.findings) console.error(`    ${f.file}:${f.line}  ${describe(f)}`);
  console.error(
    `\n  One package was published before (or without) its dependents. Do not adopt this set: republish the\n` +
      `  importer against the new name (aidream's npm train), then run 'pnpm sync:matrx-packages' again.`,
  );
  return 1;
}

// ── self-test: the ALC-13 case, RED then GREEN, in a temp tree ──────────────

function writePkg(root, version, withValidator) {
  const dir = join(root, "node_modules", "@ai-matrx", "content-ir");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, "dist"), { recursive: true });
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({
      name: "@ai-matrx/content-ir",
      version,
      type: "module",
      exports: {
        ".": { import: { types: "./dist/index.d.ts", default: "./dist/index.js" } },
        "./registry": {
          import: { types: "./dist/registry.d.ts", default: "./dist/registry.js" },
          require: { types: "./dist/registry.d.cts", default: "./dist/registry.cjs" },
        },
        "./package.json": "./package.json",
      },
    }),
  );
  writeFileSync(join(dir, "dist", "index.d.ts"), `export * from "./registry.js";\nexport declare const VERSION: string;\n`);
  writeFileSync(
    join(dir, "dist", "kinds.d.ts"),
    `export interface KindSchema { id: string }\n` +
      (withValidator ? `export declare function createKindValidator(): unknown;\n` : ""),
  );
  writeFileSync(join(dir, "dist", "registry.d.ts"), `export * from "./kinds.js";\nexport declare function listKinds(): string[];\n`);
}

function writeDesignSystem(root, version, { types, runtime }) {
  const dir = join(root, "node_modules", "@ai-matrx", "design-system");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, "dist"), { recursive: true });
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({
      name: "@ai-matrx/design-system",
      version,
      type: "module",
      exports: { "./controls": { import: { types: "./dist/controls.d.ts", default: "./dist/controls.js" } } },
    }),
  );
  writeFileSync(
    join(dir, "dist", "controls.d.ts"),
    `export type ControlSize = "sm" | "md";\nexport declare function Button(): unknown;\nexport declare function __resetControls(): void;\n` +
      (types ? `export declare function Input(): unknown;\nexport declare const SelectTrigger: unknown;\n` : ""),
  );
  writeFileSync(
    join(dir, "dist", "chunk-A1.js"),
    `function Input() {}\nconst SelectTrigger = {};\nexport { Input, SelectTrigger };\n`,
  );
  writeFileSync(
    join(dir, "dist", "controls.js"),
    `export function Button() {}\nexport function __resetControls() {}\n` + (runtime ? `export * from "./chunk-A1.js";\n` : `export { SelectTrigger } from "./chunk-A1.js";\n`),
  );
}

function selfTest() {
  const tmp = mkdtempSync(join(tmpdir(), "matrx-imports-"));
  const failures = [];
  try {
    mkdirSync(join(tmp, "features"), { recursive: true });
    writeFileSync(
      join(tmp, "features", "kind-schema-source.ts"),
      `import {\n  createKindValidator,\n  listKinds,\n  type KindSchema,\n} from "@ai-matrx/content-ir/registry";\nexport { VERSION } from "@ai-matrx/content-ir";\nimport { version } from "@ai-matrx/content-ir/package.json";\n`,
    );
    writeFileSync(join(tmp, "features", "subpath.ts"), `import { x } from "@ai-matrx/content-ir/nope";\n`);

    // RED: 0.18.6 does not ship createKindValidator (the live 2026-09-25 case), and a non-exported subpath.
    writePkg(tmp, "0.18.6", false);
    clearPackageResolution();
    let r = audit(tmp);
    const miss = r.findings.find((f) => f.name === "createKindValidator");
    if (!miss) failures.push("RED: createKindValidator missing from 0.18.6 was not reported");
    else if (miss.version !== "0.18.6" || miss.pkg !== "@ai-matrx/content-ir" || miss.sub !== "./registry")
      failures.push(`RED: finding does not name package/version/subpath: ${JSON.stringify(miss)}`);
    if (!r.findings.some((f) => f.why === "subpath")) failures.push("RED: non-exported subpath was not reported");
    if (r.findings.some((f) => ["listKinds", "KindSchema", "VERSION", "version"].includes(f.name)))
      failures.push("RED: an export that exists (through export *) was reported missing");

    // GREEN: 0.19.0 ships it; drop the bad subpath file.
    rmSync(join(tmp, "features", "subpath.ts"));
    writePkg(tmp, "0.19.0", true);
    clearPackageResolution();
    r = audit(tmp);
    if (r.findings.length) failures.push(`GREEN: expected no findings, got ${JSON.stringify(r.findings)}`);
    if (r.imports !== 5) failures.push(`GREEN: expected 5 checked names, got ${r.imports}`);

    // ── THE 2026-10-05 CASE: components/ui/input.tsx imports `Input` from
    // @ai-matrx/design-system/controls while the lockfile installed 0.64.0, which lacks it.
    mkdirSync(join(tmp, "components", "ui"), { recursive: true });
    writeFileSync(
      join(tmp, "components", "ui", "input.tsx"),
      `import { Input as PackageInput, SelectTrigger, __resetControls, type ControlSize } from "@ai-matrx/design-system/controls";\nexport { PackageInput, SelectTrigger, __resetControls };\n`,
    );
    writeDesignSystem(tmp, "0.64.0", { types: false, runtime: false });
    clearPackageResolution();
    runtimeCache.clear();
    r = audit(tmp);
    const input = r.findings.find((f) => f.name === "Input");
    if (!input || input.version !== "0.64.0" || input.why !== "export" || input.line !== 1)
      failures.push(`RED 2026-10-05: Input missing from design-system 0.64.0 not reported with file:line+version: ${JSON.stringify(input)}`);
    if (r.findings.some((f) => f.name === "ControlSize")) failures.push("RED 2026-10-05: an existing type was reported");
    if (r.findings.some((f) => f.name === "__resetControls"))
      failures.push("RED 2026-10-06: an existing double-underscore export was reported missing");

    // RUNTIME: the types promise Input, the shipped JavaScript does not carry it.
    writeDesignSystem(tmp, "0.66.0", { types: true, runtime: false });
    clearPackageResolution();
    runtimeCache.clear();
    r = audit(tmp);
    if (!r.findings.some((f) => f.name === "Input" && f.why === "runtime"))
      failures.push(`RED runtime: Input in types but not in controls.js was not reported: ${JSON.stringify(r.findings)}`);
    if (r.findings.some((f) => f.name === "ControlSize"))
      failures.push("RED runtime: a type-only import was checked against the runtime");

    // GREEN: 0.66.1 ships Input + SelectTrigger in types AND runtime (through a chunk `export *`).
    writeDesignSystem(tmp, "0.66.1", { types: true, runtime: true });
    clearPackageResolution();
    runtimeCache.clear();
    r = audit(tmp);
    if (r.findings.length) failures.push(`GREEN 0.66.1: expected no findings, got ${JSON.stringify(r.findings)}`);
    if (r.runtimeChecked < 2) failures.push(`GREEN 0.66.1: expected the 2 value imports runtime-checked, got ${r.runtimeChecked}`);

    // RED: the half-uninstalled node_modules (frozen install died on a 404 tarball).
    rmSync(join(tmp, "node_modules", "@ai-matrx", "design-system"), { recursive: true, force: true });
    clearPackageResolution();
    r = audit(tmp);
    if (!r.findings.some((f) => f.why === "not-installed" && f.pkg === "@ai-matrx/design-system"))
      failures.push("RED not-installed: an import of a package missing from node_modules was not reported");

    // NARROWED: a changed-files run sees only the named paths.
    r = audit(tmp, { only: ["features"] });
    if (!r.narrowed || r.findings.some((f) => f.file.startsWith("components")))
      failures.push("NARROWED: a run narrowed to features/ reported a components/ file");

    // ── THE 2026-10-06 CASE: design-system 0.69.1 imports kit/content-transfer; kit 0.25.0 renamed it.
    const graphPkg = (name, version, exportsMap, js) => {
      const dir = join(tmp, "node_modules", "@ai-matrx", name);
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(join(dir, "dist", "data-table"), { recursive: true });
      writeFileSync(join(dir, "package.json"), JSON.stringify({ name: `@ai-matrx/${name}`, version, type: "module", exports: exportsMap }));
      writeFileSync(join(dir, "dist", "data-table", "index.js"), js);
    };
    graphPkg("kit", "0.25.0", { "./transfer-json": "./dist/data-table/index.js", "./format": "./dist/data-table/index.js" }, "export const x = 1;\nexport const f = 1;\nexport const normalizeTransferJson = 1;\n");
    graphPkg(
      "design-system",
      "0.69.1",
      { "./data-table": "./dist/data-table/index.js" },
      `import { normalizeTransferJson } from "@ai-matrx/kit/content-transfer";\nimport { f } from "@ai-matrx/kit/format";\nconst m = () => import("@ai-matrx/design-system/data-table");\n`,
    );
    clearPackageResolution();
    let g = auditPackageGraph(tmp);
    const ct = g.findings.find((f) => f.why === "graph" && f.sub === "./content-transfer");
    if (!ct || ct.importer !== "@ai-matrx/design-system" || ct.version !== "0.25.0" || !ct.file.startsWith("@ai-matrx/design-system@0.69.1/"))
      failures.push(`RED 2026-10-06: kit/content-transfer missing from kit 0.25.0 not reported with importer+version: ${JSON.stringify(g.findings)}`);
    if (g.findings.some((f) => f.sub === "./format" || f.pkg === "@ai-matrx/design-system"))
      failures.push("RED 2026-10-06: an exported subpath or a self-import was reported");
    if (!audit(tmp).findings.some((f) => f.why === "graph")) failures.push("RED 2026-10-06: the full audit did not carry the graph finding");
    if (audit(tmp, { only: ["features"] }).findings.some((f) => f.why === "graph"))
      failures.push("NARROWED: a narrowed run scanned the package graph");
    // GREEN: design-system 0.70.1 imports the renamed subpath.
    graphPkg(
      "design-system",
      "0.70.1",
      { "./data-table": "./dist/data-table/index.js" },
      `import { normalizeTransferJson } from "@ai-matrx/kit/transfer-json";\n`,
    );
    clearPackageResolution();
    g = auditPackageGraph(tmp);
    if (g.findings.length || g.specifiers !== 1) failures.push(`GREEN 2026-10-06: expected 1 clean specifier, got ${JSON.stringify(g)}`);
    // ── THE 2026-10-18 CASE: the subpath exists but the NAME was renamed (formatShortcut -> formatTapShortcut).
    graphPkg("kit", "0.25.1", { "./transfer-json": "./dist/data-table/index.js" }, "export function formatTapShortcut() {}\nexport const normalizeTransferJson = 1;\n");
    graphPkg("design-system", "0.70.2", { "./data-table": "./dist/data-table/index.js" }, `import { formatShortcut as fs, normalizeTransferJson } from "@ai-matrx/kit/transfer-json";\n`);
    clearPackageResolution();
    runtimeCache.clear();
    g = auditPackageGraph(tmp);
    const renamed = g.findings.find((f) => f.why === "graph-name");
    if (!renamed || renamed.name !== "formatShortcut" || renamed.version !== "0.25.1" || g.findings.length !== 1)
      failures.push(`RED 2026-10-18: a renamed export imported by a sibling package was not reported exactly once: ${JSON.stringify(g.findings)}`);
    if (!describe(renamed ?? { why: "graph-name", sub: ".", pkg: "" }).includes("formatShortcut"))
      failures.push("RED 2026-10-18: the finding does not name the broken import");
    graphPkg("design-system", "0.70.3", { "./data-table": "./dist/data-table/index.js" }, `import { formatTapShortcut, normalizeTransferJson } from "@ai-matrx/kit/transfer-json";\n`);
    clearPackageResolution();
    runtimeCache.clear();
    g = auditPackageGraph(tmp);
    if (g.findings.length || g.namedChecked !== 2) failures.push(`GREEN 2026-10-18: expected 2 clean named imports, got ${JSON.stringify(g)}`);
    // RED: the dependency is not installed beside the importer at all.
    rmSync(join(tmp, "node_modules", "@ai-matrx", "kit"), { recursive: true, force: true });
    clearPackageResolution();
    if (!auditPackageGraph(tmp).findings.some((f) => f.why === "graph-missing"))
      failures.push("RED graph-missing: an import of an uninstalled sibling package was not reported");

    // ── THE 2026-10-18 UNREADABLE CASE (final review 5a): content-ir 0.24.29 dist/react.js re-exported from
    // ITS OWN package by name and the runtime half printed "NOT CHECKED". Self-references now resolve through
    // the package's own exports map; what still cannot be read is COUNTED, never skipped silently.
    {
      const selfDir = join(tmp, "node_modules", "@ai-matrx", "selfref");
      rmSync(selfDir, { recursive: true, force: true });
      mkdirSync(join(selfDir, "dist"), { recursive: true });
      writeFileSync(join(selfDir, "package.json"), JSON.stringify({ name: "@ai-matrx/selfref", version: "1.0.0", type: "module", exports: { ".": "./dist/index.js", "./inner": "./dist/inner.js" } }));
      writeFileSync(join(selfDir, "dist", "index.js"), `export * from "@ai-matrx/selfref/inner";\nexport const own = 1;\n`);
      writeFileSync(join(selfDir, "dist", "inner.js"), `export const real = 1;\n`);
      runtimeCache.clear();
      const viaSelf = runtimeExportsOf(join(selfDir, "dist", "index.js"));
      if (!viaSelf || !viaSelf.has("real") || !viaSelf.has("own") || viaSelf.has("ghost"))
        failures.push(`RED 5a: export * from the package's own specifier was not resolved through its exports map: ${viaSelf && [...viaSelf]}`);
      // Another package's star stays open, and the open import is COUNTED and PRINTED.
      graphPkg("kit", "0.26.0", { ".": "./dist/data-table/index.js" }, `export * from "some-external-lib";\n`);
      graphPkg("design-system", "0.71.0", { "./data-table": "./dist/data-table/index.js" }, `import { somewhere } from "@ai-matrx/kit";\nimport { more } from "@ai-matrx/kit";\n`);
      clearPackageResolution();
      runtimeCache.clear();
      g = auditPackageGraph(tmp);
      if (g.unreadable !== 2 || g.findings.length) failures.push(`RED 5a: unreadable package-to-package imports were not counted (want 2, no findings): ${JSON.stringify(g)}`);
      const printed = [];
      const realLog = console.log;
      console.log = (m) => printed.push(String(m));
      reportPackages(g);
      console.log = realLog;
      if (!printed.join("\n").includes("NOT CHECKED: 2")) failures.push(`RED 5a: the --packages report did not print the unreadable count: ${printed.join(" | ")}`);
      rmSync(selfDir, { recursive: true, force: true });
      rmSync(join(tmp, "node_modules", "@ai-matrx", "kit"), { recursive: true, force: true });
      rmSync(join(tmp, "node_modules", "@ai-matrx", "design-system"), { recursive: true, force: true });
      clearPackageResolution();
      runtimeCache.clear();
    }

    // ── THE 2026-10-07 CASE (v0.4.2980–2982 never deployed): chat 0.4.0 deleted
    // dist/agents/model-registry/ while its `./agents/*` wildcard still matched the app's import.
    const wild = (version, withSlice) => {
      const dir = join(tmp, "node_modules", "@ai-matrx", "chat");
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(join(dir, "dist", "agents", "model-registry"), { recursive: true });
      writeFileSync(
        join(dir, "package.json"),
        JSON.stringify({ name: "@ai-matrx/chat", version, type: "module", exports: { "./agents/*": { types: "./dist/agents/*.d.ts", import: "./dist/agents/*.js" } } }),
      );
      if (withSlice) {
        writeFileSync(join(dir, "dist", "agents", "model-registry", "modelRegistrySlice.d.ts"), "export declare function fetchModelOptions(): void;\n");
        writeFileSync(join(dir, "dist", "agents", "model-registry", "modelRegistrySlice.js"), "export function fetchModelOptions() {}\n");
      }
    };
    rmSync(join(tmp, "components"), { recursive: true, force: true });
    rmSync(join(tmp, "node_modules", "@ai-matrx", "design-system"), { recursive: true, force: true });
    writeFileSync(join(tmp, "features", "probe.ts"), `import { fetchModelOptions } from "@ai-matrx/chat/agents/model-registry/modelRegistrySlice";\nexport { fetchModelOptions };\n`);
    wild("0.4.0", false);
    clearPackageResolution();
    runtimeCache.clear();
    r = audit(tmp, { only: ["features"] });
    if (!r.findings.some((f) => f.why === "subpath-file" && f.pkg === "@ai-matrx/chat" && f.version === "0.4.0"))
      failures.push(`RED 2026-10-07: a wildcard subpath whose file the package no longer ships was not reported: ${JSON.stringify(r.findings)}`);
    wild("0.4.1", true);
    clearPackageResolution();
    runtimeCache.clear();
    r = audit(tmp, { only: ["features"] });
    if (r.findings.some((f) => f.pkg === "@ai-matrx/chat")) failures.push(`GREEN 2026-10-07: a shipped wildcard file was reported: ${JSON.stringify(r.findings)}`);
    // The same class between packages: another package imports the deleted wildcard file.
    rmSync(join(tmp, "features", "probe.ts"));
    graphPkg("design-system", "0.80.0", { "./data-table": "./dist/data-table/index.js" }, `import { fetchModelOptions } from "@ai-matrx/chat/agents/model-registry/modelRegistrySlice";\n`);
    wild("0.4.0", false);
    clearPackageResolution();
    if (!auditPackageGraph(tmp).findings.some((f) => f.why === "graph-file" && f.importer === "@ai-matrx/design-system"))
      failures.push("RED 2026-10-07 graph: a package importing a wildcard file its sibling no longer ships was not reported");
    wild("0.4.1", true);
    clearPackageResolution();
    if (auditPackageGraph(tmp).findings.length) failures.push("GREEN 2026-10-07 graph: a shipped wildcard file was reported");

    // ── v0.4.2984/2985 and v0.4.2989: the specifier sits in a require(), an import() or an
    // `export *` shim, none of which name an import — each must still be judged, each on its own.
    rmSync(join(tmp, "node_modules", "@ai-matrx", "design-system"), { recursive: true, force: true });
    const whole = {
      "stored-scope.ts": `export const loadStream = () => require("@ai-matrx/chat/agents/model-registry/modelRegistrySlice");\n`,
      "lazy-models.ts": `export const lazyModels = () => import("@ai-matrx/chat/agents/model-registry/modelRegistrySlice");\n`,
      "kind-markdown-utils.ts": `export * from "@ai-matrx/chat/agents/model-registry/modelRegistrySlice";\n`,
    };
    for (const [file, text] of Object.entries(whole)) {
      rmSync(join(tmp, "features"), { recursive: true, force: true });
      mkdirSync(join(tmp, "features"), { recursive: true });
      writeFileSync(join(tmp, "features", file), text);
      wild("0.4.0", false);
      clearPackageResolution();
      r = audit(tmp, { only: ["features"] });
      if (!r.findings.some((f) => f.file === `features/${file}` && f.why === "subpath-file" && f.version === "0.4.0"))
        failures.push(`RED whole-module (${file}): a specifier to a file chat 0.4.0 no longer ships was not reported: ${JSON.stringify(r.findings)}`);
      wild("0.4.1", true);
      clearPackageResolution();
      r = audit(tmp, { only: ["features"] });
      if (r.findings.length) failures.push(`GREEN whole-module (${file}): a shipped file was reported: ${JSON.stringify(r.findings)}`);
    }

    // ── COMMIT-HOOK MODE (--staged): audits the INDEX, never the rest of a shared working tree.
    {
      const repo = join(tmp, "staged-repo");
      mkdirSync(join(repo, "lib"), { recursive: true });
      const git = (...a) => execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...a], { cwd: repo, stdio: "ignore" });
      git("init", "-q");
      writeFileSync(join(repo, ".gitignore"), "node_modules\n");
      writeFileSync(join(repo, "pnpm-lock.yaml"), "lock: 1\n");
      writeFileSync(join(repo, "lib", "committed.ts"), `import { createKindValidator } from "@ai-matrx/content-ir/registry";\nexport { createKindValidator };\n`);
      git("add", "-A");
      git("commit", "-qm", "base");
      const fresh = () => { clearPackageResolution(); runtimeCache.clear(); };
      const staged = (...files) => { fresh(); return stagedAudit(repo, files).findings; };

      // An untracked file from another lane is broken; only the lockfile is staged against a good install.
      writePkg(repo, "0.19.0", true);
      writeFileSync(join(repo, "lib", "other-lane.test.ts"), `import { x } from "@ai-matrx/content-ir/nope";\n`);
      writeFileSync(join(repo, "pnpm-lock.yaml"), "lock: 2\n");
      git("add", "pnpm-lock.yaml");
      let f = staged("pnpm-lock.yaml");
      if (f.length) failures.push(`STAGED GREEN: an untracked broken file blocked a lockfile-only commit: ${JSON.stringify(f)}`);
      if (!audit(repo).findings.some((x) => x.why === "subpath")) failures.push("STAGED: full-tree mode no longer sees the untracked broken file");

      // A staged file with a bad import is refused — by its INDEX blob, even when the working copy is fixed.
      writeFileSync(join(repo, "lib", "new.ts"), `import { x } from "@ai-matrx/content-ir/nope";\n`);
      git("add", "lib/new.ts");
      writeFileSync(join(repo, "lib", "new.ts"), `export const x = 1;\n`);
      f = staged("lib/new.ts");
      if (!f.some((x) => x.why === "subpath" && x.file === join("lib", "new.ts"))) failures.push(`STAGED RED: a staged bad import was not refused: ${JSON.stringify(f)}`);
      git("rm", "-qf", "--cached", "lib/new.ts");
      f = staged("lib/new.ts");
      if (f.length) failures.push(`STAGED GREEN: a file that is not staged was audited: ${JSON.stringify(f)}`);

      // A lockfile bump to a version that no longer ships what a COMMITTED file imports is refused.
      writePkg(repo, "0.18.6", false);
      f = staged("pnpm-lock.yaml");
      if (!f.some((x) => x.name === "createKindValidator" && x.file === join("lib", "committed.ts")))
        failures.push(`STAGED RED: a lockfile bump that breaks a committed file was not refused: ${JSON.stringify(f)}`);

      // ── LOCKFILE MODE (--lock): a lockfile-ONLY adoption installs nothing, so the checks above stay green
      // against the old install. The lockfile's own versions are fetched (here: a stand-in) and judged.
      const lockText = (v) => `lockfileVersion: '9.0'\n\nimporters:\n\n  .:\n    dependencies:\n      '@ai-matrx/content-ir':\n        specifier: latest\n        version: ${v}(react@19.0.0)\n`;
      const side = join(tmp, "lock-side");
      const fetched = [];
      const fakeFetch = (name, version) => {
        fetched.push(`${name}@${version}`);
        writePkg(side, version, version !== "0.18.6");
        return join(side, "node_modules", "@ai-matrx", "content-ir");
      };
      writePkg(repo, "0.19.0", true); // INSTALLED: ships createKindValidator
      writeFileSync(join(repo, "pnpm-lock.yaml"), lockText("0.18.6"));
      git("add", "pnpm-lock.yaml");
      fresh();
      let lr = lockAudit(repo, { fetch: fakeFetch });
      if (!lr.findings.some((x) => x.name === "createKindValidator" && x.version === "0.18.6" && x.file === join("lib", "committed.ts")))
        failures.push(`LOCK RED: a lockfile-only adoption of a version that dropped an export was not refused (installed copy still has it): ${JSON.stringify(lr.findings)}`);
      if (JSON.stringify(fetched) !== JSON.stringify(["@ai-matrx/content-ir@0.18.6"]))
        failures.push(`LOCK: the locked version was not the one judged: ${JSON.stringify(fetched)}`);
      writeFileSync(join(repo, "pnpm-lock.yaml"), lockText("0.19.0"));
      git("add", "pnpm-lock.yaml");
      fetched.length = 0;
      fresh();
      lr = lockAudit(repo, { fetch: fakeFetch });
      if (lr.findings.length) failures.push(`LOCK GREEN: a lockfile naming the installed version was refused: ${JSON.stringify(lr.findings)}`);
      if (fetched.length) failures.push(`LOCK GREEN: a version that is already installed was fetched anyway: ${JSON.stringify(fetched)}`);
      // The committed lockfile (HEAD), not the index, when --ref says so.
      git("commit", "-qm", "lock 0.19.0");
      writeFileSync(join(repo, "pnpm-lock.yaml"), lockText("0.18.6"));
      git("add", "pnpm-lock.yaml");
      fresh();
      lr = lockAudit(repo, { ref: "HEAD", fetch: fakeFetch });
      if (lr.findings.length) failures.push(`LOCK --ref: the index lockfile was judged instead of the ref's: ${JSON.stringify(lr.findings)}`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  if (failures.length) {
    console.error("check-matrx-imports --self-test FAILED:");
    for (const f of failures) console.error(`  - ${f}`);
    return 1;
  }
  console.log("check-matrx-imports --self-test OK — RED on a missing export, subpath, wildcard subpath with no shipped file, runtime-only gap, uninstalled package, a broken package-to-package import (subpath and renamed name) a require()/import()/export-* specifier, an unresolvable self-referencing `export *` and an uncounted unreadable import and a lockfile-only adoption (--lock) of a version that dropped an export; GREEN once shipped.");
  return 0;
}

// realpath: run through a symlinked scripts/ dir, the module URL is the real path (a silent no-op otherwise).
if (process.argv[1] && realpathSync(resolve(process.argv[1])) === fileURLToPath(import.meta.url)) {
  let code;
  try {
    if (process.argv.includes("--self-test")) code = selfTest();
    else if (process.argv.includes("--lock")) {
      const argv = process.argv.slice(2);
      const arg = (flag, dflt) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : dflt);
      const root = arg("--root", join(dirname(fileURLToPath(import.meta.url)), ".."));
      const ref = arg("--ref", "");
      // Positional paths narrow it (repo-relative or absolute): the commit hook, the sweep, the edit hook.
      const paths = argv.filter((a, j) => !a.startsWith("--") && !["--root", "--ref"].includes(argv[j - 1]))
        // Relative paths are repo-relative; absolute ones are made so through realpaths (/var vs /private/var).
        .map((o) => (o.startsWith("/") ? relative(realpathSync(root), existsSync(o) ? realpathSync(o) : o) : o).split(sep).join("/"));
      const result = lockAudit(root, { ref, only: paths.length ? paths : null, disk: argv.includes("--disk") });
      if (argv.includes("--json")) {
        console.log(JSON.stringify({ findings: result.findings.map((f) => ({ file: f.file, line: f.line, pkg: f.pkg, version: f.version, name: f.name, installed: f.installed ?? null, installedHasIt: !!f.installedHasIt, what: describe(f) })) }));
        code = result.findings.length ? 1 : 0;
      } else {
        console.error(`[matrx-imports --lock] ${ref || (argv.includes("--disk") ? "working tree" : "index")}: lockfile names ${result.locked} @ai-matrx package(s); judged against ${result.swapped.length ? result.swapped.join(", ") : "the installed versions"}.`);
        code = report(result);
      }
    } else if (process.argv.includes("--packages")) {
      // Package-to-package only (sync:matrx-packages' adoption gate): every @ai-matrx specifier and
      // every named import inside node_modules/@ai-matrx/*/dist must resolve against the installed sibling.
      const argv = process.argv.slice(2);
      const i = argv.indexOf("--root");
      const root = i !== -1 ? argv[i + 1] : join(dirname(fileURLToPath(import.meta.url)), "..");
      code = reportPackages(auditPackageGraph(resolve(root)));
    } else {
      const argv = process.argv.slice(2);
      const i = argv.indexOf("--root");
      const root = i !== -1 ? argv[i + 1] : join(dirname(fileURLToPath(import.meta.url)), "..");
      // Narrowing: positional paths, else `pnpm findings <paths>` (MATRX_FINDINGS_PATHS).
      const stagedMode = argv.includes("--staged");
      let only = argv.filter((a, j) => !a.startsWith("--") && argv[j - 1] !== "--root");
      if (!only.length && process.env.MATRX_FINDINGS_PATHS) only = JSON.parse(process.env.MATRX_FINDINGS_PATHS);
      only = only.map((o) => relative(resolve(root), resolve(o)).split(sep).join("/").replace(/\/+$/, ""));
      // A changed manifest or lockfile changes what EVERY import resolves to: scan everything.
      if (!stagedMode && only.some((o) => /(^|\/)(package\.json|pnpm-lock\.yaml)$/.test(o))) only = [];
      code = stagedMode ? report(stagedAudit(root, only)) : report(audit(root, { only: only.length ? only : null }));
    }
  } catch (err) {
    if (err?.code === "ENOENT" && /node_modules[\\/]@ai-matrx[\\/]/.test(String(err.path ?? err.message))) {
      console.error(
        `[matrx-imports] INSTALL INCOMPLETE — ${err.path ?? err.message} is missing: a package install is still running or was cut short.\n` +
          `  This is not an import error. Wait for the install to finish (or re-run 'pnpm install'), then run this check again.`,
      );
      code = 3;
    } else {
      console.error(`[matrx-imports] could not run: ${err?.stack ?? err}`);
      code = 2;
    }
  }
  process.exitCode = code;
}
