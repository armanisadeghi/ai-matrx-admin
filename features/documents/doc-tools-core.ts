/**
 * The pure half of the Docs tools: building blocks, bookmarks, paragraph borders, the ruler's
 * geometry and the document language. No Univer import, so each is proven on plain snapshots.
 */

import { PX_PER_INCH } from "@/features/documents/document-page-style";
import { markdownToUniverDoc } from "@/features/documents/markdown-to-univer-doc";

export interface BuildingBlock {
  id: string;
  label: string;
  description: string;
  markdown: string;
}

export const BUILDING_BLOCKS: BuildingBlock[] = [
  { id: "meeting-notes", label: "Meeting notes", description: "Date, attendees, agenda, decisions and action items.", markdown: "## Meeting notes\n\nDate: \nAttendees: \n\n### Agenda\n\n1. \n\n### Discussion\n\n### Decisions\n\n### Action items\n\n☐ Owner: Task, due date\n" },
  { id: "project-tracker", label: "Project tracker", description: "Goal, milestones, owners, risks and status.", markdown: "## Project tracker\n\nGoal: \nOwner: \nStatus: On track\n\n### Milestones\n\n☐ Milestone, owner, due date\n\n### Risks\n\n### Next steps\n" },
  { id: "email-draft", label: "Email draft", description: "To, subject and a three-part message ready to fill in.", markdown: "## Email draft\n\nTo: \nSubject: \n\nHi ,\n\nI am writing about .\n\nThe next step is .\n\nThanks,\n" },
  { id: "weekly-status", label: "Weekly status", description: "Done, next, and blocked, for one week.", markdown: "## Weekly status\n\nWeek of: \n\n### Done this week\n\n### Next week\n\n### Blocked\n" },
  { id: "decision-log", label: "Decision record", description: "Context, options, decision and consequences.", markdown: "## Decision record\n\nDate: \nDecider: \n\n### Context\n\n### Options considered\n\n### Decision\n\n### Consequences\n" },
  { id: "pros-cons", label: "Pros and cons", description: "A side-by-side weighing of one choice.", markdown: "## Pros and cons\n\nChoice: \n\n### Pros\n\n### Cons\n\n### Verdict\n" },
];

export interface InsertableBody {
  dataStream: string;
  paragraphs: Array<{ startIndex: number; paragraphStyle?: Record<string, unknown> }>;
  textRuns?: Array<{ st: number; ed: number; ts?: Record<string, unknown> }>;
}

/** Markdown to a body Univer can insert at the caret: the document-closing `\n` is dropped. */
export function insertableBody(markdown: string): InsertableBody {
  const body = (markdownToUniverDoc(markdown).body ?? { dataStream: "" }) as Partial<InsertableBody> & { dataStream: string };
  let stream = body.dataStream;
  if (stream.endsWith("\n")) stream = stream.slice(0, -1);
  const paragraphs = (body.paragraphs ?? []).filter((p) => p.startIndex < stream.length);
  const textRuns = (body.textRuns ?? []).filter((r) => r.st < stream.length).map((r) => ({ ...r, ed: Math.min(r.ed, stream.length) }));
  return { dataStream: stream, paragraphs, ...(textRuns.length ? { textRuns } : {}) };
}

/** Univer's CustomRangeType.BOOKMARK. */
export const BOOKMARK_RANGE_TYPE = 3;
/** A bookmark is an invisible anchor: one zero-width character the custom range wraps. */
export const BOOKMARK_ANCHOR = "​";

export interface Bookmark {
  id: string;
  name: string;
  offset: number;
}

interface BodyWithRanges {
  customRanges?: Array<{ rangeId: string; rangeType: number; startIndex: number; properties?: { name?: unknown } }>;
}

export function collectBookmarks(snapshot: unknown): Bookmark[] {
  const body = (snapshot as { body?: BodyWithRanges } | null)?.body;
  const out: Bookmark[] = [];
  for (const r of body?.customRanges ?? []) {
    if (r.rangeType !== BOOKMARK_RANGE_TYPE) continue;
    out.push({ id: r.rangeId, name: typeof r.properties?.name === "string" ? r.properties.name : "", offset: r.startIndex });
  }
  return out.sort((a, b) => a.offset - b.offset);
}

