/**
 * Mask known slurs and strong profanity in THIRD-PARTY text we display (a social bio, a search snippet), keeping the
 * first letter: "f*g". Display only — the raw data is stored and passed on unchanged.
 *
 * Why (2026-10-14): a stranger's X bio with a slur sat on a Smart Add top card while someone looked for themselves.
 * People's own content is never run through this; only text we pull from the web about other people.
 *
 * Small and deterministic on purpose: a list of stems matched on word starts (so suffixes and plurals are caught)
 * with the words that merely contain a stem ("Scunthorpe", "class", "cocktail") left alone by the word boundary.
 */

const STEMS = [
  // slurs
  "fag", "faggot", "fagg", "nigger", "nigga", "retard", "tranny", "kike", "spic", "chink", "gook", "wetback",
  "dyke", "coon", "beaner", "raghead", "towelhead",
  // strong profanity
  "fuck", "motherfuck", "shit", "bullshit", "cunt", "bitch", "asshole", "dick", "cock", "pussy", "whore", "slut",
  "bastard", "twat", "wank",
];

/** Suffixes a stem may carry and still be the same word ("fags", "fucking", "shitty", "retarded"). */
const SUFFIX = "(?:s|es|z|ed|er|ers|in|ing|ings|y|ies|head|heads|face|hole|holes)?";
// Each stem may double its last letter before a suffix ("shitty", "faggy").
const STEM_ALT = [...STEMS].sort((a, b) => b.length - a.length).map((s) => `${s}${s.at(-1)}?`).join("|");
const PATTERN = new RegExp(`\\b(?:${STEM_ALT})${SUFFIX}\\b`, "gi");

export function maskOffensive(text: string): string;
export function maskOffensive(text: string | null | undefined): string | null | undefined;
export function maskOffensive(text: string | null | undefined): string | null | undefined {
  if (!text) return text;
  return text.replace(PATTERN, (word) => word[0] + "*".repeat(word.length - 1));
}
