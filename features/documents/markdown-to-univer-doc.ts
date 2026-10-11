/**
 * markdown-to-univer-doc — convert a markdown string into a Univer
 * `IDocumentData` snapshot that the document editor (preset-docs-core) can
 * hydrate directly.
 *
 * Why this exists: the document system stores opaque Univer `IDocumentData`
 * (see `document-service.ts` + `components/DocumentEditor.tsx`). To send any
 * markdown surface (an assistant message, a note, a scraper result) into a
 * cloud document, we need markdown → IDocumentData. There was no converter, so
 * "Add to docs" was a stub. This is the missing primitive — reuse it for every
 * markdown → document export, never re-implement a one-off.
 *
 * The output is RENDERED content, not raw markdown text: `**bold**` becomes a
 * bold text run, `# Heading` becomes a larger bold paragraph, `- item` becomes
 * a bulleted line. The document never contains literal markdown syntax.
 *
 * Univer body model (the part we build):
 *   - `dataStream`  — the text. `\r` terminates a paragraph; a trailing `\n`
 *                     terminates the (single) section. Mirrors the empty doc
 *                     `"\r\n"` shape in DocumentEditor.defaultEmptyDocument().
 *   - `paragraphs`  — one entry per `\r`, `startIndex` = the `\r` offset.
 *   - `textRuns`    — `{ st, ed, ts }` style overlays on character ranges.
 *   - `sectionBreaks` — the trailing `\n`.
 *
 * Scope: headings, paragraphs, bold/italic/strikethrough/inline-code, links
 * (Univer hyperlink ranges keep the address), unordered/ordered lists, blockquotes, fenced code
 * blocks, horizontal rules, and GFM tables (real Univer tables). Nested
 * emphasis is supported. Anything exotic degrades to plain readable text rather
 * than leaking syntax.
 */

import { plainTitleFromMarkdown } from "@ai-matrx/rich-content/markdown-core/plain-title";
import {
  BooleanNumber,
  CustomRangeType,
  ObjectRelativeFromH,
  ObjectRelativeFromV,
  TableAlignmentType,
  TableRowHeightRule,
  TableSizeType,
  TableTextWrapType,
  createParagraphId,
  createSectionId,
} from "@univerjs/core";
import type {
  ICustomRange,
  IDocumentData,
  IParagraph,
  ISectionBreak,
  ITextRun,
  ITextStyle,
} from "@univerjs/core";
import { LocaleType } from "@univerjs/presets";

import {
  DEFAULT_DOCUMENT_PAGE_STYLE,
  defaultDocumentPageStyle,
} from "@/features/documents/document-page-style";
import {
  findTableEnd,
  rowCells,
  tableStartsAt,
  unescapeCellPipes,
} from "@ai-matrx/rich-content/display/markdown-classification/processors/utils/gfm-table-lines";
import { codeSpanText, fenceLineKinds, mapCodeRanges } from "@ai-matrx/content-ir/source";

// ─── inline parsing ──────────────────────────────────────────────────────────

interface InlineStyle {
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strike?: boolean;
  /** Link address — becomes a Univer hyperlink range, never just its text. */
  link?: string;
}

interface Segment extends InlineStyle {
  text: string;
}

// Order matters: `**`/`__` before `*`/`_` so bold wins over italic; code and
// links are matched atomically. Link target excludes whitespace to avoid
// swallowing trailing prose.
const INLINE_RE =
  /(\*\*|__)([\s\S]+?)\1|(\*|_)([\s\S]+?)\3|~~([\s\S]+?)~~|\[([^\]]+)\]\(([^)\s]+)\)/g;

const CODE_TOKEN = /\uE400(\d+)\uE401/g;

/**
 * Inline markdown → styled segments. Code spans come from THE one code-range
 * rule (@ai-matrx/content-ir/source) and are held behind placeholders, so the
 * emphasis pattern never reads inside code and code inside **bold** stays code.
 */
