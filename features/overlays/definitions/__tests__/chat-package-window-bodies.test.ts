/**
 * The web's overlays for windows whose bodies moved into @ai-matrx/chat mount THE PACKAGE body —
 * the same one Matrx 2 hosts — and the web's own copy is gone (one home).
 *
 * Red before: codeEditorWindow.render.tsx mounted features/window-panels/windows/code/CodeEditorWindow.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const MOVED: Array<{ overlay: string; packageModule: string; webCopy: string }> = [
  {
    overlay: "features/overlays/definitions/codeEditorWindow.render.tsx",
    packageModule: "@ai-matrx/chat/window-panels/windows/code/CodeEditorWindow",
    webCopy: "features/window-panels/windows/code/CodeEditorWindow.tsx",
  },
  {
    overlay: "features/overlays/definitions/saveContactFromSelection.render.tsx",
    packageModule: "@ai-matrx/chat/window-panels/windows/crm/SaveContactFromSelectionWindow",
    webCopy: "features/crm/components/SaveContactFromSelectionDialog.tsx",
  },
];

describe.each(MOVED)("$overlay", ({ overlay, packageModule, webCopy }) => {
  it("mounts the chat package's body", () => {
    expect(read(overlay)).toContain(`from "${packageModule}"`);
  });
  it("has no web copy left", () => {
    expect(existsSync(join(root, webCopy))).toBe(false);
  });
  it("the package module resolves", () => {
    expect(() => require.resolve(packageModule)).not.toThrow();
  });
});
