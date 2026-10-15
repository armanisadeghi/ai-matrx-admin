/**
 * A deck's slide size — Google Slides' File → Page setup. The saved deck carries
 * `slideSize: { preset, width, height }` in inches; every renderer (editor, rail, Present,
 * thumbnails, share view) and every export reads the SAME resolved size from here, so a 4:3 deck is
 * 4:3 everywhere. Pure (no React, no IO).
 */

export const SLIDE_SIZE_PRESETS = [
  { preset: "16:9", label: "Widescreen 16:9", width: 10, height: 5.625 },
  { preset: "16:10", label: "Widescreen 16:10", width: 10, height: 6.25 },
  { preset: "4:3", label: "Standard 4:3", width: 10, height: 7.5 },
] as const;

export type SlideSizePreset = (typeof SLIDE_SIZE_PRESETS)[number]["preset"] | "custom";

/** Inches, like Google's slide size dialog (PowerPoint caps a slide at 56 in). */
export interface SlideSize {
  preset: SlideSizePreset;
  width: number;
  height: number;
}

export const DEFAULT_SLIDE_SIZE: SlideSize = { preset: "16:9", width: 10, height: 5.625 };
export const SLIDE_SIZE_MIN_INCHES = 1;
export const SLIDE_SIZE_MAX_INCHES = 56;

/** The stage every slide is laid out on before it is scaled: always 540 tall, as wide as the ratio asks. */
export const SLIDE_STAGE_HEIGHT = 540;

const inRange = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= SLIDE_SIZE_MIN_INCHES && n <= SLIDE_SIZE_MAX_INCHES;

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Any stored value → a valid slide size. A missing or broken one is the default widescreen 16:9. */
export function normalizeSlideSize(raw: unknown): SlideSize {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const named = SLIDE_SIZE_PRESETS.find((p) => p.preset === r.preset);
  if (named) return { preset: named.preset, width: named.width, height: named.height };
  if (inRange(r.width) && inRange(r.height)) return { preset: "custom", width: round3(r.width), height: round3(r.height) };
  return { ...DEFAULT_SLIDE_SIZE };
}

/** The size of a deck (or any object carrying `slideSize`). */
export function slideSizeOf(deck: { slideSize?: unknown } | null | undefined): SlideSize {
  return normalizeSlideSize(deck?.slideSize);
}

/** The pixel stage for a size: 540 tall (so 16:9 stays the 960x540 it always was). */
export function slideStage(size: SlideSize): { width: number; height: number } {
  return { width: Math.round((SLIDE_STAGE_HEIGHT * size.width) / size.height), height: SLIDE_STAGE_HEIGHT };
}

/** CSS `aspect-ratio` value for a size, e.g. "10 / 7.5". */
export function slideAspect(size: SlideSize): string {
  return `${size.width} / ${size.height}`;
}

export function slideSizeLabel(size: SlideSize): string {
  const named = SLIDE_SIZE_PRESETS.find((p) => p.preset === size.preset);
  return named ? named.label : `Custom ${size.width} x ${size.height} in`;
}