function parseInline(text: string, base: InlineStyle = {}): Segment[] {
  const codes: string[] = [];
  const held = text.includes("`")
    ? mapCodeRanges(text, (range, raw) => {
        if (range.kind !== "span") return raw;
        codes.push(codeSpanText(raw));
        return `\uE400${codes.length - 1}\uE401`;
      })
    : text;
  if (codes.length === 0) return parseStyled(held, base);
  return parseStyled(held, base).flatMap((seg) => {
    const out: Segment[] = [];
    let at = 0;
    for (const m of seg.text.matchAll(CODE_TOKEN)) {
      if ((m.index ?? 0) > at) out.push({ ...seg, text: seg.text.slice(at, m.index) });
      out.push({ ...seg, text: codes[Number(m[1])] ?? "", code: true });
      at = (m.index ?? 0) + m[0].length;
    }
    if (at < seg.text.length) out.push({ ...seg, text: seg.text.slice(at) });
    return out.filter((s) => s.text.length > 0);
  });
}

function parseStyled(text: string, base: InlineStyle = {}): Segment[] {
  const segs: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(INLINE_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ text: text.slice(last, m.index), ...base });
    if (m[1] !== undefined) {
      segs.push(...parseStyled(m[2], { ...base, bold: true }));
    } else if (m[3] !== undefined) {
      segs.push(...parseStyled(m[4], { ...base, italic: true }));
    } else if (m[5] !== undefined) {
      segs.push(...parseStyled(m[5], { ...base, strike: true }));
    } else if (m[6] !== undefined) {
      // Link → its text carries the address as a hyperlink range.
      segs.push(...parseStyled(m[6], { ...base, link: m[7] }));
    }
    last = re.lastIndex;
  }
  if (last < text.length) segs.push({ text: text.slice(last), ...base });
  return segs.filter((s) => s.text.length > 0);
}

// ─── style helpers ───────────────────────────────────────────────────────────

const HEADING_FONT_SIZE: Record<number, number> = {
  1: 26,
  2: 22,
  3: 18,
  4: 16,
  5: 14,
  6: 13,
};

interface ParagraphOpts {
  /** 1-6 → heading; undefined → body text. */
  heading?: number;
  /** Render the whole paragraph in a monospace font (code block lines). */
  mono?: boolean;
}

function buildTextStyle(
  seg: Segment,
  opts: ParagraphOpts,
): ITextStyle | undefined {
  const ts: ITextStyle = {};
  if (seg.bold || opts.heading) ts.bl = BooleanNumber.TRUE;
  if (seg.italic) ts.it = BooleanNumber.TRUE;
  if (seg.strike) ts.st = { s: BooleanNumber.TRUE };
  if (seg.code || opts.mono) ts.ff = "monospace";
  if (opts.heading) ts.fs = HEADING_FONT_SIZE[opts.heading] ?? 16;
  else if (seg.code || opts.mono) ts.fs = 12;
  return Object.keys(ts).length > 0 ? ts : undefined;
}

// ─── document builder ────────────────────────────────────────────────────────

class DocBuilder {
  private parts: string[] = [];
  private cursor = 0;
  private paragraphs: IParagraph[] = [];
  private paragraphIds = new Set<string>();
  private textRuns: ITextRun[] = [];
  private sectionBreaks: ISectionBreak[] = [];
  private sectionIds = new Set<string>();
  private customRanges: ICustomRange[] = [];
  private tables: NonNullable<NonNullable<IDocumentData["body"]>["tables"]> = [];
  private tableSource: NonNullable<IDocumentData["tableSource"]> = {};

