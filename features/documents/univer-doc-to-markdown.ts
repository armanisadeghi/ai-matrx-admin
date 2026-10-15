/**
 * univerDocToMarkdown — the reverse of `markdown-to-univer-doc.ts`.
 *
 * Why it exists: the canvas pane for a cloud document (`udt_document`) offers a
 * `Source` tab, and the rule in `features/canvas/core/canvasSource.ts` is that
 * Source shows THE ITEM'S OWN SOURCE — for a document, its markdown — never the
 * redux envelope. A document's content lives as an opaque Univer
 * `IDocumentData` snapshot in `workbench.udt_document_snapshots`, so something
 * has to read it back out. This is that something, and it is the ONLY one:
 * never re-implement a second snapshot reader.
 *
 * What it reads (the half `markdownToUniverDoc` writes):
 *   - `body.dataStream`  — the text; `\r` terminates a paragraph, a trailing
 *                          `\n` terminates the section.
 *   - `body.paragraphs`  — one entry per `\r` (`startIndex` = the `\r` offset).
 *   - `body.textRuns`    — `{ st, ed, ts }` style overlays. `ts.bl` + a heading
 *                          font size is how `markdownToUniverDoc` encodes
 *                          `#`..`######`, so the level is recovered from `fs`.
 *
 * Fidelity is deliberately MODEST and honest: headings, bold, italic,
 * strikethrough and inline/monospace code round-trip; everything else comes
 * back as the plain text the user actually sees. A document typed by hand in
 * Univer never had markdown syntax in the first place — printing its text is
 * the truthful answer, not a reconstruction.
 *
 * PURE — no React, no Redux, no IO.
 */

const TABLE_CELL_SEP = "   |   ";

// Univer's DataStreamTreeTokenType control characters (literals: no Univer runtime here).
const TABLE_START = "\x1A";
const TABLE_ROW_START = "\x1B";
const TABLE_CELL_START = "\x1C";
const TABLE_CELL_END = "\x1D";
const TABLE_ROW_END = "\x0E";
const TABLE_END = "\x0F";
const LINK_START = "\x1F";
const LINK_END = "\x1E";

interface CustomRangeLike {
  startIndex?: number;
  endIndex?: number;
  rangeType?: number;
  properties?: { url?: unknown };
}

/** The Univer-native shapes (real tables, hyperlink ranges) written back as markdown. */
function tableMarkdown(rows: string[][]): string[] {
  const width = Math.max(1, ...rows.map((r) => r.length));
  const cell = (r: string[], i: number) => (r[i] ?? "").replace(/^\*\*(.*)\*\*$/, "$1");
  const line = (r: string[], plain: boolean) =>
    `| ${Array.from({ length: width }, (_, i) => (plain ? cell(r, i) : (r[i] ?? ""))).join(" | ")} |`;
  const out = [line(rows[0], true), `|${" --- |".repeat(width)}`];
  for (const r of rows.slice(1)) out.push(line(r, false));
  return out;
}

interface TextRunLike {
  st?: number;
  ed?: number;
  ts?: {
    bl?: number;
    it?: number;
    ff?: string;
    fs?: number;
    st?: { s?: number } | number;
  };
}

