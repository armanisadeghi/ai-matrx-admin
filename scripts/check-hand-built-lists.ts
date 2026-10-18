#!/usr/bin/env npx tsx
/**
 * check:hand-built-lists — no NEW hand-built record lists (Arman, 2026-10-17 big push).
 *
 * The census found 82 files that map records into a bordered, hover-highlighted row `<div>` and
 * 67 `*List` / `*Table` / `*Grid` components that map rows with no shared piece. `check:one-table-law`
 * only polices raw `<table>`; this guard polices the div-row lists next to it.
 *
 * WHAT THIS FLAGS (TypeScript AST, so comments / strings / types never match)
 *   hand-built-list   a `.map(record => <Row className="… border … hover:… p-…">)` whose returned
 *                     JSX root carries hand-built row chrome: a border/divide class AND a hover:
 *                     class AND a padding class — in a file that imports none of the shared
 *                     list/table pieces below.
 *   named-list        the same, in a component named `*List` / `*Table` / `*Grid` under features/,
 *                     where ANY row chrome (border/divide, hover:, padding) is enough.
 *
 * THE LADDER (canonical-table-usage rule 16) — pick the lightest piece that fits:
 *   one fact → PropertyRow (RowGroup for a group) · list of records → RecordList
 *   (@ai-matrx/design-system/record-list; one row: ItemRow) · small fully loaded set with columns or
 *   sorting → LiteTable (@ai-matrx/design-system/lite-table) · filters, paging, editing, bulk →
 *   MatrxDataTable (or MatrxTableCard) · scoped feature list page → EntityListPage.
 *
 * EXCEPTIONS: `// list-exception: <reason>` on the line above the `.map(` or above the row element.
 * BASELINE: scripts/hand-built-lists-baseline.json — shrink-only. Never add an entry; a stale
 * entry (file converted, or no longer matches) FAILS: remove it.
 *
 *   pnpm check:hand-built-lists
 *   pnpm check:hand-built-lists --json
 *   pnpm check:hand-built-lists --strict      # also fail on stale baseline rows is ALWAYS on; --strict
 *                                             # additionally prints the baseline's remaining work list
 *   pnpm check:hand-built-lists --self-test   # fixtures in a temp dir: RED per violation, GREEN on clean
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import process from "node:process";
import ts from "typescript";
import { exitAfterDrain } from "./lib/exit-after-drain";

const REPO_ROOT = resolve(__dirname, "..");
let ROOT = REPO_ROOT;
const APP_DIRS = ["app", "features", "components"];
const BASELINE_FILE = "scripts/hand-built-lists-baseline.json";
const SKIP_DIR = /(^|\/)(node_modules|\.next[^/]*|dist|build|coverage|__tests__|__fixtures__|\.git)(\/|$)/;
const TEST_FILE = /\.(test|spec)\.tsx?$/;
const EXCLUDED =
  /^(components\/mardown-display\/|app\/\(dev\)\/|app\/\(public\)\/|components\/ui\/)|(^|\/)print(s|ing)?(\/|[-.A-Z])|Print[A-Z\w]*\.tsx$/;
const ESCAPE = /list-exception:\s*\S/;

/** Importing any of these means the file already builds on a shared list/table piece. */
const PRIMITIVES = new Set([
  "MatrxDataTable",
  "MatrxTableCard",
  "EntityListPage",
  "ItemRow",
  "PropertyRow",
  "RowGroup",
  "ConfigurationTable",
  "Table",
  "TableBody",
  "TableRow",
  // Light pieces (design-system lite-table / record-list entries) and MatrxDataTable modes.
  "LiteTable",
  "RecordList",
  "MatrxComparisonTable",
  "MatrxBatchGrid",
  "MatrxDetailGrid",
]);
const PRIMITIVE_MODULES = /(^|\/)(matrx-data-table|entity-list)(\/|$)|@ai-matrx\/design-system\/(data-table|item|lite-table|record-list)/;

const BORDER = /(^|\s)(border(-[tb])?(\s|$)|border-[tbxy]-|border-border|divide-)/;
const HOVER = /(^|\s|:)hover:/;
const PADDING = /(^|\s)p[xytblr]?-\d/;
const NAMED = /(List|Table|Grid)$/;

