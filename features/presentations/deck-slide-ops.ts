/**
 * Slide-level deck operations on the existing layout model — skip, background, transitions,
 * slide-level text format, comments, find & replace, plain paste, links. PURE (no React, no IO):
 * `deck-model`'s reducer calls `applySlideOp`, so each change is a tested step. No free-placed
 * objects live here (the shapes/arrange engine is a separate, pending decision).
 */

import type { DeckSlide } from "./deck-model";

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  align?: "left" | "center" | "right" | "justify";
  /** Line spacing multiplier. */
  lineHeight?: number;
  /** 1 = the layout's own text size. */
  scale?: number;
}

export interface SlideBackground {
  color?: string;
  /** A platform file id or https URL. */
  image?: string;
}

export type TransitionKind = "none" | "fade" | "slide" | "zoom" | "flip";
export interface SlideTransition {
  kind: TransitionKind;
  ms: number;
}

export const TRANSITIONS: Array<{ key: TransitionKind; label: string }> = [
  { key: "none", label: "None" },
  { key: "fade", label: "Fade" },
  { key: "slide", label: "Slide from right" },
  { key: "zoom", label: "Zoom" },
  { key: "flip", label: "Flip" },
];
export function slideBackgroundOf(slide: DeckSlide | undefined): SlideBackground | null {
  const b = (slide as { background?: unknown } | undefined)?.background;
  return isRecord(b) ? (b as SlideBackground) : null;
}

export function slideTransitionOf(slide: DeckSlide | undefined): SlideTransition {
  const t = (slide as { transition?: unknown } | undefined)?.transition;
  if (!isRecord(t)) return { kind: "none", ms: 500 };
  const kind = TRANSITIONS.some((x) => x.key === t.kind) ? (t.kind as TransitionKind) : "none";
  return { kind, ms: typeof t.ms === "number" ? clamp(t.ms, 100, 5000) : 500 };
}

export function isSkipped(slide: DeckSlide | undefined): boolean {
  return Boolean((slide as { skipped?: unknown } | undefined)?.skipped);
}

/** Slide indexes the show plays (skipped slides left out). */
export function playableIndexes(slides: DeckSlide[]): number[] {
  return slides.map((s, i) => (isSkipped(s) ? -1 : i)).filter((i) => i >= 0);
}

export interface SlideComment {
  id: string;
  author: string;
  text: string;
  at: string;
  resolved?: boolean;
  objectId?: string;
}

export function commentsOf(slide: DeckSlide | undefined): SlideComment[] {
  const c = (slide as { comments?: unknown } | undefined)?.comments;
  return Array.isArray(c) ? (c.filter((x) => isRecord(x) && typeof x.id === "string") as SlideComment[]) : [];
}

// ── find & replace ──────────────────────────────────────────────────────────

/** One searchable text inside a slide: a layout path, a text-ish object, a table cell, or the notes. */
export type TextLocation =
  | { type: "path"; path: string }
  | { type: "notes" };

export interface TextHit {
  slideIndex: number;
  location: TextLocation;
  text: string;
}

const LAYOUT_PATHS = ["title", "subtitle", "description", "quote", "author"];

