// features/portals/search.ts — CD-PAGE-12: A CLIENT SEARCHES HER OWN PORTAL.
//
// The search runs over the rows the page already holds (her rows, kept to her client by `isHers`) and over the
// fields the portal SHOWS her, never the document's other keys. A masked field arrives as a NULL key beside
// `_hidden`, but an unmasked field the owner simply did not put on the portal is still in the document, so
// searching "whatever the document has" would let her find a row by a value she is never shown. The shown keys
// are the only keys read here.

/** The words a person typed, folded for matching: trimmed, lower-case, accents kept as typed, at most 200 characters. */
export function portalSearchTerms(raw: unknown): string[] {
  const text = (typeof raw === "string" ? raw : Array.isArray(raw) ? String(raw[0] ?? "") : "").slice(0, 200);
  return text.toLowerCase().split(/\s+/).map((w) => w.trim()).filter(Boolean);
}

function words(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(words).filter(Boolean).join(" ");
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    // A link or a choice carries its words beside its id; the id is never something she typed.
    return words(o.label ?? o.name ?? o.title ?? o.display ?? null);
  }
  return "";
}

/** Whether one record matches every typed word in one of the shown fields. No words matches everything. */
export function portalRecordMatches(
  document: Record<string, unknown>,
  shownKeys: readonly string[],
  terms: readonly string[],
): boolean {
  if (terms.length === 0) return true;
  const haystack = shownKeys.map((key) => words(document[key])).join(" \u0000 ").toLowerCase();
  return terms.every((term) => haystack.includes(term));
}
