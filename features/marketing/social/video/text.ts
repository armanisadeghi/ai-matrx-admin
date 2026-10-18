/**
 * Text is cut by whole characters, never by UTF-16 units: a name, caption or hook cut in the middle of an emoji
 * leaves half a character the server cannot store (prod walk 1, defect 1). Every cut in the video studio goes here.
 */

const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

/** The first `max` characters (graphemes: an emoji with its skin tone or joiner stays whole) of `text`. */
export function cutText(text: string, max: number): string {
  if (max <= 0) return "";
  const pieces = segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text);
  return pieces.length <= max ? text : pieces.slice(0, max).join("");
}

/** True when `text` holds half of a character (a lone UTF-16 surrogate). */
export function hasBrokenCharacter(text: string): boolean {
  return /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(text);
}

/** Collapse every run of whitespace (line breaks included) to one space. */
export function oneLine(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}
