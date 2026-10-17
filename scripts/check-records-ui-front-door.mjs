#!/usr/bin/env node
/**
 * check-records-ui-front-door — the records-ui root reaches this app through ONE file behind ONE edge.
 *
 * THE FRONT DOOR (Arman, 2026-10-16): "Make absolute certain that it's only imported ONE time and
 * that everything else only imports Y CONDITIONALLY." `@ai-matrx/records-ui` (ITEM X, every screen,
 * ~1.85 MB) is imported for its runtime values by `RecordsUiFrontDoor.tsx` (ITEM Y) alone, and Y is
 * imported by `recordsUiLazy.tsx` alone, through its one `import()`. One stray static import of the
 * root puts every screen back on whichever route reaches it. Red on any of:
 *
 *   root-runtime     — a runtime import, export-from, require() or import() of the bare
 *                      `@ai-matrx/records-ui` anywhere but the front door. `import type` (and
 *                      `export type`) are erased, so they are allowed; an `import { type A }` whose
 *                      every name is a type is refused anyway, because under `verbatimModuleSyntax`
 *                      it is kept as a side-effect import. The light entries (`/helpers`,
 *                      `/data-source`, `/table-shape`, `/object-actions`, `/skeleton`, ...) are not
 *                      the root and are not checked.
 *   front-door-import — anything but `recordsUiLazy.tsx` naming `RecordsUiFrontDoor` in an import,
 *                      export-from, require() or import(), type-only included.
 *   one-edge         — `recordsUiLazy.tsx` reaches the front door other than by exactly ONE
 *                      `import()` (a static import there would load it with the wrappers).
 *
 * EXEMPT, explicitly: tests (`__tests__/**` and `*.test.*`) may import or mock the root, and this
 * script's own fixtures. Parsed with the TypeScript AST, so an import written inside a string (a
 * guard's self-test fixture) is never a finding.
 *
 * Usage: pnpm check:records-ui-front-door · pnpm check:records-ui-front-door:self-test
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import ts from "typescript";

const ROOT = "@ai-matrx/records-ui";
const FRONT_DOOR = "features/data-tables/records-ui-host/RecordsUiFrontDoor.tsx";
const LAZY = "features/data-tables/records-ui-host/recordsUiLazy.tsx";
const SELF = "scripts/check-records-ui-front-door.mjs";

const isExempt = (path) => path === SELF || /(^|\/)__tests__\//.test(path) || /\.test\.[cm]?[jt]sx?$/.test(path);
const namesFrontDoor = (spec) => /(^|\/)RecordsUiFrontDoor(\.tsx?)?$/.test(spec);

function kindOf(path) {
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (/\.[cm]?js$/.test(path)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

/** Every module reference in one file: { spec, runtime, how, line }. */
function references(path, text) {
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kindOf(path));
  const out = [];
  const line = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const visit = (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const typeOnly = Boolean(clause?.isTypeOnly);
      out.push({ spec: node.moduleSpecifier.text, runtime: !typeOnly, how: "import", line: line(node) });
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      out.push({ spec: node.moduleSpecifier.text, runtime: !node.isTypeOnly, how: "export-from", line: line(node) });
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      const expr = node.moduleReference.expression;
      if (ts.isStringLiteral(expr)) out.push({ spec: expr.text, runtime: !node.isTypeOnly, how: "import-equals", line: line(node) });
    } else if (ts.isCallExpression(node) && node.arguments.length > 0 && ts.isStringLiteralLike(node.arguments[0])) {
      const spec = node.arguments[0].text;
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) out.push({ spec, runtime: true, how: "import()", line: line(node) });
      else if (ts.isIdentifier(node.expression) && node.expression.text === "require") out.push({ spec, runtime: true, how: "require()", line: line(node) });
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      out.push({ spec: node.argument.literal.text, runtime: false, how: "import-type-node", line: line(node) });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

export function scan(files) {
  const findings = [];
  for (const { path, text } of files) {
    if (isExempt(path)) continue;
    // Only a file that names the root or the front door can break either rule; skip the parse otherwise.
    if (!text.includes(ROOT) && !text.includes("RecordsUiFrontDoor")) continue;
    let refs;
    try {
      refs = references(path, text);
    } catch (error) {
      findings.push({ file: path, line: 0, rule: "unparsed", text: String(error) });
      continue;
    }
    for (const ref of refs) {
      if (ref.spec === ROOT && ref.runtime && path !== FRONT_DOOR) {
        findings.push({ file: path, line: ref.line, rule: "root-runtime", text: `${ref.how} of ${ROOT}` });
      }
      if (namesFrontDoor(ref.spec) && path !== LAZY && path !== FRONT_DOOR) {
        findings.push({ file: path, line: ref.line, rule: "front-door-import", text: `${ref.how} of ${ref.spec}` });
      }
    }
    if (path === LAZY) {
      const edges = refs.filter((ref) => namesFrontDoor(ref.spec));
      const dynamicEdges = edges.filter((ref) => ref.how === "import()");
      const staticRuntime = edges.filter((ref) => ref.how !== "import()" && ref.runtime);
      if (dynamicEdges.length !== 1 || staticRuntime.length > 0) {
        findings.push({
          file: path,
          line: (staticRuntime[0] ?? dynamicEdges[1] ?? { line: 0 }).line,
          rule: "one-edge",
          text: `${dynamicEdges.length} import() and ${staticRuntime.length} static runtime import(s) of the front door; exactly one import() is allowed`,
        });
      }
    }
    // An `import { type A, type B }` from the root whose every name is a type: refused, write `import type`.
    if (path !== FRONT_DOOR && text.includes(ROOT)) {
      for (const m of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']@ai-matrx\/records-ui["']/g)) {
        const before = text.slice(0, m.index);
        const names = m[1].split(",").map((s) => s.trim()).filter(Boolean);
        if (names.length > 0 && names.every((n) => n.startsWith("type "))) {
          findings.push({ file: path, line: before.split("\n").length, rule: "root-runtime", text: "import { type … } from the root is kept as a side-effect import; write `import type { … }`" });
        }
      }
    }
  }
  return findings;
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "--", "*.ts", "*.tsx", "*.js", "*.jsx", "*.mjs", "*.cjs"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
    .split("\n")
    .filter((f) => f && !f.startsWith("node_modules/") && existsSync(f));
}

