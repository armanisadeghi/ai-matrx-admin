/**
 * Builds localized editor context for prompts: up to N characters before the
 * selection/cursor anchor and N after, wrapped in simple XML-style tags.
 *
 * Anchor rules:
 * - "Before" ends at `selectionStart` (inclusive boundary: text strictly before the start).
 * - "After" begins at `selectionEnd` (text strictly after the end; for a caret, start === end).
 */

const DEFAULT_MAX_CHARS_PER_SIDE = 500;

export type EditorSurroundPosition = {
  selectionStart: number;
  selectionEnd: number;
};

function escapeXmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function clampSelectionToContent(
  content: string,
  selectionStart: number,
  selectionEnd: number,
): { start: number; end: number } {
  const len = content.length;
  let start = Number.isFinite(selectionStart) ? Math.trunc(selectionStart) : 0;
  let end = Number.isFinite(selectionEnd) ? Math.trunc(selectionEnd) : start;
  start = Math.max(0, Math.min(start, len));
  end = Math.max(start, Math.min(end, len));
  return { start, end };
}

/**
 * @param content - Full document/body text
 * @param position - Editor selection or caret (`selectionStart` / `selectionEnd` from textarea/input)
 * @param maxCharsPerSide - Characters to include on each side (default 500)
 * @returns One string: `<TEXT_BEFORE>...</TEXT_BEFORE>` then newline then `<TEXT_AFTER>...</TEXT_AFTER>`
 */
export function formatEditorSurroundContext(
  content: string,
  position: EditorSurroundPosition,
  maxCharsPerSide: number = DEFAULT_MAX_CHARS_PER_SIDE,
): string {
  const { start, end } = clampSelectionToContent(
    content,
    position.selectionStart,
    position.selectionEnd,
  );
  const n = Math.max(0, Math.trunc(maxCharsPerSide));

  const beforeStart = Math.max(0, start - n);
  const beforeSlice = content.slice(beforeStart, start);

  const afterEnd = Math.min(content.length, end + n);
  const afterSlice = content.slice(end, afterEnd);

  const before = escapeXmlText(beforeSlice).replace(/\n$/, "");
  const after = escapeXmlText(afterSlice).replace(/^\n/, "");

  return `<TEXT_BEFORE>\n${before}\n</TEXT_BEFORE>\n<TEXT_AFTER>\n${after}\n</TEXT_AFTER>`;
}