interface Finding {
  file: string;
  line: number;
  rule: "hand-built-list" | "named-list";
  detail: string;
}

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (SKIP_DIR.test(full)) continue;
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry) && !TEST_FILE.test(entry)) out.push(full);
  }
  return out;
}

/** Every string a className expression can hold: literals, template text, cn(...) arguments. */
function classText(node: ts.Node | undefined): string {
  if (!node) return "";
  const parts: string[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isStringLiteralLike(n)) parts.push(n.text);
    else if (ts.isTemplateExpression(n)) parts.push(n.head.text, ...n.templateSpans.map((s) => s.literal.text));
    ts.forEachChild(n, visit);
  };
  visit(node);
  return parts.join(" ");
}

function rootClass(el: ts.JsxElement | ts.JsxSelfClosingElement): string {
  const opening = ts.isJsxElement(el) ? el.openingElement : el;
  for (const attr of opening.attributes.properties) {
    if (ts.isJsxAttribute(attr) && attr.name.getText() === "className") return classText(attr.initializer);
  }
  return "";
}

function unwrap(node: ts.Node | undefined): ts.Node | undefined {
  while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node))) node = node.expression;
  return node;
}

/** The JSX element a map callback returns (through parens, fragments, `return`, ternaries/`&&`). */
function returnedRoots(fn: ts.ArrowFunction | ts.FunctionExpression): Array<ts.JsxElement | ts.JsxSelfClosingElement> {
  const roots: Array<ts.JsxElement | ts.JsxSelfClosingElement> = [];
  const take = (n: ts.Node | undefined): void => {
    n = unwrap(n);
    if (!n) return;
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) roots.push(n);
    else if (ts.isJsxFragment(n)) n.children.forEach((c) => (ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c) ? roots.push(c) : undefined));
    else if (ts.isConditionalExpression(n)) {
      take(n.whenTrue);
      take(n.whenFalse);
    } else if (ts.isBinaryExpression(n)) take(n.right);
  };
  if (ts.isBlock(fn.body)) {
    const visit = (n: ts.Node) => {
      if (ts.isFunctionLike(n) && n !== fn) return;
      if (ts.isReturnStatement(n)) take(n.expression);
      ts.forEachChild(n, visit);
    };
    visit(fn.body);
  } else take(fn.body);
  return roots;
}

function importsPrimitive(sf: ts.SourceFile): boolean {
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
    if (PRIMITIVE_MODULES.test(st.moduleSpecifier.text)) return true;
    const nb = st.importClause?.namedBindings;
    if (nb && ts.isNamedImports(nb) && nb.elements.some((e) => PRIMITIVES.has((e.propertyName ?? e.name).text))) return true;
    const def = st.importClause?.name?.text;
    if (def && PRIMITIVES.has(def)) return true;
  }
  return false;
}

/** Name of the nearest enclosing component-looking declaration. */
function enclosingName(n: ts.Node): string {
  for (let p: ts.Node | undefined = n.parent; p; p = p.parent) {
    if (ts.isFunctionDeclaration(p) && p.name) return p.name.text;
    if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name) && /^[A-Z]/.test(p.name.text)) return p.name.text;
  }
  return "";
}