  /** Segment text + styles + hyperlink ranges, no paragraph terminator. */
  private addInline(segments: Segment[], opts: ParagraphOpts): void {
    let openLink: string | undefined;
    let linkStart = 0;
    const closeLink = () => {
      if (openLink === undefined) return;
      this.parts.push(LINK_END);
      this.customRanges.push({
        startIndex: linkStart,
        endIndex: this.cursor,
        rangeId: `link-${this.customRanges.length}-${linkStart}`,
        rangeType: CustomRangeType.HYPERLINK,
        properties: { url: openLink },
      });
      this.cursor += 1;
      openLink = undefined;
    };
    for (const seg of segments) {
      if (!seg.text) continue;
      if (seg.link !== openLink) {
        closeLink();
        if (seg.link !== undefined) {
          openLink = seg.link;
          linkStart = this.cursor;
          this.parts.push(LINK_START);
          this.cursor += 1;
        }
      }
      const st = this.cursor;
      this.parts.push(seg.text);
      this.cursor += seg.text.length;
      const ts = buildTextStyle(seg, opts);
      if (ts) this.textRuns.push({ st, ed: this.cursor, ts });
    }
    closeLink();
  }

  addParagraph(segments: Segment[], opts: ParagraphOpts = {}): void {
    this.addInline(segments, opts);
    // Paragraph terminator.
    this.parts.push("\r");
    this.paragraphs.push({
      startIndex: this.cursor,
      paragraphId: createParagraphId(this.paragraphIds),
    });
    this.cursor += 1;
  }

  /**
   * A real Univer table (dataStream table tokens + `tables` + `tableSource`),
   * the same shape Insert > Table writes. `rows[r][c]` = that cell's segments.
   */
  addTable(rows: Segment[][][], headerBold: boolean): void {
    const colCount = Math.max(1, ...rows.map((r) => r.length));
    const pageWidth =
      (DEFAULT_DOCUMENT_PAGE_STYLE.pageSize?.width ?? 595) -
      (DEFAULT_DOCUMENT_PAGE_STYLE.marginLeft ?? 90) -
      (DEFAULT_DOCUMENT_PAGE_STYLE.marginRight ?? 90);
    const tableId = cryptoRandomId().replace(/-/g, "").slice(0, 6);
    const start = this.cursor;
    this.parts.push(TABLE_START);
    this.cursor += 1;
    rows.forEach((row, r) => {
      this.parts.push(TABLE_ROW_START);
      this.cursor += 1;
      for (let c = 0; c < colCount; c++) {
        this.parts.push(TABLE_CELL_START);
        this.cursor += 1;
        const cell = row[c] ?? [];
        const cellStart = this.cursor;
        this.addInline(cell, {});
        if (r === 0 && headerBold) this.boldRunsSince(cellStart);
        this.parts.push("\r");
        this.paragraphs.push({
          startIndex: this.cursor,
          paragraphId: createParagraphId(this.paragraphIds),
          paragraphStyle: {
            spaceAbove: { v: 3 },
            lineSpacing: 2,
            spaceBelow: { v: 0 },
          },
        });
        this.cursor += 1;
        this.parts.push("\n");
        this.sectionBreaks.push({
          startIndex: this.cursor,
          sectionId: createSectionId(this.sectionIds),
        });
        this.cursor += 1;
        this.parts.push(TABLE_CELL_END);
        this.cursor += 1;
      }
      this.parts.push(TABLE_ROW_END);
      this.cursor += 1;
    });
    this.parts.push(TABLE_END);
    this.cursor += 1;
    this.tables.push({ startIndex: start, endIndex: this.cursor, tableId });
    const margin = {
      start: { v: 10 },
      end: { v: 10 },
      top: { v: 5 },
      bottom: { v: 5 },
    };
    this.tableSource[tableId] = {
      tableRows: rows.map(() => ({
        tableCells: Array.from({ length: colCount }, () => ({ margin: { ...margin } })),
        trHeight: { val: { v: 30 }, hRule: TableRowHeightRule.AUTO },
      })),
      tableColumns: Array.from({ length: colCount }, () => ({
        size: { type: TableSizeType.SPECIFIED, width: { v: pageWidth / colCount } },
      })),
      tableId,
      align: TableAlignmentType.START,
      indent: { v: 0 },
      textWrap: TableTextWrapType.NONE,
      position: {
        positionH: { relativeFrom: ObjectRelativeFromH.PAGE, posOffset: 0 },
        positionV: { relativeFrom: ObjectRelativeFromV.PAGE, posOffset: 0 },
      },
      dist: { distB: 0, distL: 0, distR: 0, distT: 0 },
      cellMargin: { ...margin },
      size: { type: TableSizeType.UNSPECIFIED, width: { v: pageWidth } },
    } as NonNullable<IDocumentData["tableSource"]>[string];
    // A table is always followed by a paragraph (Univer's own insert adds one).
    this.addParagraph([]);
  }

