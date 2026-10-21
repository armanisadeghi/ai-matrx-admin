/**
 * The compare window, Find & Replace and "Save as Message Template" are ONE body each, in
 * @ai-matrx/chat (window-panels/windows/{diff,find-replace,message-templates}), drawn by the web
 * and Matrx 2 alike. This guards the web side: each overlay's render module draws the package
 * body, and the old web copies stay deleted (a second home would drift).
 *
 * Red before: each render imported the web copy (features/window-panels/windows/DiffViewerWindow,
 * features/overlays/components/FindReplaceOverlay, features/window-panels/windows/message-templates/…).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const CASES = [
  ["features/overlays/definitions/diffViewerWindow.render.tsx", "@ai-matrx/chat/window-panels/windows/diff/DiffViewerWindow"],
  ["features/overlays/definitions/findReplace.render.tsx", "@ai-matrx/chat/window-panels/windows/find-replace/FindReplaceWindow"],
  ["features/overlays/definitions/quickMessageTemplateSaveWindow.render.tsx", "@ai-matrx/chat/window-panels/windows/message-templates/QuickMessageTemplateSaveWindow"],
] as const;

const RETIRED = [
  "features/window-panels/windows/DiffViewerWindow.tsx",
  "features/overlays/components/FindReplaceOverlay.tsx",
  "components/modals/FindReplaceModal.tsx",
  "features/window-panels/windows/message-templates/QuickMessageTemplateSaveWindow.tsx",
  "features/message-templates/quick-save/QuickMessageTemplateSaveCore.tsx",
  "features/message-templates/quick-save/template-save.ts",
];

describe("compare / find & replace / save-as-template windows render the chat package's bodies", () => {
  it.each(CASES)("%s draws %s", (file, pkg) => {
    const src = read(file);
    expect(src).toContain(`from "${pkg}"`);
    expect(src).not.toMatch(/from "@\/features\/(window-panels|overlays\/components|message-templates)\//);
  });

  it.each(RETIRED)("the web copy %s stays deleted", (file) => {
    expect(existsSync(join(ROOT, file))).toBe(false);
  });
});
