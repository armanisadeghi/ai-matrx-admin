/**
 * File → Import slides: a PowerPoint read by the server's Office codec (one markdown portion per
 * slide) becomes deck slides. PURE: `portionsToSlides` maps; the dialog does the upload and read.
 */

import { SLIDE_KIND, newSlideId, type DeckSlide } from "./deck-model";

export interface ImportPortion {
  title?: string | null;
  markdown?: string | null;
}

const BULLET = /^\s*(?:[-*+•]|\d+[.)])\s+/;

function clean(line: string): string {
  return line.replace(/^#{1,6}\s*/, "").replace(BULLET, "").trim();
}

/** One extracted slide → a deck slide: first line the title, the rest bullets (a lone line is a subtitle). */
export function portionToSlide(p: ImportPortion, isFirst: boolean): DeckSlide {
  const lines = (p.markdown ?? "")
    .split("\n")
    .map(clean)
    .filter((l) => l.length > 0);
  const title = (p.title ?? "").trim() || lines.shift() || "";
  const body = lines.filter((l) => l !== title);
  const base = { __kind: SLIDE_KIND, id: newSlideId() } as const;
  if (body.length === 0) return { ...base, layout: isFirst ? "title" : "section", title } as DeckSlide;
  if (isFirst && body.length === 1) return { ...base, layout: "title", title, subtitle: body[0] } as DeckSlide;
  return { ...base, layout: "bullets", title, bullets: body } as DeckSlide;
}

export function portionsToSlides(portions: ImportPortion[]): DeckSlide[] {
  return portions.map((p, i) => portionToSlide(p, i === 0));
}
