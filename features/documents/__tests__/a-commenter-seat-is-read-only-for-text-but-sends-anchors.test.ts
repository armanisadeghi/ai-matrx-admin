/**
 * Source contract (C9b live, 2026-10-19): a seat without edit access is Univer-read-only (typed text is refused, in
 * words), and a seat that may COMMENT tells the model so, so its comment anchors reach the room. Before this, a
 * commenter's typing showed on their own screen only, and their comment's anchor never reached anyone else.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(join(__dirname, "../components/DocumentEditor.tsx"), "utf8");

it("a seat without edit access is read-only, not only the 'Viewing' mode", () => {
  expect(src).toMatch(/const viewing = docMode === "viewing" \|\| !editable;/);
  expect(src).toContain("void editOps.setViewOnly(viewing);");
});

it("the refusal says what the person can do instead", () => {
  expect(src).toContain("You can comment on this document, but changing it needs edit access");
  expect(src).toContain("You have view access only");
  expect(src).toMatch(/\.onEditDenied\(\(\) => notice\.info\(refusal,/);
});

it("a commenter's view is handed to the model as comment-only", () => {
  expect(src).toContain('useCommentAccess("udt_document", documentId, editable)');
  expect(src).toMatch(/commentOnly: \(\) => commentOnlyRef\.current,/);
});
