// components/selection-toolbar/text-range.ts
//
// A SELECTION IS WHAT IT HOLDS, NOT WHERE ITS EDGES LANDED (review 5, G4, 2026-10-21). A browser
// triple-click selects a paragraph AND runs the range's end on into whatever follows it: on a chat
// answer, after its menu had opened once, the end landed on the message footer's timestamp, past
// the answer. The selected words were all the answer's, but the range's common ancestor sat above
// the answer, so no selection zone held it and the passage could not be pinned: right-click
// Comment (and the toolbar) vanished while the menu still read "Copy selection".
//
// `textRangeOf` pulls each edge in to the first and last non-blank character the range holds, so
// every reader that asks "which zone is this selection in?" asks it of the words, not of the blank
// space around them. Null when the range holds no visible text.

function isTextNode(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}

/** The [from, to) slice of `node` that lies inside `range`. */
function slice(range: Range, node: Text): [number, number] {
  const from = node === range.startContainer ? range.startOffset : 0;
  const to = node === range.endContainer ? range.endOffset : node.data.length;
  return [from, to];
}

export function textRangeOf(range: Range): Range | null {
  if (range.collapsed) return null;
  const root = range.commonAncestorContainer;
  const texts: Text[] = [];
  if (isTextNode(root)) texts.push(root);
  else {
    const doc = root.ownerDocument ?? document;
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (isTextNode(n) && range.intersectsNode(n)) texts.push(n);
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
