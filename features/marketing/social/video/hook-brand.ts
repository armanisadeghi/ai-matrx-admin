/**
 * The reference's on-screen hook may name another business. When the person leaves the hook line empty, that name
 * stays in the clone; this finds a name-like phrase so the page can warn plainly and prefill the field.
 *
 * Unsure means empty: a word that is only a contraction ("It's"), a half-matched word, or a hook that does not
 * come out readable is never offered as a prefill (the page then shows the warning and an empty field).
 */

import { cutText, oneLine } from "./text";

const COMMON_CAPS = new Set(["NEW", "FREE", "WOW", "THE", "AND", "YOU", "NOW", "SALE", "STOP", "WAIT", "WHY", "HOW", "WATCH", "THIS", "ONLY", "TRY", "BEST", "POV", "DIY", "FYI"]);

/** "It's", "That's", "Let's": a pronoun or question word plus 's is a contraction, never a business. */
const CONTRACTION_HEADS = new Set([
  "it", "that", "this", "there", "here", "what", "whats", "who", "where", "when", "how", "why", "let", "he", "she", "one", "everyone", "everything", "somebody",
  "someone", "nobody", "today", "tonight", "tomorrow", "yesterday", "everybody", "anyone", "nothing", "something",
]);

const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** The name-like phrase inside `text` (a handle, "Joe's PIZZA", a run of Capitalised words), or null. */
export function brandNameIn(text: string | null | undefined, ownBrand?: string): string | null {
  const t = oneLine(text);
  if (!t) return null;
  const handle = /(?:^|\s)@([A-Za-z0-9_.]{3,})/.exec(t);
  const possessive = [...t.matchAll(/\b([A-Z][a-zA-Z]+)['’]s\b(?:\s+[A-Z][A-Za-z]+\b)*/g)].find((m) => !CONTRACTION_HEADS.has(m[1]!.toLowerCase()));
  const words = t.split(" ");
  // Text written entirely in capitals ("OUR FIRST-EVER VINYL") carries no name signal in its case.
  const shouting = t === t.toUpperCase();
  const allCaps = shouting ? undefined : words.find((w) => {
    const letters = w.replace(/[^A-Za-z]/g, "");
    return letters.length >= 3 && letters === letters.toUpperCase() && !COMMON_CAPS.has(letters);
  });
  // A run of two or more Capitalised whole words that does not start the sentence ("Try Dragon Lair Knives today").
  const titleRun = /\s([A-Z][a-z]+(?:\s+[A-Z][a-z]+\b)+)(?![A-Za-z])/.exec(t);
  // One word with a capital inside it ("TeaCompany", "SunnySide"): a business written as one word.
  const camelWord = words.map((w) => w.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "")).find((w) => /^[A-Z][a-z]+[A-Z][A-Za-z]*$/.test(w));
  // Capitalised words just before it belong to the name ("Asheville TeaCompany").
  const camel = camelWord ? (new RegExp(`((?:[A-Z][a-z]+\\s+)*${camelWord})`).exec(t)?.[1] ?? camelWord) : undefined;
  const hit = handle ? `@${handle[1]}` : (possessive?.[0] ?? titleRun?.[1] ?? camel ?? allCaps ?? null);
  if (!hit) return null;
  const own = compact(ownBrand ?? "");
  const h = compact(hit);
  if (own && h && (h.includes(own) || own.includes(h))) return null;
  return hit;
}

export interface HookPrefill {
  /** The text for the field; empty when the swap is not certain. */
  text: string;
  /** The name that was swapped out, when `text` is a swap. */
  swapped: string | null;
}

/** The reference hook with the other business's name swapped for the person's brand, or empty when unsure. */
export function hookPrefill(source: string | null | undefined, ownBrand: string, max = 120): HookPrefill {
  const flat = oneLine(source);
  const name = brandNameIn(flat, ownBrand);
  if (!flat || !name || !ownBrand.trim()) return { text: "", swapped: null };
  const swapped = flat.split(name).join(ownBrand.trim());
  // A hook that runs past the field, is not a clean swap: leave it to the person.
  if (swapped.length > max || swapped === flat) return { text: "", swapped: null };
  return { text: cutText(swapped, max), swapped: name };
}
