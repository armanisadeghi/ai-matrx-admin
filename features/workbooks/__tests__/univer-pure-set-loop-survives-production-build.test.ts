/**
 * LIVE DEFECT (2026-10-22, www.aimatrx.com): after a row insert =F13*10 stayed =F13*10 and =SUM(F11:F15)
 * did not widen, with co-editing off. Root cause: Turbopack's production minifier deletes a statement
 * of the form  (<pure-annotated> new Set(...)).forEach(cb). @univerjs/sheets-formula's refRangeFormula is
 * written exactly that way, so the shipped bundle returned empty redo data and no formula was ever
 * rewritten. Dev builds and headless tests are unminified, so they passed.
 *
 * This guard is the class check: every installed @univerjs package that contains such a statement must
 * be covered by a turbopack rule in next.config.js that runs the stripping loader. A Univer upgrade that
 * adds another package with the pattern fails here until it is added.
 */
import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "../../..");
const univerDir = path.join(root, "node_modules/@univerjs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const loader: (s: string) => string = require(path.join(root, "scripts/turbopack-univer-pure-set-loader.cjs"));
const nextConfigSource = fs.readFileSync(path.join(root, "next.config.js"), "utf8");

const PURE_STATEMENT = /\(\/\* @__PURE__ \*\/ new (Set|Map)\([^;]{0,400}?\)\)\.(forEach|add|set)\(/;

const affected = fs
  .readdirSync(univerDir)
  .filter((name) => fs.existsSync(path.join(univerDir, name, "lib/es/index.js")))
  .filter((name) => PURE_STATEMENT.test(fs.readFileSync(path.join(univerDir, name, "lib/es/index.js"), "utf8")));

describe("Univer packages whose minified build would lose a pure-annotated Set/Map statement", () => {
  test("sheets-formula (the ref-range rewriter) is one of them, so this guard is live", () => {
    expect(affected).toContain("sheets-formula");
  });

  test.each(affected)("%s has a turbopack rule that strips the annotation", (name) => {
    expect(nextConfigSource).toContain(`"**/@univerjs/${name}/lib/es/index.js"`);
    expect(nextConfigSource).toContain("turbopack-univer-pure-set-loader.cjs");
  });

  test.each(affected)("the loader leaves no pure-annotated Set/Map statement in %s", (name) => {
    const source = fs.readFileSync(path.join(univerDir, name, "lib/es/index.js"), "utf8");
    expect(PURE_STATEMENT.test(source)).toBe(true);
    expect(PURE_STATEMENT.test(loader(source))).toBe(false);
  });
});
