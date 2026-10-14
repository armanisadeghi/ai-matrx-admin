/**
 * DOM side of the notes spelling menu: find the checkable word under the
 * pointer (raw textarea or rich contenteditable) and replace exactly that
 * word as ONE native undo step.
 */
import { checkableWordAt, type WordSpan } from "./wordAt";

export type PointerWord =
  | { kind: "textarea"; textarea: HTMLTextAreaElement; span: WordSpan }
  | { kind: "rich"; root: HTMLElement; node: Text; span: WordSpan };

type CaretDoc = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

function caretFromPoint(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as CaretDoc;
  if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y);
    if (p) return { node: p.offsetNode, offset: p.offset };
  }
  if (doc.caretRangeFromPoint) {
    const r = doc.caretRangeFromPoint(x, y);
    if (r) return { node: r.startContainer, offset: r.startOffset };
  }
  return null;
}

const MIRROR_PROPS = [
  "fontFamily", "fontSize", "fontWeight", "fontStyle", "fontVariant", "letterSpacing",
  "lineHeight", "textTransform", "wordSpacing", "textIndent", "tabSize",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "borderTopStyle", "borderRightStyle", "borderBottomStyle", "borderLeftStyle",
  "overflowWrap", "wordBreak",
] as const;

/**
 * A textarea has no per-word DOM, so lay its text out in an invisible clone
 * sitting exactly over it and ask the browser where the point lands.
 */
export function textareaOffsetFromPoint(
  ta: HTMLTextAreaElement,
  x: number,
  y: number,
): number | null {
  const cs = window.getComputedStyle(ta);
  const rect = ta.getBoundingClientRect();
  const mirror = document.createElement("div");
  for (const p of MIRROR_PROPS) mirror.style[p as never] = cs[p as never];
  const borders = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
  Object.assign(mirror.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${ta.clientWidth + borders}px`,
    height: `${rect.height}px`,
    boxSizing: "border-box",
    margin: "0",
    overflow: "hidden",
    whiteSpace: "pre-wrap",
    opacity: "0",
    zIndex: "2147483647",
  });
  mirror.setAttribute("aria-hidden", "true");
  const textNode = document.createTextNode(ta.value);
  mirror.appendChild(textNode);
  document.body.appendChild(mirror);
  try {
    mirror.scrollTop = ta.scrollTop;
    const caret = caretFromPoint(x, y);
    if (caret && caret.node === textNode) return caret.offset;
    return null;
  } finally {
    mirror.remove();
  }
}

const NON_PROSE = "code, pre, a, [contenteditable='false'], [data-no-spellcheck]";

export function resolvePointerWord(opts: {
  x: number;
  y: number;
  target: EventTarget | null;
  textarea: HTMLTextAreaElement | null;
  richRoot: HTMLElement | null;
}): PointerWord | null {
  const { x, y, target, textarea, richRoot } = opts;
  if (!(target instanceof Node)) return null;
  if (textarea && (target === textarea || textarea.contains(target))) {
    const offset = textareaOffsetFromPoint(textarea, x, y);
    if (offset === null) return null;
    const span = checkableWordAt(textarea.value, offset);
    return span ? { kind: "textarea", textarea, span } : null;
  }
  if (richRoot && richRoot.contains(target)) {
    const caret = caretFromPoint(x, y);
    if (!caret || caret.node.nodeType !== Node.TEXT_NODE) return null;
    const node = caret.node as Text;
    if (!richRoot.contains(node)) return null;
    if (node.parentElement?.closest(NON_PROSE)) return null;
    const span = checkableWordAt(node.data, caret.offset);
    return span ? { kind: "rich", root: richRoot, node, span } : null;
  }
  return null;
}

/** True when the pointed-at word is still exactly where we saw it. */
export function pointerWordIsCurrent(pw: PointerWord): boolean {
  const text = pw.kind === "textarea" ? pw.textarea.value : pw.node.data;
  return text.slice(pw.span.start, pw.span.end) === pw.span.word;
}

/**
 * Replace exactly the word's range. `execCommand("insertText")` is the native
 * edit path, so it is one undo step and both a plain textarea and the rich
 * editor see an ordinary input. Where it is unavailable (or refuses) a
 * textarea falls back to `setRangeText` plus an input event.
 */
export function replacePointerWord(pw: PointerWord, replacement: string): boolean {
  if (!pointerWordIsCurrent(pw)) return false;
  const { start, end } = pw.span;
  if (pw.kind === "textarea") {
    const ta = pw.textarea;
    ta.focus();
    ta.setSelectionRange(start, end);
    const before = ta.value;
    let done = false;
    try {
      done = typeof document.execCommand === "function" &&
        document.execCommand("insertText", false, replacement);
    } catch {
      done = false;
    }
    if (!done || ta.value === before) {
      ta.setRangeText(replacement, start, end, "end");
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return true;
  }
  const editable = pw.root.closest<HTMLElement>("[contenteditable='true']") ??
    pw.root.querySelector<HTMLElement>("[contenteditable='true']");
  editable?.focus();
  const range = document.createRange();
  range.setStart(pw.node, start);
  range.setEnd(pw.node, end);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  return typeof document.execCommand === "function" &&
    document.execCommand("insertText", false, replacement);
}
