/**
 * A host styles the rich editor's text column ONLY through its named hook,
 * `.rich-editor-column` — never `.rich-editor-visual > div` / `.rich-editor-source > div`.
 *
 * Live defect (/notes Write, 2026-10-10): the notes host padded the column with
 * `[&_.rich-editor-visual>div]:px-…! pb-[85dvh]!`, which also matched the block
 * grip's wrapper (a direct div child of the same scroller). The grip's box grew to
 * 48px × 765px, the grip sat ON the first letters of every heading and paragraph,
 * and a press at the start of a line opened the block menu or did nothing.
 *
 * Census over every host file (geometry needs a browser; the live Playwright check
 * is in the commit message).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "../../..");

it("no host reaches into the rich editor's scrollers by child combinator", () => {
  let hits = "";
  try {
    hits = execFileSync(
      "git",
      ["grep", "-n", "-E", "rich-editor-(visual|source) ?> ?(div|\\*)|rich-editor-(visual|source)>", "--", "*.tsx", "*.ts", "*.css", ":!**/__tests__/**"],
      { cwd: root, encoding: "utf8" },
    );
  } catch {
    hits = ""; // git grep exits 1 when nothing matches
  }
  expect(hits.trim()).toBe("");
});

it("the notes editor insets the column through the named hook", () => {
  const source = readFileSync(join(__dirname, "../components/NoteEditorCore.tsx"), "utf8");
  expect(source).toContain("[&_.rich-editor-column]:px-[max(1.5rem,calc((100%-48rem)/2))]!");
  expect(source).toContain("[&_.rich-editor-column]:pb-[85dvh]!");
});
