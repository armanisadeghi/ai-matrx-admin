#!/usr/bin/env node
/**
 * moved-path-pointers.mjs — a "door" file (a path kept only so importers keep
 * working after a capability MOVED into an `@ai-matrx/*` package) must stay a
 * pointer: comments, blank lines, import/export-from statements, and simple
 * `export const X = Y` aliases of imported names. Function bodies, JSX or any
 * other logic in a door re-grows the capability outside its package.
 *
 * DOOR FILE = a tracked .ts/.tsx whose LEADING comment block says
 *   MOVED ... @ai-matrx/   |   moved to @ai-matrx/   |   door|re-export ... @ai-matrx/
 * (e.g. matrx-frontend/features/files/redux/converters.ts: "// MOVED to @ai-matrx/media/...").
 *
 * SHRINK-ONLY BASELINE (moved-path-pointers.baseline.json, keyed by repo name):
 * today's violators. Default run = census, exit 0. --strict fails only on a
 * violator NOT in the baseline. Shrinking is fine. Never wired into a gate.
 *
 * A door that deliberately keeps code: put `door-keeps-code: <reason>` in its leading comment.
 * Baseline key: --repo <name> | git remote repo name | dir name.
 *
 * usage: node moved-path-pointers.mjs [repoRoot=cwd] [--strict] [--write-baseline] [--self-test]
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE = join(HERE, "moved-path-pointers.baseline.json");
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const positional = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--repo");

const MARKER = /(?:\bMOVED\b|\b[Mm]oved (?:to|into)\b|\bshim\b|\blives in @ai-matrx\/|\b(?:re-?export(?:s|ed)?|door) (?:of|onto|to|for|from)\b|\bthin (?:door|re-?export))[^\n]*@ai-matrx\/|@ai-matrx\/[^\n]*\bshim\b/;
// A door that deliberately keeps code says so in its leading comment: `door-keeps-code: <reason>`.
const KEEPS_CODE = /door-keeps-code:\s*\S/;

/** Strip comments (string-aware enough for door files). */
export function stripComments(src) {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (c === "/" && n === "/") { while (i < src.length && src[i] !== "\n") i++; }
    else if (c === "/" && n === "*") { const e = src.indexOf("*/", i + 2); i = e < 0 ? src.length : e + 2; }
    else if (c === '"' || c === "'" || c === "`") {
      const q = c; out += c; i++;
      while (i < src.length && src[i] !== q) { if (src[i] === "\\") { out += src[i++]; } out += src[i++]; }
      out += q; i++;
    } else { out += c; i++; }
  }
  return out;
}

/** The leading comment block (before first code token). */
export function leadingComments(src) {
  const m = src.match(/^(?:\s|\/\/[^\n]*|\/\*[\s\S]*?\*\/|"use (?:client|server)";?|'use (?:client|server)';?)*/);
  return m ? m[0] : "";
}

export function isDoorSource(src) {
  return MARKER.test(leadingComments(src));
}

/** The whole offending statement: to the first ';' or newline at brace depth 0. */
export function wholeStatement(t) {
  let d = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if ("({[".includes(c)) d++;
    else if (")}]".includes(c)) d--;
    else if (d <= 0 && (c === ";" || (c === "\n" && i > 0))) return t.slice(0, i + 1).replace(/\s+/g, " ").trim();
  }
  return t.replace(/\s+/g, " ").trim();
}

/**
 * A single-statement delegating wrapper is a pointer, not a copy (the twins guard's
 * option-fixing-wrapper ruling): `export function f(a) { return pkgF(a, OPTS); }` or
 * `export const f = (a) => pkgF(a, OPTS);`. Returns the consumed length, or 0.
 */
