import { plainTextOf } from "./deck-slide-ops";

export interface PastePlainDeps {
  readText: () => Promise<string | null>;
  insert: (text: string) => void;
  error: (title: string, opts?: { description?: string }) => void;
}

/**
 * Edit → Paste without formatting. Never a silent no-op: a clipboard the browser will not let the page read, an
 * empty one, and a failed read each say so on screen; only real text reaches the caret.
 */
export async function pastePlainText({ readText, insert, error }: PastePlainDeps): Promise<void> {
  try {
    const text = await readText();
    // null = the browser would not let the page read the clipboard (not the same as an empty one): say so.
    if (text === null) {
      error("The browser would not let this page read the clipboard", { description: "Press Cmd/Ctrl+Shift+V in the text instead." });
      return;
    }
    if (text === "") {
      error("The clipboard is empty");
      return;
    }
    insert(plainTextOf({ text }));
  } catch (err) {
    error("Could not read the clipboard", { description: err instanceof Error ? err.message : String(err) });
  }
}
