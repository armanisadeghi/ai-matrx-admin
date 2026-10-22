/**
 * blockSourceSpan — where a splitter block sits in the text it was split from, byte for byte.
 *
 * Materialization replaces ONLY a block's wrapper (its fence or tag) with the id-bearing
 * `<artifact>` tag. Every other byte of the answer — the block's own body, the prose, blank lines,
 * sections that do not materialize — must stay exactly as stored: saving never changes what a
 * person was shown (Arman: "our UI CANNOT LIE to the user about what is there"). Re-serializing
 * the split blocks back to markdown could not promise that, so the planner locates each block's
 * original bytes here and splices around them.
 *
 * The splitter keeps no offsets, so the span is found from what it does keep, searching forward
 * from the end of the previous span:
 *   - a tag block: `metadata.xmlSource` (or an `<artifact>`'s `metadata.rawXml`), the exact
 *     substring of the source from `<tag>` through `</tag>`;
 *   - a fence: an opener line (```lang / ~~~lang), the body, then a closer of the same fence;
 *   - a markerless block (GFM table, tree, bare JSON object): the body itself.
 * A block that is not found exactly, or is not closed, returns null and the caller leaves it as
 * written — a block is never saved from bytes it cannot place.
 */

export interface BlockSourceSpan {
  /** Offset of the wrapper's first byte (or the body's, for a markerless block). */
  start: number;
  /** Offset just past the wrapper's last byte. */
  end: number;
  /** The body exactly as written: the bytes between the opener line and the closer line. */
  body: string;
  /** The wrapper as written, for the record: e.g. "```chart" / "<cooking_recipe>". */
  opener: string;
  closer: string;
}

interface LocatableBlock {
  type: string;
  content?: string;
  language?: string;
  metadata?: Record<string, unknown>;
}

const CLOSE_TAG = /<\/[A-Za-z][\w:.-]*>$/;

/** The inner text of a whole `<tag …>…</tag>` source, without the one line break on each edge. */
function tagSpan(text: string, from: number, source: string): BlockSourceSpan | null {
  const trimmed = source.trimEnd();
  if (!trimmed.startsWith("<") || !CLOSE_TAG.test(trimmed)) return null;
  const at = text.indexOf(trimmed, from);
  if (at < 0) return null;
  const openEnd = trimmed.indexOf(">") + 1;
  const closeStart = trimmed.lastIndexOf("</");
  if (openEnd <= 0 || closeStart < openEnd) return null;
  let inner = trimmed.slice(openEnd, closeStart);
  if (inner.startsWith("\r\n")) inner = inner.slice(2);
  else if (inner.startsWith("\n")) inner = inner.slice(1);
  if (inner.endsWith("\r\n")) inner = inner.slice(0, -2);
  else if (inner.endsWith("\n")) inner = inner.slice(0, -1);
  return {
    start: at,
    end: at + trimmed.length,
    body: inner,
    opener: trimmed.slice(0, openEnd),
    closer: trimmed.slice(closeStart),
  };
}

const FENCE_OPENER = /^[ \t]{0,3}(`{3,}|~{3,})[^\n]*$/;

function lineEnd(text: string, at: number): number {
  const nl = text.indexOf("\n", at);
  return nl < 0 ? text.length : nl;
}

/** `body` between a fence opener line and its closer line, found at or after `from`. */
function fenceSpan(text: string, from: number, body: string): BlockSourceSpan | null {
  if (!body) return null;
  for (let at = text.indexOf(body, from); at >= 0; at = text.indexOf(body, at + 1)) {
    if (at === 0 || text[at - 1] !== "\n") continue;
    const openStart = text.lastIndexOf("\n", at - 2) + 1;
    if (openStart < from) continue;
    const opener = text.slice(openStart, at - 1).replace(/\r$/, "");
    const open = FENCE_OPENER.exec(opener);
    if (!open) continue;
    const after = at + body.length;
    const closeStart = text.startsWith("\r\n", after) ? after + 2 : text[after] === "\n" ? after + 1 : -1;
    if (closeStart < 0) continue;
    const closeEnd = lineEnd(text, closeStart);
    const closer = text.slice(closeStart, closeEnd).replace(/\r$/, "");
    const fenceChar = open[1]![0]!;
    const fenceLen = open[1]!.length;
    const close = new RegExp(`^[ \\t]{0,3}\\${fenceChar}{${fenceLen},}[ \\t]*$`).exec(closer);
    if (!close) continue;
    return { start: openStart, end: closeStart + closer.length, body, opener, closer };
  }
  return null;
}

/** A markerless block: its body is its whole source. */
function bareSpan(text: string, from: number, body: string): BlockSourceSpan | null {
  if (!body.trim()) return null;
  const at = text.indexOf(body, from);
  if (at < 0) return null;
  return { start: at, end: at + body.length, body, opener: "", closer: "" };
}

export function locateBlockSource(
  text: string,
  from: number,
  block: LocatableBlock,
): BlockSourceSpan | null {
  const meta = block.metadata ?? {};
  // A tag block names its own source; an unclosed tag (a reply cut off mid-block) is not a
  // finished block and is never saved as one.
  const tagSource =
    typeof meta.xmlSource === "string"
      ? meta.xmlSource
      : block.type === "artifact" && typeof meta.rawXml === "string"
        ? meta.rawXml
        : null;
  if (tagSource !== null) return tagSpan(text, from, tagSource);
  const body = block.content ?? "";
  return fenceSpan(text, from, body) ?? bareSpan(text, from, body);
}