export function bookmarkBody(id: string, name: string) {
  return {
    dataStream: BOOKMARK_ANCHOR,
    customRanges: [{ startIndex: 0, endIndex: 0, rangeId: id, rangeType: BOOKMARK_RANGE_TYPE, properties: { name }, wholeEntity: true }],
  };
}

export function cleanBookmarkName(raw: string, existing: readonly Bookmark[]): { ok: true; name: string } | { ok: false; why: string } {
  const name = raw.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!name) return { ok: false, why: "Give the bookmark a name." };
  if (existing.some((b) => b.name.toLowerCase() === name.toLowerCase())) return { ok: false, why: `A bookmark named "${name}" already exists.` };
  return { ok: true, name };
}

/** `#bookmark=<name>` in the page address names a bookmark to jump to on open. */
export function bookmarkFromHash(hash: string): string | null {
  const m = /^#bookmark=(.+)$/.exec(hash);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]!);
  } catch {
    return null;
  }
}
export const bookmarkHash = (name: string) => `#bookmark=${encodeURIComponent(name)}`;

export type BorderSide = "top" | "bottom" | "both" | "none";
export type BorderDash = "solid" | "dashed" | "dotted";
/** Univer's DashStyleType values. */
const DASH: Record<BorderDash, number> = { solid: 1, dotted: 2, dashed: 3 };

export interface BorderChoice {
  side: BorderSide;
  color: string;
  width: number;
  dash: BorderDash;
  padding: number;
}

/** The `paragraph` argument of `doc-paragraph-setting.command` for a choice (Univer draws top and bottom paragraph borders). */
export function paragraphBorderParams(c: BorderChoice): Record<string, unknown> {
  const line = { color: { rgb: c.color }, width: c.width, dashStyle: DASH[c.dash], padding: c.padding };
  return {
    borderTop: c.side === "top" || c.side === "both" ? line : null,
    borderBottom: c.side === "bottom" || c.side === "both" ? line : null,
  };
}

export interface RulerGeometry {
  pageLeft: number;
  pageWidth: number;
  marginLeft: number;
  marginRight: number;
  ticks: Array<{ x: number; kind: "inch" | "half" | "eighth"; label?: string }>;
}

/** The ruler above the page: inch ticks from the page's left edge (margins shaded), at the current zoom. */
export function rulerGeometry(a: { containerWidth: number; zoom: number; pageWidthPx: number; marginLeftPx: number; marginRightPx: number }): RulerGeometry {
  const pageWidth = a.pageWidthPx * a.zoom;
  const pageLeft = Math.max(0, (a.containerWidth - pageWidth) / 2);
  const ticks: RulerGeometry["ticks"] = [];
  const inches = a.pageWidthPx / PX_PER_INCH;
  for (let eighth = 0; eighth <= Math.floor(inches * 8); eighth++) {
    const x = pageLeft + (eighth * PX_PER_INCH * a.zoom) / 8;
    if (eighth % 8 === 0) {
      const marginInches = a.marginLeftPx / PX_PER_INCH;
      ticks.push({ x, kind: "inch", ...(eighth / 8 !== marginInches ? { label: String(Math.round(Math.abs(eighth / 8 - marginInches))) } : {}) });
    } else ticks.push({ x, kind: eighth % 4 === 0 ? "half" : "eighth" });
  }
  return { pageLeft, pageWidth, marginLeft: a.marginLeftPx * a.zoom, marginRight: a.marginRightPx * a.zoom, ticks };
}

/** The key on the document style that carries the language (the slot the paper colour also uses). */
export const DOCUMENT_LANGUAGE_KEY = "matrxLanguage";
export const DOCUMENT_LANGUAGES: Array<{ code: string; label: string }> = [
  { code: "en-US", label: "English (United States)" },
  { code: "en-GB", label: "English (United Kingdom)" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
  { code: "nl", label: "Dutch" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "ru", label: "Russian" },
];

export function readDocumentLanguage(documentStyle: unknown): string {
  const v = (documentStyle as Record<string, unknown> | undefined)?.[DOCUMENT_LANGUAGE_KEY];
  return typeof v === "string" && DOCUMENT_LANGUAGES.some((l) => l.code === v) ? v : "en-US";
}
