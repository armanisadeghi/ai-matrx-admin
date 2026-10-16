/**
 * Regression (2026-10-15): typed text in a document never reached a second tab. The shared collab session
 * drops `doc.mutation.*` as in-cell scratch unless the room says it is bound to a DOCUMENT unit
 * (`forwardDocumentMutations`). The document's collab factory must say so; the workbook's must not.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../../..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

describe("document collab room", () => {
  it("is created with forwardDocumentMutations: true", () => {
    expect(read("features/documents/components/DocumentEditor.tsx")).toMatch(/forwardDocumentMutations:\s*true/);
  });
  it("workbook rooms keep dropping the cell-editor scratch (option absent)", () => {
    expect(read("features/workbooks/components/WorkbookEditor.tsx")).not.toMatch(/forwardDocumentMutations/);
  });
});