function selfTest() {
  const lazyOk = `"use client";\nconst loadFrontDoor = () => import("./RecordsUiFrontDoor");\nimport type * as F from "./RecordsUiFrontDoor";\n`;
  const cases = [
    { name: "a static named import of the root", files: [{ path: "features/x/A.tsx", text: `import { TablePage } from "${ROOT}";` }], red: "root-runtime" },
    { name: "an import() of the root", files: [{ path: "features/x/B.ts", text: `const m = await import("${ROOT}");` }], red: "root-runtime" },
    { name: "a require() of the root", files: [{ path: "lib/C.js", text: `const m = require("${ROOT}");` }], red: "root-runtime" },
    { name: "an export-from of the root", files: [{ path: "features/x/D.ts", text: `export { Grid } from "${ROOT}";` }], red: "root-runtime" },
    { name: "a side-effect import of the root", files: [{ path: "features/x/E.ts", text: `import "${ROOT}";` }], red: "root-runtime" },
    { name: "an all-inline-type import of the root", files: [{ path: "features/x/F.ts", text: `import { type RecordsUiHost } from "${ROOT}";` }], red: "root-runtime" },
    { name: "a static import of the front door", files: [{ path: "features/x/G.tsx", text: `import { TablePage } from "@/features/data-tables/records-ui-host/RecordsUiFrontDoor";` }], red: "front-door-import" },
    { name: "an import() of the front door", files: [{ path: "features/x/H.tsx", text: `const m = import("./RecordsUiFrontDoor");` }], red: "front-door-import" },
    { name: "a second import() edge in the lazy file", files: [{ path: LAZY, text: lazyOk + `const again = () => import("./RecordsUiFrontDoor");` }], red: "one-edge" },
    { name: "a static import of the front door in the lazy file", files: [{ path: LAZY, text: lazyOk + `import { Grid } from "./RecordsUiFrontDoor";` }], red: "one-edge" },
  ];
  const greens = [
    { name: "the front door importing the root", files: [{ path: FRONT_DOOR, text: `export { TablePage } from "${ROOT}";` }] },
    { name: "import type from the root", files: [{ path: "features/x/I.ts", text: `import type { RecordsUiHost } from "${ROOT}";\nexport type { Grid } from "${ROOT}";` }] },
    { name: "the light entries", files: [{ path: "features/x/J.ts", text: `import { whatYouMayDo } from "${ROOT}/helpers";\nimport { RecordsSkeleton } from "${ROOT}/skeleton";` }] },
    { name: "a test mocking the root", files: [{ path: "features/x/__tests__/k.test.tsx", text: `jest.mock("${ROOT}");\nimport { Grid } from "${ROOT}";` }] },
    { name: "an import written in a string", files: [{ path: "scripts/other-guard.ts", text: "const fixture = `import { TablePage } from \"" + ROOT + "\";`;" }] },
    { name: "the lazy file with its one edge", files: [{ path: LAZY, text: lazyOk }] },
  ];
  let failed = 0;
  for (const c of cases) {
    const got = scan(c.files);
    const ok = got.some((f) => f.rule === c.red);
    console.log(`${ok ? "ok  " : "FAIL"} red   ${c.name}${ok ? "" : ` (got ${JSON.stringify(got)})`}`);
    if (!ok) failed += 1;
  }
  for (const c of greens) {
    const got = scan(c.files);
    const ok = got.length === 0;
    console.log(`${ok ? "ok  " : "FAIL"} green ${c.name}${ok ? "" : ` (got ${JSON.stringify(got)})`}`);
    if (!ok) failed += 1;
  }
  if (failed) {
    console.error(`check-records-ui-front-door self-test: ${failed} case(s) wrong.`);
    process.exit(1);
  }
  console.log(`check-records-ui-front-door self-test: ${cases.length} red and ${greens.length} green cases behave.`);
}

if (process.argv.includes("--self-test")) {
  selfTest();
} else {
  const files = trackedFiles().map((path) => ({ path, text: readFileSync(path, "utf8") }));
  // (the text read is cheap; only files naming the root or the front door are parsed)
  const findings = scan(files);
  if (!existsSync(FRONT_DOOR) || !existsSync(LAZY)) {
    console.error(`check-records-ui-front-door: ${FRONT_DOOR} and ${LAZY} must both exist.`);
    process.exit(1);
  }
  if (findings.length) {
    for (const f of findings) console.error(`${f.file}:${f.line}  [${f.rule}]  ${f.text}`);
    console.error(`\ncheck-records-ui-front-door: ${findings.length} finding(s). Screens come from recordsUiLazy, pure names from /helpers (or /data-source, /table-shape, /object-actions, /skeleton), types by import type.`);
    process.exit(1);
  }
  console.log(`check-records-ui-front-door: ${files.length} files; the root is imported only by the front door, and the front door only through recordsUiLazy's one import().`);
}