function balancedEnd(t, i, open, close) {
  let d = 0;
  for (let j = i; j < t.length; j++) {
    if (t[j] === open) d++;
    else if (t[j] === close) { d--; if (d === 0) return j; }
  }
  return -1;
}
const DELEGATE_BODY = /^\s*(?:return\s+)?(?:await\s+)?(?:new\s+)?[\w$.]+\s*(?:<[^;]*?>)?\s*\(/;
function onlyOneCall(expr) {
  // expr starts at the callee; the call's parens must close at the end of the expression.
  const open = expr.indexOf("(");
  const end = balancedEnd(expr, open, "(", ")");
  return end !== -1 && /^\s*;?\s*$/.test(expr.slice(end + 1));
}
export function delegatorLength(t) {
  const fn = t.match(/^\s*export\s+(?:async\s+)?function\s+[\w$]+\s*(?:<[^(]*>)?\s*\(/);
  if (fn) {
    const pEnd = balancedEnd(t, fn[0].length - 1, "(", ")");
    if (pEnd === -1) return 0;
    const bStart = t.indexOf("{", pEnd);
    if (bStart === -1 || /[;=]/.test(t.slice(pEnd + 1, bStart).replace(/=>/g, ""))) return 0;
    const bEnd = balancedEnd(t, bStart, "{", "}");
    if (bEnd === -1) return 0;
    const body = t.slice(bStart + 1, bEnd);
    if (!DELEGATE_BODY.test(body)) return 0;
    return onlyOneCall(body.replace(/^\s*(?:return\s+)?(?:await\s+)?/, "")) ? bEnd + 1 : 0;
  }
  const ar = t.match(/^\s*export\s+const\s+[\w$]+\s*(?::\s*[^=]+)?=\s*(?:async\s*)?\(/);
  if (ar) {
    const pEnd = balancedEnd(t, ar[0].length - 1, "(", ")");
    if (pEnd === -1) return 0;
    const m = t.slice(pEnd + 1).match(/^\s*(?::\s*[^=]+)?=>\s*(?:await\s+)?/);
    if (!m) return 0;
    const exprStart = pEnd + 1 + m[0].length;
    const nl = t.slice(exprStart).search(/;|\n\s*(?:export|import)\b/);
    const expr = nl === -1 ? t.slice(exprStart) : t.slice(exprStart, exprStart + nl + 1);
    if (!/^(?:new\s+)?[\w$.]+\s*(?:<[^;]*?>)?\s*\(/.test(expr) || !onlyOneCall(expr)) return 0;
    return exprStart + expr.length;
  }
  return 0;
}

/** Split code into statements on top-level ';' / newline-terminated import/export. */
export function violation(src) {
  const code = stripComments(src);
  // Allowed statements, matched sequentially.
  const allowed = [
    /^\s*export\s+(?:(?:const|let)\s+[\w$]+(?::\s*[^=]+)?\s*=|default)\s*(?:React\.)?(?:dynamic|lazy)\(\s*(?:async\s*)?\(\)\s*=>\s*import\(\s*["'][^"']+["']\s*\)(?:\s*\.then\([^;]*?\))?\s*(?:,\s*\{[^}]*\})?\s*\)\s*;?/,
    /^\s*["']use (client|server)["'];?/,
    /^\s*import\s+(?:type\s+)?(?:[\w$*\s,{}]|\bas\b)*?\s*from\s*["'][^"']+["']\s*;?/,
    /^\s*import\s*["'][^"']+["']\s*;?/,
    /^\s*export\s+(?:type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s*from\s*["'][^"']+["']\s*;?/,
    /^\s*export\s+(?:type\s+)?\{[^}]*\}\s*;?/,
    /^\s*export\s+(?:const|let)\s+[\w$]+\s*(?::\s*[^=;]+)?=\s*[\w$.]+\s*;?/,
    /^\s*export\s+type\s+[\w$]+(?:<[^=]*>)?\s*=\s*[\w$.]+(?:<[^;]*>)?\s*;?/,
    /^\s*export\s+default\s+[\w$.]+\s*;?/,
    /^\s*;/,
  ];
  let rest = code;
  while (rest.trim()) {
    const hit = allowed.map((r) => rest.match(r)).find(Boolean);
    if (hit) { rest = rest.slice(hit[0].length); continue; }
    const del = delegatorLength(rest);
    if (del > 0) { rest = rest.slice(del); continue; }
    return wholeStatement(rest.trim());
  }
  return null;
}

function listFiles(root) {
  let out;
  try { out = execFileSync("git", ["-C", root, "ls-files", "*.ts", "*.tsx"], { encoding: "utf8", maxBuffer: 1 << 28 }); }
  catch (e) { console.log(`[moved-path-pointers] git ls-files failed in ${root}: ${e.message.split("\n")[0]}; nothing scanned`); return []; }
  return out.split("\n").filter((f) => f && !f.endsWith(".d.ts") && !/(^|\/)__tests__\/|\.(test|spec)\.tsx?$/.test(f));
}

export function scan(root, files = listFiles(root)) {
  let doors = 0; const violators = {}; const keepers = [];
  for (const f of files) {
    let src; try { src = readFileSync(join(root, f), "utf8"); } catch { continue; }
    if (src.length > 200_000 || !isDoorSource(src)) continue;
    if (KEEPS_CODE.test(leadingComments(src))) { keepers.push(f); continue; }
    doors++;
    const v = violation(src);
    if (v) violators[f] = v;
  }
  return { doors, violators, keepers };
}

function loadBaseline() {
  try { return existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : {}; }
  catch (e) { console.log(`[moved-path-pointers] cannot read baseline (${e.message}); treating as empty`); return {}; }
}

/** Baseline key: --repo <name>, else the git remote's repo name, else the directory name. */
export function repoName(root) {
  const i = process.argv.indexOf("--repo");
  if (i > 0 && process.argv[i + 1]) return process.argv[i + 1];
  try {
    const url = execFileSync("git", ["-C", root, "remote", "get-url", "origin"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const n = url.replace(/\.git$/, "").split(/[/:]/).pop();
    if (n) return n;
  } catch {}
  return basename(root);
}

/** Violators not in the baseline (shrink-only: removals never count). */
export function newViolators(current, baseline) { return Object.keys(current).filter((k) => !(k in baseline)); }

function selfTest() {
  const good = `// MOVED to @ai-matrx/media/x (P1)\nexport * from "@ai-matrx/media/x";\nimport { a } from "@ai-matrx/media/y";\nexport const b = a;\n`;
  const bad = `// MOVED to @ai-matrx/media/x\nexport * from "@ai-matrx/media/x";\nexport function grew(a) { return a + 1; }\n`;
  const plain = `// ordinary file\nexport function f() { return 1; }\n`;
  const fails = [];
  if (!isDoorSource(good) || violation(good)) fails.push("clean door flagged");
  if (!isDoorSource(bad) || !violation(bad)) fails.push("planted logic in door not caught");
  if (isDoorSource(plain)) fails.push("plain file treated as door");
  // planted new violator vs baseline must trip strict logic
  const base = { "a.ts": "x" };
  if (newViolators({ "a.ts": "x", "new.ts": "f" }, base).join() !== "new.ts") fails.push("planted new violator not reported");
  if (newViolators({}, base).length) fails.push("shrinking wrongly reported");
  const keeper = `// MOVED to @ai-matrx/x\n// door-keeps-code: adapter\nexport function f() { return 1; }\n`;
  if (!KEEPS_CODE.test(leadingComments(keeper))) fails.push("door-keeps-code marker not recognised");
  const okAlias = `// Moved into @ai-matrx/chat; stays as a shim\nexport type G<T> = Foo<T>;\nexport const Z = dynamic(() => import("@ai-matrx/chat/z"), { ssr: false });\n`;
  if (!isDoorSource(okAlias) || violation(okAlias)) fails.push("generic alias / dynamic door wrongly flagged: " + violation(okAlias));
  if (!/return a \+ 1/.test(violation(bad) ?? "")) fails.push("violation message is a fragment");
  // today's tree: current repo (cwd) must be green against baseline
  const root = resolve(positional[0] ?? process.cwd());
  const name = repoName(root);
  const bl = loadBaseline();
  if (bl[name]) {
    const { violators } = scan(root);
    const fresh = newViolators(violators, bl[name]);
    if (fresh.length) fails.push(`today's tree not green: ${fresh.slice(0, 3).join(", ")}`);
  }
  if (fails.length) { console.error("SELF-TEST FAIL:\n  " + fails.join("\n  ")); process.exit(1); }
  console.log("self-test ok: planted door logic caught, clean door passes, plain file ignored, today's tree green");
}

function main() {
  if (flags.has("--self-test")) return selfTest();
  const root = resolve(positional[0] ?? process.cwd());
  const name = repoName(root);
  const { doors, violators, keepers } = scan(root);
  const bl = loadBaseline();
  if (flags.has("--write-baseline")) {
    bl[name] = violators;
    writeFileSync(BASELINE, JSON.stringify(bl, null, 2) + "\n");
    console.log(`baseline written for ${name}: ${Object.keys(violators).length} violators of ${doors} doors`);
    return;
  }
  const base = bl[name] ?? {};
  const fresh = newViolators(violators, base);
  const gone = Object.keys(base).filter((k) => !(k in violators));
  console.log(`[moved-path-pointers] ${name}: ${doors} door files (+${keepers.length} door-keeps-code), ${Object.keys(violators).length} violators (baseline ${Object.keys(base).length})`);
  for (const k of Object.keys(violators).slice(0, 10)) console.log(`  ${k}: ${violators[k]}`);
  if (gone.length) console.log(`  ${gone.length} baseline entries fixed/removed — run --write-baseline to shrink`);
  if (fresh.length) {
    console.log(`  NEW violators (${fresh.length}):`);
    for (const k of fresh) console.log(`    ${k}: ${violators[k]}`);
    if (flags.has("--strict")) process.exit(1);
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
