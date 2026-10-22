/**
 * LIVE DEFECT (2026-10-22, www.aimatrx.com): after a sheet row insert =F13*10 stayed =F13*10 and
 * =SUM(F11:F15) did not widen. Turbopack's PRODUCTION build deletes the callback work of a statement of the form
 *   (<pure annotation> new Set(...)).forEach(cb)
 * because the annotation makes the whole call look side-effect-free. @univerjs/sheets-formula's refRangeFormula is
 * written that way, so the shipped bundle returned empty redo data. Dev builds and tests are unminified, so they passed.
 * (Reproduced with a one-page `next build --turbopack`: unpatched, refRangeFormula compiles to
 * `return{redoFormulaData:t,undoFormulaData:n}` with both loops gone; patched, both loops ship.)
 *
 * The fix is a pnpm patch per package (pnpm-workspace.yaml patchedDependencies, patches/*.patch) that drops the
 * annotation from those statements, so no build-time loader is needed (a turbopack.rules loader was the prime
 * suspect for two 17-minute production compile stalls and was removed in v0.4.3451).
 *
 * Class guard: scan EVERY installed package's client-facing JS (node_modules/.pnpm, all @ai-matrx/* included).
 * A hit names the package and line: patch it the same way (pnpm patch, remove the annotation, patch-commit).
 */
import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "..");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { findPureChainedStatements, PURE_RESULT_METHODS } = require(path.join(root, "scripts/scan-pure-chained-statements.cjs"));

/** The files the live defect shipped through; each is patched in pnpm-workspace.yaml patchedDependencies. */
const PATCHED_FILES = [
  "@univerjs/sheets-formula/lib/es/index.js",
  "@univerjs/sheets-formula/lib/index.js",
  "@univerjs/docs-ui/lib/es/index.js",
  "@univerjs/docs-ui/lib/index.js",
  "@tiptap/react/dist/menus/index.js",
];

type ScanHit = { line: number; method: string; snippet: string };
const unsafeHits = (src: string): ScanHit[] =>
  (findPureChainedStatements(src) as ScanHit[]).filter((h) => !PURE_RESULT_METHODS.has(h.method));

type Hit = { pkg: string; file: string; line: number; method: string; snippet: string };

const SKIP_DIRS = new Set(["node_modules", "cjs", "test", "tests", "__tests__", "bin", "cli", "examples", "docs"]);

function walkJs(dir: string, out: string[]): void {
  let ents: fs.Dirent[];
  try {
    ents = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of ents) {
    const f = path.join(dir, e.name);
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walkJs(f, out);
    } else if (/\.m?js$/.test(e.name) && !/\.min\.|\.d\./.test(e.name)) out.push(f);
  }
}

/** Entry files a bundler imports for this package (exports import/module/default conditions + module/main). */
function importTargets(pkgDir: string): { exact: Set<string>; prefixes: string[] } {
  const exact = new Set<string>();
  const prefixes: string[] = [];
  let pj: Record<string, unknown>;
  try {
    pj = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"));
  } catch {
    return { exact, prefixes };
  }
  const add = (v: string) => {
    if (!v.startsWith("./")) return;
    const star = v.indexOf("*");
    if (star >= 0) prefixes.push(path.join(pkgDir, v.slice(0, star)));
    else exact.add(path.join(pkgDir, v));
  };
  const flatten = (node: unknown, cond: string[]) => {
    if (typeof node === "string") {
      if (!cond.includes("require") && !cond.includes("types")) add(node);
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) flatten(v, k.startsWith(".") ? [] : [...cond, k]);
    }
  };
  flatten(pj.exports, []);
  for (const f of ["module", "browser"]) if (typeof pj[f] === "string") add(("./" + pj[f]).replace("././", "./"));
  if (!pj.exports && typeof pj.main === "string") add(("./" + pj.main).replace("././", "./"));
  return { exact, prefixes };
}

function reachesBundler(file: string, t: { exact: Set<string>; prefixes: string[] }): boolean {
  if (/\.cjs$/.test(file)) return false;
  return t.exact.has(file) || t.prefixes.some((p) => file.startsWith(p));
}

