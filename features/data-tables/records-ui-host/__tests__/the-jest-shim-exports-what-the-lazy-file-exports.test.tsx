// THE JEST SHIM NEVER LIES ABOUT THE FRONT DOOR (2026-10-18, adversarial review IMPORTANT-2).
// jest.config.ts maps recordsUiLazy to recordsUiLazy.jest-shim.tsx. The shim had drifted: it lacked
// SectionCard and TableTokensProvider (any suite rendering a board section tile got "Element type is
// invalid"), and useRecordsUiFromScreen answered the module everywhere where the app answers null
// outside a screen — so a test passed down a branch the app never takes.
// This parses BOTH files and fails when their export names differ, then checks the null semantics.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";

jest.mock("@ai-matrx/records-ui", () => ({
  useRecordsUi: () => ({ marker: "screen-host" }),
  SectionCard: () => null,
}));

const DIR = join(__dirname, "..");

function exportedNames(file: string): string[] {
  const text = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
  const names = new Set<string>();
  const exported = (node: ts.Node) =>
    (ts.canHaveModifiers(node) ? ts.getModifiers(node) ?? [] : []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  for (const stmt of sf.statements) {
    if (ts.isVariableStatement(stmt) && exported(stmt)) {
      for (const d of stmt.declarationList.declarations) if (ts.isIdentifier(d.name)) names.add(d.name.text);
    } else if ((ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) && exported(stmt) && stmt.name) {
      names.add(stmt.name.text);
    } else if ((ts.isTypeAliasDeclaration(stmt) || ts.isInterfaceDeclaration(stmt)) && exported(stmt)) {
      names.add(stmt.name.text);
    } else if (ts.isExportDeclaration(stmt) && stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
      for (const el of stmt.exportClause.elements) names.add(el.name.text);
    }
  }
  return [...names].sort();
}

describe("recordsUiLazy jest shim", () => {
  it("exports exactly the names the real lazy file exports", () => {
    const real = exportedNames(join(DIR, "recordsUiLazy.tsx"));
    const shim = exportedNames(join(DIR, "__tests__", "recordsUiLazy.jest-shim.tsx"));
    expect(real.length).toBeGreaterThan(40);
    expect({ missingFromShim: real.filter((n) => !shim.includes(n)), extraInShim: shim.filter((n) => !real.includes(n)) }).toEqual({
      missingFromShim: [],
      extraInShim: [],
    });
  });

  it("answers null outside a screen and the module inside one, as the app does", () => {
    // jest.config maps this specifier to the shim.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const lazy = require("@/features/data-tables/records-ui-host/recordsUiLazy") as typeof import("../recordsUiLazy");
    const seen: Array<{ where: string; module: boolean; host: unknown }> = [];
    function Probe({ where }: { where: string }) {
      seen.push({ where, module: lazy.useRecordsUiFromScreen() !== null, host: lazy.useScreenRecordsUiHost() });
      return null;
    }
    const Inside = lazy.withRecordsUi<{ where: string }>("Probe", ({ where }) => <Probe where={where} />);
    renderToStaticMarkup(
      <>
        <Probe where="outside" />
        <Inside where="inside" />
      </>,
    );
    expect(seen).toEqual([
      { where: "outside", module: false, host: {} },
      { where: "inside", module: true, host: { marker: "screen-host" } },
    ]);
    expect(() => renderToStaticMarkup(<OutsideModuleReader read={lazy.useRecordsUiModule} />)).toThrow(/drew outside a records-ui screen/);
    expect(typeof lazy.SectionCard).toBe("function");
  });
});

function OutsideModuleReader({ read }: { read: (who: string) => unknown }) {
  read("OutsideModuleReader");
  return null;
}