/** Inverse of markdown-to-univer-doc's HEADING_FONT_SIZE. */
export const HEADING_LEVEL_BY_FONT_SIZE: Record<number, number> = {
  26: 1,
  22: 2,
  18: 3,
  16: 4,
  14: 5,
  13: 6,
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

const TRUE_ENOUGH = (v: unknown): boolean => v === 1 || v === true;

function isStruck(ts: TextRunLike["ts"]): boolean {
  if (!ts) return false;
  const st = ts.st;
  if (typeof st === "number") return TRUE_ENOUGH(st);
  return TRUE_ENOUGH(st?.s);
}

/** The style that applies to the whole paragraph, if the runs agree on one. */
function paragraphHeadingLevel(runs: TextRunLike[]): number | null {
  for (const run of runs) {
    const fs = run.ts?.fs;
    if (typeof fs === "number" && TRUE_ENOUGH(run.ts?.bl)) {
      const level = HEADING_LEVEL_BY_FONT_SIZE[fs];
      if (level) return level;
    }
  }
  return null;
}

function emphasize(text: string, ts: TextRunLike["ts"], inHeading: boolean): string {
  if (!text) return text;
  // Never double-mark: a heading's own runs are bold by construction.
  const leading = text.match(/^\s*/)?.[0] ?? "";
  const trailing = text.match(/\s*$/)?.[0] ?? "";
  let core = text.slice(leading.length, text.length - trailing.length);
  if (!core) return text;

  const mono = typeof ts?.ff === "string" && /mono/i.test(ts.ff);
  if (mono) core = `\`${core}\``;
  else {
    if (TRUE_ENOUGH(ts?.it)) core = `*${core}*`;
    if (TRUE_ENOUGH(ts?.bl) && !inHeading) core = `**${core}**`;
  }
  if (isStruck(ts)) core = `~~${core}~~`;
  return `${leading}${core}${trailing}`;
}

// An inline picture: one CUSTOM_BLOCK token in the stream, its drawing in `snapshot.drawings`.
const CUSTOM_BLOCK = "\b";

interface DrawingLike {
  source?: unknown;
  title?: unknown;
  description?: unknown;
  docTransform?: { size?: { width?: unknown; height?: unknown } };
}

/**
 * A picture's markdown source. Our own pictures are `matrx-file:<id>`; the
 * drawn size rides as a `#WxH` fragment so a round trip keeps the shape.
 */
export function imageMarkdownSource(drawing: DrawingLike): string | null {
  const source = typeof drawing.source === "string" ? drawing.source : "";
  if (!source || source.startsWith("data:")) return null;
  const w = Number(drawing.docTransform?.size?.width);
  const h = Number(drawing.docTransform?.size?.height);
  return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 && !source.includes("#")
    ? `${source}#${Math.round(w)}x${Math.round(h)}`
    : source;
}

/** Every picture in a snapshot, as its markdown source (`matrx-file:<id>#WxH` or a URL). */
export function documentImageSources(snapshot: unknown): string[] {
  const drawings = ((snapshot as { drawings?: unknown } | null)?.drawings ?? {}) as Record<string, DrawingLike>;
  const body = (snapshot as { body?: { customBlocks?: unknown } } | null)?.body;
  return asArray<{ blockId?: unknown }>(body?.customBlocks)
    .map((b) => (typeof b.blockId === "string" && drawings[b.blockId] ? imageMarkdownSource(drawings[b.blockId]) : null))
    .filter((s): s is string => !!s);
}

export interface DocToMarkdownOptions {
  /**
   * Where a picture's markdown points. Return null to leave it out (the caller
   * names what was left out). Default: the stored source.
   */
  imageUrl?: (source: string) => string | null;
}

/**
 * Read a Univer document snapshot back as markdown. Returns `""` for an empty
 * or unreadable snapshot so the caller can say "no source" honestly rather than
 * printing an envelope.
 */
export function univerDocToMarkdown(snapshot: unknown, options: DocToMarkdownOptions = {}): string {
  if (!snapshot || typeof snapshot !== "object") return "";
  const body = (snapshot as { body?: unknown }).body;
  if (!body || typeof body !== "object") return "";

  const dataStream = (body as { dataStream?: unknown }).dataStream;
  if (typeof dataStream !== "string" || !dataStream) return "";

  // Pictures: each CUSTOM_BLOCK token is read back as `![alt](source)`.
  const drawings = ((snapshot as { drawings?: unknown }).drawings ?? {}) as Record<string, DrawingLike>;
  const blocks = new Map<number, string>();
  for (const b of asArray<{ startIndex?: unknown; blockId?: unknown }>((body as { customBlocks?: unknown }).customBlocks)) {
    if (typeof b.startIndex !== "number" || typeof b.blockId !== "string") continue;
    const drawing = drawings[b.blockId];
    const source = drawing ? imageMarkdownSource(drawing) : null;
    if (!source || !drawing) continue;
    const url = options.imageUrl ? options.imageUrl(source) : source;
    if (!url) continue;
    const label = typeof drawing.title === "string" && drawing.title ? drawing.title
      : typeof drawing.description === "string" && drawing.description ? drawing.description : "image";
    blocks.set(b.startIndex, `![${label.replace(/[[\]]/g, "")}](${url})`);
  }

  const runs = asArray<TextRunLike>((body as { textRuns?: unknown }).textRuns)
    .filter((r) => typeof r.st === "number" && typeof r.ed === "number")
    .sort((a, b) => (a.st as number) - (b.st as number));

  const links = new Map<number, string>();
  for (const r of asArray<CustomRangeLike>((body as { customRanges?: unknown }).customRanges)) {
    if (r.rangeType === 0 && typeof r.endIndex === "number" && typeof r.properties?.url === "string") {
      links.set(r.endIndex, r.properties.url);
    }
  }
  // A slice of the stream with its hyperlink tokens read back as `[text](url)`.
  const readSlice = (from: number, to: number): string => {
    let out = "";
    for (let k = from; k < to; k++) {
      const c = dataStream[k];
      if (c === LINK_START) out += "[";
      else if (c === LINK_END) out += `](${links.get(k) ?? ""})`;
      else if (c === CUSTOM_BLOCK) out += blocks.get(k) ?? "";
      else out += c;
    }
    return out;
  };

  const lines: string[] = [];
  let cursor = 0;
  let runIndex = 0;
  let tableRows: string[][] | null = null;

  // Paragraph boundaries are the `\r`s in the stream itself — reading them from
  // the stream (rather than trusting `paragraphs`) keeps a snapshot written by
  // Univer's own editor, which may index differently, readable.
  for (let i = 0; i <= dataStream.length; i++) {
    const ch = dataStream[i];
    const atEnd = i === dataStream.length;
    if (!atEnd) {
      if (ch === TABLE_START) {
        tableRows = [];
        cursor = i + 1;
        continue;
      }
      if (tableRows && ch === TABLE_ROW_START) {
        tableRows.push([]);
        cursor = i + 1;
        continue;
      }
      if (tableRows && ch === TABLE_CELL_START) {
        tableRows[tableRows.length - 1]?.push("");
        cursor = i + 1;
        continue;
      }
      if (tableRows && (ch === TABLE_CELL_END || ch === TABLE_ROW_END)) {
        cursor = i + 1;
        continue;
      }
      if (tableRows && ch === TABLE_END) {
        if (tableRows.length) lines.push("", ...tableMarkdown(tableRows), "");
        tableRows = null;
        cursor = i + 1;
        continue;
      }
    }
    if (!atEnd && ch !== "\r" && ch !== "\n") continue;

    const start = cursor;
    const end = i;
    cursor = i + 1;
    if (end <= start) {
      if (ch === "\r" && !tableRows) lines.push("");
      if (atEnd) break;
      continue;
    }

    // Collect the runs overlapping this paragraph.
    const paragraphRuns: TextRunLike[] = [];
    let scan = runIndex;
    while (scan < runs.length && (runs[scan].st as number) < end) {
      if ((runs[scan].ed as number) > start) paragraphRuns.push(runs[scan]);
      scan++;
    }
    while (
      runIndex < runs.length &&
      (runs[runIndex].ed as number) <= end
    ) {
      runIndex++;
    }

    const heading = paragraphHeadingLevel(paragraphRuns);
    let text = "";
    let at = start;
    for (const run of paragraphRuns) {
      const rs = Math.max(run.st as number, start);
      const re = Math.min(run.ed as number, end);
      if (rs > at) text += readSlice(at, rs);
      if (re > rs) {
        text += emphasize(readSlice(rs, re), run.ts, heading != null);
      }
      at = Math.max(at, re);
    }
    if (at < end) text += readSlice(at, end);

    if (tableRows) {
      // A table cell: its paragraphs join into the one cell, pipes escaped.
      const row = tableRows[tableRows.length - 1];
      if (row?.length) {
        const part = text.trim().replace(/\|/g, "\\|");
        const last = row.length - 1;
        row[last] = row[last] ? `${row[last]} ${part}` : part;
      }
    } else {
      lines.push(heading ? `${"#".repeat(heading)} ${text.trim()}` : text);
    }
    if (atEnd) break;
  }

  // Univer keeps one paragraph per visual line; markdown wants a blank line
  // between blocks (but not inside a list or a table), and consecutive blank
  // paragraphs collapse. The writer (`markdownToUniverDoc`) flattens a list item
  // to a literal "• " / "1. " prefix and a table row to cells joined by
  // TABLE_CELL_SEP, so those shapes are read back as the markdown they came from.
  type Kind = "text" | "list" | "table";
  const kindOf = (line: string): Kind =>
    /^\s*(?:\u2022|[-*+]|\d+[.)])\s+/.test(line) ? "list" : line.includes(TABLE_CELL_SEP) ? "table" : "text";
  // A document typed or pasted as markdown keeps a table as literal `| a | b |` lines, one paragraph each, often
  // with an empty paragraph between rows: those rows are ONE table, so the gaps between them close.
  const rawRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
  const rows = lines.filter((l, i) => {
    if (l.trim()) return true;
    let a = i - 1;
    while (a >= 0 && !lines[a].trim()) a--;
    let z = i + 1;
    while (z < lines.length && !lines[z].trim()) z++;
    return !(a >= 0 && z < lines.length && rawRow(lines[a]) && rawRow(lines[z]));
  });
  const out: string[] = [];
  let prev: Kind | null = null;
  let tableRow = 0;
  for (const raw of rows) {
    if (!raw.trim()) {
      if (out.length && out[out.length - 1] !== "") out.push("");
      prev = null;
      continue;
    }
    let line = raw.replace(/\s+$/, "");
    if (rawRow(line)) {
      if (prev !== "table" && out.length && out[out.length - 1] !== "") out.push("");
      out.push(line.trim());
      prev = "table";
      continue;
    }
    const kind = kindOf(line);
    if (kind === "list") {
      line = line.replace(/^(\s*)\u2022\s+/, "$1- ").replace(/^(\s*)\*\s+/, "$1- ");
      // Four spaces per nesting level in the document; two read as nesting in markdown.
      line = line.replace(/^( +)/, (m) => " ".repeat(Math.floor(m.length / 2)));
    }
    if (kind === "table") {
      const cells = line.split(/\s*\|\s*/).map((c) => c.trim());
      const isHeader = prev !== "table";
      const shown = cells.map((c) => (isHeader ? c.replace(/^\*\*(.*)\*\*$/, "$1") : c));
      line = `| ${shown.join(" | ")} |`;
      if (isHeader) tableRow = shown.length;
      out.push(...(prev === "table" || prev === null || !out.length || out[out.length - 1] === "" ? [] : [""]));
      out.push(line);
      if (isHeader) out.push(`|${" --- |".repeat(tableRow)}`);
      prev = "table";
      continue;
    }
    const tight = kind === "list" && prev === "list";
    if (out.length && out[out.length - 1] !== "" && !tight) out.push("");
    out.push(line);
    prev = kind;
  }
  return out.join("\n").trim();
}
