/**
 * Pure word detection + replacement for the notes spelling menu. No DOM, no
 * dictionary: "which word is at this offset, and is it one we should check".
 */

export interface WordSpan {
  start: number;
  end: number;
  word: string;
}

// A run of letters, digits, underscores and apostrophes. Digits/underscores are
// kept IN the run so "abc123" is one token we then skip, not "abc" to check.
const TOKEN_CHAR = /[\p{L}\p{N}_'’]/u;

function isTokenChar(ch: string | undefined): boolean {
  return ch !== undefined && TOKEN_CHAR.test(ch);
}

/** Trim leading/trailing apostrophes ("'tis'" -> "tis"), keeping offsets right. */
function trimApostrophes(text: string, start: number, end: number): WordSpan | null {
  while (start < end && (text[start] === "'" || text[start] === "’")) start++;
  while (end > start && (text[end - 1] === "'" || text[end - 1] === "’")) end--;
  if (end <= start) return null;
  return { start, end, word: text.slice(start, end) };
}

/** The token touching `offset` (caret before, inside or right after it). */
export function tokenAt(text: string, offset: number): WordSpan | null {
  if (offset < 0 || offset > text.length) return null;
  let start = offset;
  let end = offset;
  while (start > 0 && isTokenChar(text[start - 1])) start--;
  while (end < text.length && isTokenChar(text[end])) end++;
  if (end === start) return null;
  return trimApostrophes(text, start, end);
}

/** True when `offset` sits inside a fenced block or an inline code span. */
export function isInsideMarkdownCode(text: string, offset: number): boolean {
  const before = text.slice(0, offset);
  const fences = before.match(/^[ \t]*(```|~~~)/gm);
  if (fences && fences.length % 2 === 1) return true;
  const lineStart = before.lastIndexOf("\n") + 1;
  const lineBefore = before.slice(lineStart);
  const ticks = lineBefore.match(/`/g);
  return !!ticks && ticks.length % 2 === 1;
}

/** The whitespace-delimited chunk around the word, used for URL / email checks. */
function chunkAround(text: string, start: number, end: number): string {
  let s = start;
  let e = end;
  while (s > 0 && !/\s/.test(text[s - 1]!)) s--;
  while (e < text.length && !/\s/.test(text[e]!)) e++;
  return text.slice(s, e);
}

const URL_LIKE = /(?:^|[(<\["'])(?:https?:\/\/|www\.|ftp:\/\/|mailto:)|:\/\/|\w\.[a-z]{2,}\/|\S@\S+\.\S/i;

/** Should this span be handed to the speller? */
export function isSpellCheckable(text: string, span: WordSpan): boolean {
  const { start, end, word } = span;
  if (word.length < 2) return false;
  if (/[\p{N}_]/u.test(word)) return false; // digits / snake_case
  if (word === word.toUpperCase() && word !== word.toLowerCase()) return false; // ALL-CAPS
  if (text[start - 1] === "@") return false; // @mention
  if (URL_LIKE.test(chunkAround(text, start, end))) return false;
  if (isInsideMarkdownCode(text, start)) return false;
  return true;
}

/** The checkable word under `offset`, or null. */
export function checkableWordAt(text: string, offset: number): WordSpan | null {
  const span = tokenAt(text, offset);
  if (!span) return null;
  return isSpellCheckable(text, span) ? span : null;
}

/** `text` with exactly [start, end) replaced. Nothing else changes. */
export function applyReplacement(
  text: string,
  start: number,
  end: number,
  replacement: string,
): string {
  return text.slice(0, start) + replacement + text.slice(end);
}

/** Match the typed word's capitalization on a suggestion ("Teh" -> "The"). */
export function matchCase(original: string, suggestion: string): string {
  if (original.length > 1 && original === original.toUpperCase()) return suggestion.toUpperCase();
  const first = original[0];
  if (first && first === first.toUpperCase() && first !== first.toLowerCase()) {
    return suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
  }
  return suggestion;
}
