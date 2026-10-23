#!/usr/bin/env node
// scripts/check-page-body-fills-shell.mjs — A PAGE BODY IN main.shell-main IS h-full, NEVER h-dvh / h-screen / min-h-screen.
//
// shell.css drops main.shell-main's 50dvh scroll runway (::after) only for `.h-full` children. A
// body that sets h-dvh / h-screen / min-h-screen sits next to that runway, so main becomes scrollable
// (812 + 406 = 1218 on a phone) and drawers, sheets and focus shift the whole page (PDF U7c, 2026-10-22).
//
// Scans app/(core)/**/page.tsx and layout.tsx plus the components they import directly (relative or
// @/ paths) and reports any ROOT element (the first JSX element returned) whose className has one of
// those classes. REPORT-ONLY: always exits 0 (a release is never blocked); add --strict to exit 1.
//
//   pnpm check:page-body-fills-shell              report loudly, exit 0
//   pnpm check:page-body-fills-shell --strict     exit 1 on a finding
//   pnpm check:page-body-fills-shell --self-test  prove a planted h-dvh root is RED and h-full GREEN
// Opt out one root with a reason on the line or the one above:  page-body-ok: <why>
import { readFileSync, existsSync, readdirSync, statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";

const BAD = /(?<![\w-:])(?:[\w-]+:)*(h-dvh|h-screen|min-h-screen|min-h-dvh|h-svh|h-lvh)(?![\w-])/;
const EXTS = ["", ".tsx", ".ts", "/index.tsx"];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    const s = statSync(p);
    if (s.isDirectory()) { if (n !== "node_modules" && n !== ".next") walk(p, out); }
    else if (n === "page.tsx" || n === "layout.tsx") out.push(p);
  }
  return out;
}

function resolveImport(root, from, spec) {
  let base;
  if (spec.startsWith("@/")) base = join(root, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(from), spec);
  else return null;
  for (const e of EXTS) {
    const p = base + e;
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}

// Root element of every returned JSX: the class string of the first element after `return (` / `return <`.
export function rootFindings(file, text) {
  const out = [];
  const lines = text.split("\n");
  const re = /return\s*\(?\s*<([A-Za-z][\w.]*)/g;
  let m;
  while ((m = re.exec(text))) {
    const start = m.index + m[0].length;
    // the opening tag runs to the first `>` not inside braces/strings (good enough: depth-count braces)
    let depth = 0, i = start, tag = "";
    for (; i < text.length; i++) {
      const c = text[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth <= 0 && text[i - 1] !== "=") break;
    }
    tag = text.slice(start, i);
    const cm = tag.match(/className\s*=\s*(?:"([^"]*)"|\{([\s\S]*)\})/);
    if (!cm) continue;
    const cls = cm[1] ?? cm[2];
    const hit = cls.match(BAD);
    if (!hit) continue;
    const line = text.slice(0, m.index).split("\n").length;
    if (/page-body-ok:\s*\S/.test(lines[line - 1] ?? "") || /page-body-ok:\s*\S/.test(lines[line - 2] ?? "")) continue;
    out.push(`${file}:${line} root <${m[1]}> uses ${hit[1]} — use h-full (main.shell-main drops its scroll runway only for h-full children)`);
  }
  return out;
}

export function scan(root) {
  const seen = new Set();
  const findings = [];
  for (const entry of walk(join(root, "app/(core)"))) {
    const files = [entry];
    const src = readFileSync(entry, "utf8");
    for (const im of src.matchAll(/from\s+["']([^"']+)["']/g)) {
      const r = resolveImport(root, entry, im[1]);
      if (r && r.endsWith(".tsx")) files.push(r);
    }
    for (const f of files) {
      if (seen.has(f)) continue;
      seen.add(f);
      findings.push(...rootFindings(f.replace(root + "/", ""), readFileSync(f, "utf8")));
    }
  }
  return findings;
}

if (process.argv.includes("--self-test")) {
  const t = mkdtempSync(join(tmpdir(), "page-body-"));
  try {
    const d = join(t, "app/(core)/zz");
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, "page.tsx"), `import Body from "./Body";\nexport default function P(){ return <Body/>; }\n`);
    writeFileSync(join(d, "Body.tsx"), `export default function B(){\n  return (\n    <div className="flex h-dvh flex-col">x</div>\n  );\n}\n`);
    const red = scan(t);
    writeFileSync(join(d, "Body.tsx"), `export default function B(){\n  return (\n    <div className="flex h-full flex-col">x</div>\n  );\n}\n`);
    const green = scan(t);
    if (red.length !== 1 || green.length !== 0) {
      console.error(`self-test FAILED: planted h-dvh=${red.length} (want 1), h-full=${green.length} (want 0)`);
      process.exit(1);
    }
    console.log("check:page-body-fills-shell self-test: a planted h-dvh root is RED, h-full GREEN.");
  } finally { rmSync(t, { recursive: true, force: true }); }
  process.exit(0);
}

const root = process.cwd();
const found = scan(root);
if (found.length === 0) {
  console.log("check:page-body-fills-shell OK — no page body under app/(core) uses h-dvh / h-screen / min-h-screen as its root.");
  process.exit(0);
}
console.error(`\n!!! check:page-body-fills-shell — ${found.length} page bod${found.length === 1 ? "y" : "ies"} will make main.shell-main scrollable (REPORT-ONLY, not blocking) !!!`);
for (const f of found) console.error("  " + f);
process.exit(process.argv.includes("--strict") ? 1 : 0);
