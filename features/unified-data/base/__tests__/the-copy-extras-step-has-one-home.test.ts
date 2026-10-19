// A COPY'S AUTOMATIONS AND PAGES ARE CARRIED BY ONE DATABASE FUNCTION (lane COPY-EXTRAS, 2026-10-19).
//
// The step (automations switched OFF, pages, column and view ids pointed at the copy's own) lived twice: TypeScript in @ai-matrx/records
// and Python in the base-move job. It now lives in custom.copy_table_extras; the browser binds it and the job calls it.
// Breaks this catches: a second copy of the step appearing in the app (a file that switches an automation off AND declares a page, or a
// named copy of it); the browser port no longer binding the one function.

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../../..");
const SCANNED = ["features", "app", "components", "lib", "hooks"];
const FORBIDDEN = /\b(copyExtras|copy_extras|pointAtCopies|point_at_copies|idsOfCopies|ids_of_copies)\b/;
const OFF = /(automation_set_enabled|automationSetEnabled)/;
const PAGE = /(dashboard_declare|dashboardDeclare)/;
// Files that DECLARE new automations and pages (not copy them): none today beyond the generated door types.
const MAKES_NEW = new Set<string>([]);

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
    const p = path.join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
}

describe("a copy's automations and pages have one home", () => {
  it("no second copy of the step exists in the app", () => {
    const files: string[] = [];
    for (const d of SCANNED) walk(path.join(ROOT, d), files);
    const self = path.relative(ROOT, __filename);
    const found: string[] = [];
    for (const f of files) {
      const rel = path.relative(ROOT, f);
      if (rel === self) continue;
      const text = readFileSync(f, "utf8");
      if (FORBIDDEN.test(text) && !/content-ir\/kinds\/troubleshooting-guide\.ts$/.test(rel)) found.push(`${rel}: a named copy of the step`);
      if (OFF.test(text) && PAGE.test(text) && !MAKES_NEW.has(rel)) found.push(`${rel}: switches an automation off and declares a page`);
    }
    expect(found).toEqual([]);
  });

  it("the browser port binds the one function", () => {
    const text = readFileSync(path.join(ROOT, "features/unified-data/base/useBasePort.ts"), "utf8");
    expect(text).toMatch(/copyTableExtras:\s*\(args\)\s*=>\s*client\.copyTableExtras\(args\)/);
  });
});
