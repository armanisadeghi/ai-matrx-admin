/**
 * F-A: `univerDocToMarkdown` escapes typed `<b>` / `&amp;` so every renderer and download shows the typed text. A reader
 * that treats the string as literal characters (the Google push writes it into a Google Doc as is, the education passage
 * is quoted back verbatim, the canvas source view shows the text) must ask for the raw characters, or it would show a
 * stray backslash. Every call in these files passes `escapeMarkup: false`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const LITERAL_READERS = [
  "features/google-workspace/linked/EditorGoogleLinks.tsx",
  "features/education/trust/useDocumentPassage.ts",
  "features/canvas/core/CanvasSourceView.tsx",
];

test.each(LITERAL_READERS)("%s reads the document as literal characters", (file) => {
  const calls = readFileSync(join(ROOT, file), "utf8").match(/univerDocToMarkdown\(/g) ?? [];
  const raw = readFileSync(join(ROOT, file), "utf8").match(/univerDocToMarkdown\([^;]*escapeMarkup: false/g) ?? [];
  expect(calls.length).toBeGreaterThan(0);
  expect(raw.length).toBe(calls.length);
});
