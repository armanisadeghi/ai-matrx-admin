// components/selection-toolbar/text-range.ts
//
// A SELECTION IS WHAT IT HOLDS, NOT WHERE ITS EDGES LANDED. A browser triple-click selects a
// paragraph AND runs the range's end on into whatever follows it:
//   - review 5 (G4): on a chat answer the end landed on the message footer's timestamp, past the
//     answer, so the range's common ancestor sat above the answer and no zone held it;
//   - review 6 (H1): the end ran into the NEXT XML section, and the last "non-blank" character was
//     the CSS of a `<style>` inside the content and the section's own header ("info · empty") —
//     text no person wrote, which maps to no saved text, so the passage could not be pinned.
// Either way right-click Comment (and the toolbar) vanished while the menu still read "Copy
// selection".
//
// `textRangeOf` therefore judges a range only by its MEANINGFUL text — `isContentText`, the
// annotation projection's one definition (never chrome, controls, hidden text, `<style>` or
// `<script>`) — and pulls each edge in to the first and last non-blank character of it. A range
// shaped like a triple-click run-on (its end selects nothing of its end container) is also clamped
// to the selection zone it started in, so it never reaches past that area's own content. Every
// reader that asks "which zone is this selection in?" asks it of the words. Null when the range
// holds no meaningful text.

import { zonesContaining } from "@ai-matrx/rich-content/selection-toolbar/selection-zones";
import { isContentText } from "@/features/rich-document/annotations/projection";

function isTextNode(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}

/** The [from, to) slice of `node` that lies inside `range`. */
function slice(range: Range, node: Text): [number, number] {
  const from = node === range.startContainer ? range.startOffset : 0;
  const to = node === range.endContainer ? range.endOffset : node.data.length;
  return [from, to];
}

/** A triple-click's shape: the end sits at the very start of its container, selecting none of it. */
function runsOnPastItsEnd(range: Range): boolean {
  return range.endOffset === 0 && range.endContainer !== range.startContainer;
}

export function textRangeOf(range: Range): Range | null {
  if (range.collapsed) return null;
  const root = range.commonAncestorContainer;
  let texts: Text[] = [];
  if (isTextNode(root)) {
    if (isContentText(root)) texts.push(root);
  } else {
    const doc = root.ownerDocument ?? document;
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (isTextNode(n) && range.intersectsNode(n) && isContentText(n)) texts.push(n);
    }
  }
  let start: { node: Text; offset: number } | null = null;
  for (const node of texts) {
    const [from, to] = slice(range, node);
    const at = node.data.slice(from, to).search(/\S/);
    if (at !== -1) {
      start = { node, offset: from + at };
      break;
    }
  }
  if (!start) return null;
  if (runsOnPastItsEnd(range)) {
    // Clamp to the area the selection started in (the innermost zone holding its first word).
    const area = zonesContaining(start.node)[0]?.element ?? null;
    if (area) texts = texts.filter((node) => area.contains(node));
  }
  let end: { node: Text; offset: number } | null = null;
  for (let i = texts.length - 1; i >= 0; i--) {
    const node = texts[i];
    const [from, to] = slice(range, node);
    const part = node.data.slice(from, to);
    const trimmed = part.replace(/\s+$/, "");
    if (trimmed.length > 0) {
      end = { node, offset: from + trimmed.length };
      break;
    }
  }
  if (!end) return null;
  const out = (root.ownerDocument ?? document).createRange();
  out.setStart(start.node, start.offset);
  out.setEnd(end.node, end.offset);
  return out;
}