  /** Header cells: bold every run written since `from` (plain runs get one). */
  private boldRunsSince(from: number): void {
    const end = this.cursor;
    if (end <= from) return;
    const covered = this.textRuns.filter((t) => t.st >= from);
    for (const t of covered) t.ts = { ...t.ts, bl: BooleanNumber.TRUE };
    let at = from;
    const gaps: ITextRun[] = [];
    for (const t of [...covered].sort((a, b) => a.st - b.st)) {
      if (t.st > at) gaps.push({ st: at, ed: t.st, ts: { bl: BooleanNumber.TRUE } });
      at = Math.max(at, t.ed);
    }
    if (at < end) gaps.push({ st: at, ed: end, ts: { bl: BooleanNumber.TRUE } });
    this.textRuns.push(...gaps);
  }

  isEmpty(): boolean {
    return this.paragraphs.length === 0;
  }

  build(title: string): Partial<IDocumentData> {
    if (this.isEmpty()) {
      // Univer requires at least one paragraph + section break.
      this.parts.push("\r");
      this.paragraphs.push({
        startIndex: this.cursor,
        paragraphId: createParagraphId(this.paragraphIds),
      });
      this.cursor += 1;
    }
    this.parts.push("\n");
    const sectionBreaks: ISectionBreak[] = [
      ...this.sectionBreaks,
      {
        startIndex: this.cursor,
        sectionId: createSectionId(this.sectionIds),
      },
    ];
    this.cursor += 1;

    return {
      id: cryptoRandomId(),
      locale: LocaleType.EN_US,
      title,
      body: {
        dataStream: this.parts.join(""),
        paragraphs: this.paragraphs,
        textRuns: this.textRuns.sort((a, b) => a.st - b.st),
        sectionBreaks,
        ...(this.customRanges.length ? { customRanges: this.customRanges } : {}),
        ...(this.tables.length ? { tables: this.tables } : {}),
      },
      ...(this.tables.length ? { tableSource: this.tableSource } : {}),
      documentStyle: defaultDocumentPageStyle(),
    };
  }
}

// Univer's DataStreamTreeTokenType control characters (literals: this module is
// also loaded where Univer's runtime is not).
const TABLE_START = "\x1A";
const TABLE_ROW_START = "\x1B";
const TABLE_CELL_START = "\x1C";
const TABLE_CELL_END = "\x1D";
const TABLE_ROW_END = "\x0E";
const TABLE_END = "\x0F";
const LINK_START = "\x1F";
const LINK_END = "\x1E";

// ─── block helpers ───────────────────────────────────────────────────────────

// THE GFM row rule (gfm-table-lines): an escaped `\|` stays in its cell and
// shows as `|` (the one cell-pipe rule), exactly as chat and Studio draw it.
const splitTableRow = (line: string): string[] => rowCells(line).map(unescapeCellPipes);

function addTable(builder: DocBuilder, tableLines: string[]): void {
  const header = splitTableRow(tableLines[0]);
  // tableLines[1] is the `---|---` separator — skip it.
  const body = tableLines
    .slice(2)
    .map(splitTableRow)
    .filter((r) => r.some((c) => c.length > 0));
  const toCells = (cells: string[]): Segment[][] => cells.map((cell) => parseInline(cell));
  builder.addTable([toCells(header), ...body.map(toCells)], true);
}

/**
 * Remove reasoning/thinking blocks so they never leak into the document.
 * Defensive — most callers pass already-flattened text, but a raw markdown
 * source could still carry `<think>` / `<thinking>` tags.
 */
