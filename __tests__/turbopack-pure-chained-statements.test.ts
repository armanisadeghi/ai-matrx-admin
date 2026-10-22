/**
 * LIVE DEFECT (2026-10-22, www.aimatrx.com): after a sheet row insert =F13*10 stayed =F13*10 and
 * =SUM(F11:F15) did not widen. Turbopack's PRODUCTION minifier deletes a statement of the form
 *   (<pure annotation> new Set(...)).forEach(cb)
 * because the annotation makes the whole call look side-effect-free. @univerjs/sheets-formula is written
 * that way, so the shipped bundle returned empty redo data. Dev builds and tests are unminified, so they passed.
 *
 * Class guard: scan EVERY installed package's client-facing JS (node_modules/.pnpm, all @ai-matrx/* included).
 * Every such statement in a file a bundler would import must be covered by a turbopack.rules entry in
 * next.config.js that runs scripts/turbopack-pure-loop-loader.cjs. A new hit names the package and line.
 * Upstream issue text + sweep evidence: see the commit that added this file.
 */
import fs from "fs";
import path from "path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const micromatch = require("micromatch");

const root = path.resolve(__dirname, "..");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { findPureChainedStatements, PURE_RESULT_METHODS } = require(path.join(root, "scripts/scan-pure-chained-statements.cjs"));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const loader: (s: string) => string = require(path.join(root, "scripts/turbopack-pure-loop-loader.cjs"));
const nextConfigSource = fs.readFileSync(path.join(root, "next.config.js"), "utf8");

/** Globs of the turbopack rules that name the pure-loop loader, read from next.config.js text. */
function ruleGlobs(): string[] {
  const globs: string[] = [];
  const re = /"([^"\n]+)":\s*\{\s*loaders:\s*\[require\.resolve\("\.\/scripts\/turbopack-pure-loop-loader\.cjs"\)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(nextConfigSource))) globs.push(m[1]);
  return globs;
}

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

/** Every pure-annotated chained statement in client-facing files that no loader rule covers. */
function findUncovered(pnpmDir: string, globs: string[]): Hit[] {
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
            if (micromatch.isMatch(file, globs, { dot: true })) continue;
            out.push({ pkg: path.relative(nm, pkgDir), file: path.relative(root, file), line: h.line, method: h.method, snippet: h.snippet });
          }
        }
      }
    }
  }
  return out;
}

const describeHit = (h: Hit) =>
  `${h.pkg}  ${h.file}:${h.line}  .${h.method}()  ${h.snippet}\n  -> add a turbopack.rules entry for this file using scripts/turbopack-pure-loop-loader.cjs in next.config.js`;

describe("Turbopack deletes (/* pure */ new X()).method() statements: every client-facing one must be loader-covered", () => {
  const globs = ruleGlobs();

  test("rules exist and the known live-defect package is covered", () => {
    expect(globs).toContain("**/@univerjs/sheets-formula/lib/es/index.js");
  });

  test("no installed package ships an uncovered pure-annotated chained statement", () => {
    const hits = findUncovered(path.join(root, "node_modules/.pnpm"), globs);
    expect(hits.map(describeHit)).toEqual([]);
  }, 180_000);

  test("the loader removes the annotation from the statements it covers and leaves others alone", () => {
    const src = [
      "function f(a,b){",
      "  (/* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)])).forEach((k) => { out[k] = 1; });",
      "  (/* @__PURE__ */ new Map(x)).set(1, 2);",
      "  const t = (/* @__PURE__ */ new Date()).toISOString();",
      "  const id = /* @__PURE__ */ make(\"x\");",
      "  log(`${(/* @__PURE__ */ new Date()).toISOString()}`);",
      "}",
    ].join("\n");
    const out = loader(src);
    expect(findPureChainedStatements(src).length).toBeGreaterThanOrEqual(2);
    expect(out).toContain("(new Set([...Object.keys(a)");
    expect(out).toContain("(new Map(x)).set(1, 2)");
    expect(out).toContain("/* @__PURE__ */ new Date()).toISOString();");
    expect(out).toContain('/* @__PURE__ */ make("x")');
    expect(findPureChainedStatements(out).filter((h: { method: string }) => !PURE_RESULT_METHODS.has(h.method))).toEqual([]);
  });

  test("RED PROOF: a planted package with the pattern is reported with its package name and line", () => {
    const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "pure-loop-"));
    const pkg = path.join(tmp, "zz+planted@1.0.0/node_modules/zz-planted");
    fs.mkdirSync(path.join(pkg, "dist"), { recursive: true });
    fs.writeFileSync(path.join(pkg, "package.json"), JSON.stringify({ name: "zz-planted", exports: { ".": { import: "./dist/index.js" } } }));
    fs.writeFileSync(path.join(pkg, "dist/index.js"), "export function f(a){\n  (/* @__PURE__ */ new Set(a)).forEach((x) => { sideEffect(x); });\n}\n");
    try {
      const hits = findUncovered(tmp, globs);
      expect(hits).toHaveLength(1);
      expect(describeHit(hits[0])).toContain("zz-planted");
      expect(hits[0].line).toBe(2);
      // and a rule glob that matches the file turns it green
      expect(findUncovered(tmp, ["**/zz-planted/dist/index.js"])).toEqual([]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
