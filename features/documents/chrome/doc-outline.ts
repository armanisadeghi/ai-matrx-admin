/**
 * The document's outline: its headings, in order, each with the offset a click jumps to.
 *
 * Two kinds of heading exist in a saved document and both must show: Univer's own paragraph styles
 * (`outlineLevel` / `namedStyleType` HEADING_1..5 — what Format → Paragraph styles writes, and what
 * the table of contents reads) and the bold, sized runs `markdown-to-univer-doc` writes for imported
 * and agent-written text. Pure — no Univer import — so it is tested against plain snapshots.
 */

import { HEADING_LEVEL_BY_FONT_SIZE } from "@/features/documents/univer-doc-to-markdown";

export interface OutlineItem {
  /** 1 = top level. */
  level: number;
  text: string;
  /** Start of the heading's text in the body's data stream. */
  offset: number;
}

interface ParagraphLike {
  startIndex: number;
  paragraphStyle?: { outlineLevel?: number; namedStyleType?: number; headingId?: string };
}
interface TextRunLike {
  st?: number;
  ed?: number;
  ts?: { bl?: number; fs?: number };
}
interface BodyLike {
  dataStream?: string;
  paragraphs?: ParagraphLike[];
  textRuns?: TextRunLike[];
}

/** NamedStyleType.HEADING_1 in Univer's enum. */
const HEADING_1 = 4;
const HEADING_5 = 8;

function styleLevel(p: ParagraphLike): number | null {
  const o = p.paragraphStyle?.outlineLevel;
  if (typeof o === "number" && o >= 0 && o <= 8) return o + 1;
  const n = p.paragraphStyle?.namedStyleType;
  if (typeof n === "number" && n >= HEADING_1 && n <= HEADING_5) return n - HEADING_1 + 1;
  return null;
}

function runLevel(runs: TextRunLike[], start: number, end: number): number | null {
  for (const r of runs) {
    if (r.ed === undefined || r.st === undefined || r.ed <= start || r.st >= end) continue;
    const fs = r.ts?.fs;
    if (typeof fs === "number" && r.ts?.bl === 1) {
      const level = HEADING_LEVEL_BY_FONT_SIZE[fs];
      if (level) return level;
    }
  }
  return null;
}

export function collectOutline(snapshot: unknown): OutlineItem[] {
  const body = (snapshot as { body?: BodyLike } | null)?.body;
  const stream = body?.dataStream ?? "";
  const paragraphs = [...(body?.paragraphs ?? [])].sort((a, b) => a.startIndex - b.startIndex);
  const runs = body?.textRuns ?? [];
  const items: OutlineItem[] = [];
  let start = 0;
  for (const p of paragraphs) {
    const end = p.startIndex;
    const text = stream.slice(start, end).replace(/[\u0000-\u001f]/g, "").trim();
    const level = styleLevel(p) ?? runLevel(runs, start, end);
    if (text && level) items.push({ level, text, offset: start });
    start = end + 1;
  }
  return items;
}