function stripThinking(markdown: string): string {
  return markdown
    .replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, "")
    .trim();
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Convert markdown to a Univer `IDocumentData` snapshot. Pure — no I/O. Pass
 * the result straight to `saveDocumentSnapshot`.
 */
export function markdownToUniverDoc(
  markdown: string,
  title = "Untitled document",
): Partial<IDocumentData> {
  const builder = new DocBuilder();
  const cleaned = stripThinking(markdown ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const lines = cleaned.split("\n");
  // Fenced code by THE one code-range rule (@ai-matrx/content-ir/source).
  const kinds = fenceLineKinds(cleaned);

  let i = 0;
  let paragraphBuf: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuf.length === 0) return;
    const text = paragraphBuf.join(" ").trim();
    if (text) builder.addParagraph(parseInline(text));
    paragraphBuf = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line — paragraph boundary.
    if (!trimmed) {
      flushParagraph();
      i++;
      continue;
    }

    // Fenced code block.
    if (kinds[i] === "open") {
      flushParagraph();
      i++;
      const code: string[] = [];
      while (i < lines.length && kinds[i] === "body") {
        code.push(lines[i]);
        i++;
      }
      if (kinds[i] === "close") i++; // consume the closing fence
      for (const c of code) {
        builder.addParagraph([{ text: c.length ? c : " ", code: true }], {
          mono: true,
        });
      }
      continue;
    }

    // ATX heading.
    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      builder.addParagraph(parseInline(heading[2].trim()), {
        heading: heading[1].length,
      });
      i++;
      continue;
    }

    // Horizontal rule.
    if (/^(\s*[-*_]\s*){3,}$/.test(trimmed) && /^[\s\-*_]+$/.test(trimmed)) {
      flushParagraph();
      builder.addParagraph([{ text: "\u2014".repeat(24) }]);
      i++;
      continue;
    }

    // GFM table (THE rule, gfm-table-lines): a header — with or without edge
    // pipes — immediately followed by its delimiter row.
    if (tableStartsAt(lines, i)) {
      flushParagraph();
      const tableLines: string[] = [];
      const tableEnd = findTableEnd(lines, i);
      while (i < tableEnd) {
        tableLines.push(lines[i].trim());
        i++;
      }
      addTable(builder, tableLines);
      continue;
    }

    // Blockquote.
    const quote = trimmed.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      builder.addParagraph(parseInline(quote[1]), {});
      i++;
      continue;
    }

    // List item (ordered or unordered, with nesting by indent).
    const list = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (list) {
      flushParagraph();
      const indent = list[1].replace(/\t/g, "  ").length;
      const level = Math.min(Math.floor(indent / 2), 5);
      const ordered = /\d/.test(list[2]);
      const marker = ordered ? `${list[2].replace(/[.)]$/, "")}.` : "\u2022";
      const prefix = `${"    ".repeat(level)}${marker} `;
      builder.addParagraph([{ text: prefix }, ...parseInline(list[3])]);
      i++;
      continue;
    }

    // Default — accumulate into the current paragraph.
    paragraphBuf.push(trimmed);
    i++;
  }

  flushParagraph();
  return builder.build(title);
}

/**
 * Derive a sensible document name from markdown: first heading, else first
 * non-empty line, trimmed of markdown syntax. Falls back to a dated default.
 */
export function deriveDocumentName(markdown: string): string {
  const cleaned = stripThinking(markdown ?? "");
  // First heading, else the first line — through the ONE plain-text title
  // projection (components/markdown-core/plain-title.ts).
  const lines = cleaned.split("\n");
  const heading = lines.find((l) => /^\s{0,3}#{1,6}\s+/.test(l));
  const plain = plainTitleFromMarkdown(heading ?? cleaned);
  if (!plain) {
    return `Document ${new Date().toLocaleDateString()}`;
  }
  return plainTitleFromMarkdown(plain, { maxLength: 80 });
}