/** Every pure-annotated chained statement in client-facing installed files. */
function findUncovered(pnpmDir: string): Hit[] {
  const out: Hit[] = [];
  for (const entry of fs.readdirSync(pnpmDir)) {
    const nm = path.join(pnpmDir, entry, "node_modules");
    if (!fs.existsSync(nm)) continue;
    for (const top of fs.readdirSync(nm)) {
      const pkgDirs = top.startsWith("@")
        ? fs.readdirSync(path.join(nm, top)).map((n) => path.join(nm, top, n))
        : [path.join(nm, top)];
      for (const pkgDir of pkgDirs) {
        if (fs.lstatSync(pkgDir).isSymbolicLink() || !fs.existsSync(path.join(pkgDir, "package.json"))) continue;
        const files: string[] = [];
        walkJs(pkgDir, files);
        const targets = importTargets(pkgDir);
        for (const file of files) {
          if (fs.statSync(file).size > 20e6) continue;
          const src = fs.readFileSync(file, "utf8");
          if (!src.includes("PURE__")) continue;
          for (const h of findPureChainedStatements(src) as Array<{ line: number; method: string; snippet: string }>) {
            if (PURE_RESULT_METHODS.has(h.method)) continue;
            if (!reachesBundler(file, targets)) continue;
            out.push({ pkg: path.relative(nm, pkgDir), file: path.relative(root, file), line: h.line, method: h.method, snippet: h.snippet });
          }
        }
      }
    }
  }
  return out;
}

const describeHit = (h: Hit) =>
  `${h.pkg}  ${h.file}:${h.line}  .${h.method}()  ${h.snippet}\n  -> pnpm-patch this package to drop the annotation (see patches/@univerjs__sheets-formula@1.0.4.patch)`;

describe("Turbopack deletes (/* pure */ new X()).method() statements: no installed client-facing file may ship one", () => {
  test.each(PATCHED_FILES)("%s is installed patched (no unsafe pure-annotated chained statement)", (rel) => {
    const file = path.join(root, "node_modules", rel);
    expect(fs.realpathSync(file)).toContain("patch_hash=");
    expect(unsafeHits(fs.readFileSync(file, "utf8")).map((h) => `${rel}:${h.line} ${h.snippet}`)).toEqual([]);
  });

  test("the sheets-formula patch keeps both refRangeFormula loops and only drops the annotation", () => {
    const src = fs.readFileSync(path.join(root, "node_modules/@univerjs/sheets-formula/lib/es/index.js"), "utf8");
    expect(src).toContain("(new Set([...Object.keys(oldFormulaData), ...Object.keys(newFormulaData)])).forEach((unitId) => {");
    expect(src).toContain("(new Set([...Object.keys(oldFormulaData[unitId] || {}), ...Object.keys(newFormulaData[unitId] || {})])).forEach((currentSheetId) => {");
  });

  test("no installed package ships an unpatched pure-annotated chained statement", () => {
    const hits = findUncovered(path.join(root, "node_modules/.pnpm"));
    expect(hits.map(describeHit)).toEqual([]);
  }, 180_000);

  test("RED PROOF: a planted package with the pattern is reported with its package name and line", () => {
    const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "pure-loop-"));
    const pkg = path.join(tmp, "zz+planted@1.0.0/node_modules/zz-planted");
    fs.mkdirSync(path.join(pkg, "dist"), { recursive: true });
    fs.writeFileSync(path.join(pkg, "package.json"), JSON.stringify({ name: "zz-planted", exports: { ".": { import: "./dist/index.js" } } }));
    const planted = "export function f(a){\n  (/* @__PURE__ */ new Set(a)).forEach((x) => { sideEffect(x); });\n}\n";
    fs.writeFileSync(path.join(pkg, "dist/index.js"), planted);
    try {
      const hits = findUncovered(tmp);
      expect(hits).toHaveLength(1);
      expect(describeHit(hits[0])).toContain("zz-planted");
      expect(hits[0].line).toBe(2);
      // the same edit the pnpm patches make turns it green
      fs.writeFileSync(path.join(pkg, "dist/index.js"), planted.replace("/* @__PURE__ */ ", ""));
      expect(findUncovered(tmp)).toEqual([]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