function pathValue(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const k of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function layoutTextPaths(slide: DeckSlide): string[] {
  const out = LAYOUT_PATHS.filter((p) => typeof pathValue(slide, p) === "string");
  (slide.bullets ?? []).forEach((_, i) => out.push(`bullets.${i}`));
  const extra = isRecord(slide.extra) ? slide.extra : {};
  if (typeof extra.eyebrow === "string") out.push("extra.eyebrow");
  if (Array.isArray(extra.stats)) {
    extra.stats.forEach((_, i) => {
      out.push(`extra.stats.${i}.value`, `extra.stats.${i}.label`);
    });
  }
  if (Array.isArray(extra.columns)) {
    extra.columns.forEach((c, ci) => {
      if (isRecord(c) && typeof c.title === "string") out.push(`extra.columns.${ci}.title`);
      if (isRecord(c) && Array.isArray(c.bullets)) c.bullets.forEach((_, bi) => out.push(`extra.columns.${ci}.bullets.${bi}`));
    });
  }
  return out.filter((p) => typeof pathValue(slide, p) === "string");
}

export function slideTexts(slide: DeckSlide, slideIndex: number): TextHit[] {
  const hits: TextHit[] = [];
  for (const path of layoutTextPaths(slide)) hits.push({ slideIndex, location: { type: "path", path }, text: String(pathValue(slide, path)) });
  if (typeof slide.notes === "string" && slide.notes) hits.push({ slideIndex, location: { type: "notes" }, text: slide.notes });
  return hits;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function countMatches(text: string, find: string, matchCase: boolean): number {
  if (!find) return 0;
  return (text.match(new RegExp(escapeRe(find), matchCase ? "g" : "gi")) ?? []).length;
}

/** Every occurrence of `find` in the deck: one hit per text that contains it. */
export function findInDeck(slides: DeckSlide[], find: string, matchCase: boolean): TextHit[] {
  if (!find) return [];
  const out: TextHit[] = [];
  slides.forEach((s, i) => {
    for (const h of slideTexts(s, i)) if (countMatches(h.text, find, matchCase) > 0) out.push(h);
  });
  return out;
}

export function replaceInText(text: string, find: string, replace: string, matchCase: boolean): string {
  if (!find) return text;
  return text.replace(new RegExp(escapeRe(find), matchCase ? "g" : "gi"), () => replace);
}

function cloneJson<T>(v: T): T {
  return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);
}

function setPathValue(slide: DeckSlide, path: string, value: string): DeckSlide {
  const next = cloneJson(slide) as Record<string, unknown>;
  const keys = path.split(".");
  let cur: Record<string, unknown> | unknown[] = next;
  for (let i = 0; i < keys.length - 1; i += 1) cur = (cur as Record<string, unknown>)[keys[i]!] as Record<string, unknown> | unknown[];
  (cur as Record<string, unknown>)[keys[keys.length - 1]!] = value;
  return next as DeckSlide;
}

function replaceAtLocation(slide: DeckSlide, loc: TextLocation, f: (text: string) => string): DeckSlide {
  if (loc.type === "notes") return { ...slide, notes: f(slide.notes ?? "") };
  if (loc.type === "path") {
    const cur = pathValue(slide, loc.path);
    return typeof cur === "string" ? setPathValue(slide, loc.path, f(cur)) : slide;
  }
  return slide;
}

/** Replace in every text of the deck (or one slide). Returns the slides and how many occurrences changed. */
export function replaceAllInSlides(slides: DeckSlide[], find: string, replace: string, matchCase: boolean, only?: number): { slides: DeckSlide[]; count: number } {
  if (!find) return { slides, count: 0 };
  let count = 0;
  const out = slides.map((s, i) => {
    if (only !== undefined && only !== i) return s;
    let next = s;
    for (const h of slideTexts(s, i)) {
      const n = countMatches(h.text, find, matchCase);
      if (n === 0) continue;
      count += n;
      next = replaceAtLocation(next, h.location, (t) => replaceInText(t, find, replace, matchCase));
    }
    return next;
  });
  return { slides: count === 0 ? slides : out, count };
}

export function slideTextStyleOf(slide: DeckSlide | undefined): TextStyle {
  const s = (slide as { textStyle?: unknown } | undefined)?.textStyle;
  return isRecord(s) ? (s as TextStyle) : {};
}

/** Plain-text paste: the clipboard's text/plain (or its html with markup dropped). */
export function plainTextOf(clipboard: { text?: string; html?: string }): string {
  const text = clipboard.text ?? "";
  if (text) return text.replace(/\r\n?/g, "\n");
  if (!clipboard.html) return "";
  return clipboard.html
    .replace(/<(br|\/p|\/div|\/li)\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export type SlideOp =
  | { type: "setSkipped"; index: number; skipped: boolean }
  | { type: "setBackground"; index: number; background: SlideBackground | null; allSlides?: boolean }
  | { type: "setTransition"; index: number; transition: SlideTransition | null; allSlides?: boolean }
  | { type: "setSlideTextStyle"; index: number; style: Partial<TextStyle> | null }
  | { type: "replaceOne"; index: number; location: TextLocation; find: string; replace: string; matchCase: boolean }
  | { type: "addComment"; index: number; comment: SlideComment }
  | { type: "resolveComment"; index: number; id: string; resolved: boolean }
  | { type: "deleteComment"; index: number; id: string }
  | { type: "replaceAll"; find: string; replace: string; matchCase: boolean; slideIndex?: number }
  | { type: "setSlideNumbers"; show: boolean }
  | { type: "appendSlides"; slides: DeckSlide[] };

/** Applies one slide-scoped op, returning the same slide when nothing changed. */
export function applySlideOp(slide: DeckSlide, action: SlideOp): DeckSlide {
  switch (action.type) {
    case "setSkipped": {
      if (isSkipped(slide) === action.skipped) return slide;
      const next = { ...slide } as Record<string, unknown>;
      if (action.skipped) next.skipped = true;
      else delete next.skipped;
      return next as DeckSlide;
    }
    case "setBackground": {
      const next = { ...slide } as Record<string, unknown>;
      if (action.background && (action.background.color || action.background.image)) next.background = action.background;
      else delete next.background;
      return next as DeckSlide;
    }
    case "setTransition": {
      const next = { ...slide } as Record<string, unknown>;
      if (action.transition && action.transition.kind !== "none") next.transition = action.transition;
      else delete next.transition;
      return next as DeckSlide;
    }
    case "setSlideTextStyle": {
      const next = { ...slide } as Record<string, unknown>;
      if (!action.style) {
        delete next.textStyle;
        return next as DeckSlide;
      }
      const merged: Record<string, unknown> = { ...(isRecord(next.textStyle) ? next.textStyle : {}) };
      for (const [k, v] of Object.entries(action.style)) {
        if (v === undefined) delete merged[k];
        else merged[k] = v;
      }
      if (Object.keys(merged).length === 0) delete next.textStyle;
      else next.textStyle = merged;
      return next as DeckSlide;
    }
    case "addComment":
      return { ...slide, comments: [...commentsOf(slide), action.comment] } as DeckSlide;
    case "resolveComment":
      return { ...slide, comments: commentsOf(slide).map((c) => (c.id === action.id ? { ...c, resolved: action.resolved } : c)) } as DeckSlide;
    case "deleteComment":
      return { ...slide, comments: commentsOf(slide).filter((c) => c.id !== action.id) } as DeckSlide;
    case "replaceOne":
      return replaceAtLocation(slide, action.location, (t) => replaceInText(t, action.find, action.replace, action.matchCase));
    default:
      return slide;
  }
}

/** Where a link goes: a web page, or another slide of this deck. */
export function normalizeLinkInput(input: string): string {
  const v = input.trim();
  if (!v) return "";
  if (/^\d+$/.test(v)) return `slide:${v}`;
  return /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
}

export { clamp as clampNumber };
