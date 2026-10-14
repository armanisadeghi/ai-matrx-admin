/**
 * User /shapes honesty (audit SHAPES-BUGS 3.5, 3.7, 3.8, 4). Each block names the
 * planted break it catches: put the old behaviour back and the assertion fails.
 */
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import { kindHasSchema } from "../react/fixit/diagnose-kind-render-gap";
import { RENDER_PATHS } from "../render-paths/paths";
import { buildRecordColumns } from "../studio/records/buildRecordColumns";

const root = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

describe("3.5 — no button inside a column header button", () => {
  it("the Title header is plain text, so the table's own header button holds no second button", () => {
    const cols = buildRecordColumns({
      fields: [],
      creatorNames: new Map(),
      viewerId: null,
      showWriterTier: false,
    });
    const title = cols.find((c) => c.id === "title");
    expect(title).toBeDefined();
    // Planted break: the old header was a <span> holding an InfoHint <button>.
    expect(typeof title!.header).toBe("string");
    for (const col of cols) {
      if (typeof col.header === "string" || col.header == null) continue;
      expect(renderToStaticMarkup(col.header as React.ReactElement)).not.toMatch(/<button/);
    }
  });
});

describe("4 — a deliberately schemaless kind is not 'missing a schema'", () => {
  it("json (metadata.generic) has no schema gap; an ordinary kind without one still does", () => {
    expect(kindHasSchema({}, { generic: true })).toBe(true);
    expect(kindHasSchema(null, { generic: true })).toBe(true);
    expect(kindHasSchema({}, {})).toBe(false);
    expect(kindHasSchema(null, null)).toBe(false);
    expect(kindHasSchema({ type: "object", properties: { a: {} } }, null)).toBe(true);
  });
});

describe("3.7 — member-facing text carries no developer harness", () => {
  const DEV = /\d{4}-\d{2}-\d{2}|round \d|StreamBlockAccumulator|SafeBlockRenderer|applyIrKind|kind_edge|kind_definition\.|RTL harness|legacy bridge|kindFieldsToVariableDefinitions|validateStructuralLeg|\(R\d\)|Stage \d/;

  it("every path's 'where' sentence (shown to everyone) is plain", () => {
    for (const p of RENDER_PATHS) {
      expect(p.where).not.toMatch(DEV);
    }
  });

  it("the shared tabs keep engineering words out of their visible strings", () => {
    for (const file of [
      "admin/KindGateTab.tsx",
      "admin/KindSchemaTab.tsx",
      "admin/KindInputsTab.tsx",
    ]) {
      // Visible JSX text and string props only: drop comments and imports first.
      const src = read(file)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "")
        .replace(/^import[\s\S]*?;$/gm, "")
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
      const strings = [...src.matchAll(/(?:>|")([^<>{}"\n][^<>{}"\n]{12,})(?:<|")/g)].map((m) => m[1]);
      for (const text of strings) {
        if (/kindFieldsToVariableDefinitions output|variableDefinitionsToKindFields output|Derived VariableDefinition|Reconstructed kind fields/.test(text)) {
          // The two engineering panels exist, but only behind the debug gate.
          expect(src).toMatch(/\{debug && \(/);
          continue;
        }
        expect(text).not.toMatch(DEV);
      }
    }
  });

  it("the path explanations and the verdict's block-type chips are admin-debug only", () => {
    const src = read("render-paths/KindRenderPaths.tsx");
    expect(src).toMatch(/selectIsAdminDebugger/);
    expect(src).toMatch(/\{debug && \(\s*<p className="flex gap-1\.5/);
    expect(src).toMatch(/\{debug && \(\s*<span className="ml-auto/);
  });
});
