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

/**
 * A project name from a post caption: no emoji or hashtags, whitespace collapsed, and a cut that lands on a word
 * boundary (never "Comment RECIPE and I'll send it to yo"). Empty when the caption has nothing readable.
 */
export function nameFromCaption(caption: string | null | undefined, max: number): string {
  const plain = oneLine(
    (caption ?? "")
      .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\u200d\ufe0f\u20e3]/gu, " ")
      .replace(/[#@]\S+/g, " "),
  );
  if (cutText(plain, max) === plain) return plain;
  const cut = cutText(plain, max);
  const atWord = cut.lastIndexOf(" ");
  return `${(atWord > max / 2 ? cut.slice(0, atWord) : cut).replace(/[\s,;:.\-–—]+$/, "")}…`;
}

const EMOJI = /[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3\ufe0f]/gu;
/** Characters that mark a break between two overlay lines without being whitespace (zero-width space, word joiner, line/paragraph separators). */
const HIDDEN_BREAKS = /[\u200b\u2060\ufeff\u2028\u2029\u0085]/g;

/**
 * Lines of on-screen text read as one sentence line: lines are joined with a space; when a line ends a sentence (the
 * next one starts a capital) and carries no end mark, a full stop is put there ("summer\nIt's so good" becomes
 * "summer. It's so good"). Emoji are dropped (they do not belong in a typed hook line).
 */
export function joinOverlayLines(text: string | null | undefined): string {
  const lines = (text ?? "")
    .replace(HIDDEN_BREAKS, "\n")
    .replace(EMOJI, " ")
    .replace(/\u200d/g, "")
    .split(/\r?\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  let out = "";
  lines.forEach((line, i) => {
    if (i === 0) {
      out = line;
      return;
    }
    const startsSentence = /^["'“‘(]?[A-Z]/.test(line);
    const ended = /[.!?,;:…)"”’]$/.test(out);
    out += ended || !startsSentence ? ` ${line}` : `. ${line}`;
  });
  return out.replace(/\s+([.!?,;:])/g, "$1");
}