function scanFile(rel: string, source: string): Finding | null {
  if (EXCLUDED.test(rel) || TEST_FILE.test(rel)) return null;
  const sf = ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (importsPrimitive(sf)) return null;
  const lines = source.split("\n");
  const excepted = (...at: number[]) => at.some((l) => ESCAPE.test(lines[l] ?? "") || (l > 0 && ESCAPE.test(lines[l - 1] ?? "")));
  const fileNamed = rel.startsWith("features/") && NAMED.test(rel.replace(/\.tsx$/, "").split("/").pop() ?? "");
  let found: Finding | null = null;

  const visit = (n: ts.Node) => {
    if (found) return;
    if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      n.expression.name.text === "map" &&
      n.arguments.length > 0
    ) {
      const cb = n.arguments[0];
      if ((ts.isArrowFunction(cb) || ts.isFunctionExpression(cb)) && cb.parameters.length > 0) {
        const mapLine = sf.getLineAndCharacterOfPosition(n.expression.name.getStart()).line;
        for (const root of returnedRoots(cb)) {
          const cls = rootClass(root);
          const rootLine = sf.getLineAndCharacterOfPosition(root.getStart()).line;
          if (excepted(mapLine, rootLine)) continue;
          const full = BORDER.test(cls) && HOVER.test(cls) && PADDING.test(cls);
          const any = BORDER.test(cls) || HOVER.test(cls) || PADDING.test(cls);
          const named = fileNamed || (rel.startsWith("features/") && NAMED.test(enclosingName(n)));
          if (full || (named && any)) {
            found = {
              file: rel,
              line: rootLine + 1,
              rule: full ? "hand-built-list" : "named-list",
              detail: full
                ? "Maps records into a hand-built bordered, hover row and imports no shared list/table piece."
                : "A *List / *Table / *Grid component maps records into hand-built rows and imports no shared list/table piece.",
            };
            return;
          }
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

interface Baseline {
  files: Record<string, string>;
}

function loadBaseline(): Baseline {
  const path = join(ROOT, BASELINE_FILE);
  if (!existsSync(path)) return { files: {} };
  const j = JSON.parse(readFileSync(path, "utf8"));
  return { files: j.files ?? {} };
}

interface Result {
  findings: Finding[];
  stale: string[];
  matched: Finding[];
  scanned: number;
}

function scanApp(baseline: Baseline): Result {
  const files = APP_DIRS.flatMap((d) => walk(join(ROOT, d)));
  const matched: Finding[] = [];
  for (const file of files) {
    const rel = relative(ROOT, file).split("\\").join("/");
    const f = scanFile(rel, readFileSync(file, "utf8"));
    if (f) matched.push(f);
  }
  const hit = new Set(matched.map((m) => m.file));
  return {
    findings: matched.filter((m) => !(m.file in baseline.files)),
    stale: Object.keys(baseline.files).filter((f) => !hit.has(f)),
    matched,
    scanned: files.length,
  };
}

const LADDER =
  "Ladder (canonical-table-usage rule 16): one fact PropertyRow/RowGroup · records RecordList (@ai-matrx/design-system/record-list) · small set with columns/sorting LiteTable (@ai-matrx/design-system/lite-table) · filters/paging/editing MatrxDataTable or MatrxTableCard · scoped list page EntityListPage. Genuine exception: `// list-exception: <reason>` above the .map.";

function selfTest(): never {
  const tmp = mkdtempSync(join(tmpdir(), "hand-built-lists-"));
  const put = (rel: string, body: string) => {
    const full = join(tmp, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body);
  };
  const ROW = `<div key={r.id} className="flex items-center border-b border-border px-3 py-2 hover:bg-muted">{r.name}</div>`;
  const red: Array<[string, string, string]> = [
    ["bordered hover row", "features/a/A.tsx", `export const A = ({ rows }: any) => <div>{rows.map((r: any) => ${ROW})}</div>;\n`],
    ["row via return block", "features/a/B.tsx", `export const B = ({ rows }: any) => <div>{rows.map((r: any) => { return (${ROW}); })}</div>;\n`],
    ["row via cn()", "app/x/C.tsx", `export const C = ({ rows }: any) => <div>{rows.map((r: any) => <div key={r.id} className={cn("border-b px-2 py-1", "hover:bg-accent")}>{r.n}</div>)}</div>;\n`],
    ["named *List, light chrome", "features/a/FooList.tsx", `export const FooList = ({ rows }: any) => <ul>{rows.map((r: any) => <li key={r.id} className="px-2 py-1">{r.n}</li>)}</ul>;\n`],
    ["component named *Grid", "features/a/g.tsx", `export function BarGrid({ rows }: any) { return <div>{rows.map((r: any) => <div key={r.id} className="p-2 border">{r.n}</div>)}</div>; }\n`],
  ];
  const green: Array<[string, string, string]> = [
    ["imports ItemRow", "features/a/Ok1.tsx", `import { ItemRow } from "@ai-matrx/design-system/item";\nexport const Ok1 = ({ rows }: any) => <div>{rows.map((r: any) => ${ROW})}</div>;\n`],
    ["imports MatrxDataTable", "features/a/Ok2.tsx", `import { MatrxDataTable } from "@ai-matrx/design-system/data-table";\nexport const Ok2 = ({ rows }: any) => <div>{rows.map((r: any) => ${ROW})}</div>;\n`],
    ["list-exception comment", "features/a/Ok3.tsx", `export const Ok3 = ({ rows }: any) => <div>\n{/* list-exception: tree nodes, not records */}\n{rows.map((r: any) => ${ROW})}</div>;\n`],
    ["plain chips (no row chrome)", "features/a/Ok4.tsx", `export const Ok4 = ({ rows }: any) => <div>{rows.map((r: any) => <span key={r.id}>{r.n}</span>)}</div>;\n`],
    ["non-JSX map", "features/a/Ok5.tsx", `export const names = (rows: any[]) => rows.map((r) => r.name);\nexport const Ok5 = () => null;\n`],
    ["comment mentions the row", "features/a/Ok6.tsx", `// rows.map(r => <div className="border hover:bg-x p-2" />)\nexport const Ok6 = () => null;\n`],
    ["dev route excluded", "app/(dev)/x/page.tsx", `export default ({ rows }: any) => <div>{rows.map((r: any) => ${ROW})}</div>;\n`],
    ["test file excluded", "features/a/Z.test.tsx", `export const Z = ({ rows }: any) => <div>{rows.map((r: any) => ${ROW})}</div>;\n`],
    ["non-list name, light chrome", "features/a/Card.tsx", `export const Card = ({ rows }: any) => <div>{rows.map((r: any) => <i key={r.id} className="px-1">{r.n}</i>)}</div>;\n`],
  ];
  for (const [, rel, body] of [...red, ...green]) put(rel, body);
  put("features/a/Base.tsx", `export const Base = ({ rows }: any) => <div>{rows.map((r: any) => ${ROW})}</div>;\n`);
  put("features/a/Gone.tsx", "export const Gone = () => null;\n");

  ROOT = tmp;
  const result = scanApp({ files: { "features/a/Base.tsx": "fixture", "features/a/Gone.tsx": "fixture" } });
  let ok = true;
  const report = (label: string, pass: boolean, want: string) => {
    if (!pass) ok = false;
    console.log(`[${pass ? "OK" : "FAIL"}] ${label}: ${want}`);
  };
  for (const [label, rel] of red) report(label, result.findings.some((f) => f.file === rel), "flagged (want flagged)");
  for (const [label, rel] of green) report(label, !result.matched.some((f) => f.file === rel), "not flagged (want not flagged)");
  report("baselined offender", !result.findings.some((f) => f.file === "features/a/Base.tsx"), "not a finding (want not a finding)");
  report("stale baseline row", result.stale.length === 1 && result.stale[0] === "features/a/Gone.tsx", "reported stale (want stale=Gone)");
  rmSync(tmp, { recursive: true, force: true });
  console.log(ok ? "self-test: GREEN" : "self-test: FAILED");
  return exitAfterDrain(ok ? 0 : 1) as never;
}

function main(): void {
  if (process.argv.includes("--self-test")) selfTest();
  const json = process.argv.includes("--json");
  const strict = process.argv.includes("--strict");
  const baseline = loadBaseline();
  const r = scanApp(baseline);
  const fail = r.findings.length > 0 || r.stale.length > 0;
  if (json) {
    console.log(JSON.stringify({ findings: r.findings, stale: r.stale, baselined: Object.keys(baseline.files).length, scanned: r.scanned }, null, 2));
    exitAfterDrain(fail ? 1 : 0);
  }
  console.log(`\nhand-built record lists: scanned ${r.scanned} files, ${Object.keys(baseline.files).length} baselined (shrink-only).`);
  if (strict) for (const f of Object.keys(baseline.files)) console.log(`  baseline  ${f} — ${baseline.files[f]}`);
  for (const f of r.findings) console.log(`\n${f.rule}  ${f.file}:${f.line}\n  ${f.detail}`);
  for (const s of r.stale) console.log(`\nstale     ${s}\n  No longer a hand-built list — remove it from ${BASELINE_FILE}.`);
  if (!fail) {
    console.log("\nOK: no new hand-built record list.\n");
    exitAfterDrain(0);
  }
  console.log(`\n${r.findings.length} new, ${r.stale.length} stale. ${LADDER} Never add to ${BASELINE_FILE}.\n`);
  exitAfterDrain(1);
}

main();
