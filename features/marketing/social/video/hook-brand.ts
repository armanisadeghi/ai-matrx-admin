/**
 * The reference's on-screen hook may name another business. When the person leaves the hook line empty, that name
 * stays in the clone; this finds a name-like phrase so the page can warn plainly and prefill the field.
 */

const COMMON_CAPS = new Set(["NEW", "FREE", "WOW", "THE", "AND", "YOU", "NOW", "SALE", "STOP", "WAIT", "WHY", "HOW", "WATCH", "THIS", "ONLY", "TRY", "BEST", "POV", "DIY", "FYI"]);

/** The name-like phrase inside `text` (a handle, "Joe's PIZZA", a run of Capitalised words), or null. */
export function brandNameIn(text: string | null | undefined, ownBrand?: string): string | null {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  const handle = /(?:^|\s)@([A-Za-z0-9_.]{3,})/.exec(t);
  const possessive = /\b[A-Z][a-zA-Z]+'s(?:\s+[A-Z][A-Za-z]+)*/.exec(t);
  const words = t.split(" ");
  const allCaps = words.find((w) => {
    const letters = w.replace(/[^A-Za-z]/g, "");
    return letters.length >= 3 && letters === letters.toUpperCase() && !COMMON_CAPS.has(letters);
  });
  // A run of two or more Capitalised words that does not start the sentence ("Try Dragon Lair Knives today").
  const titleRun = /(?:\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/.exec(t);
  const hit = handle ? `@${handle[1]}` : (possessive?.[0] ?? titleRun?.[1] ?? allCaps ?? null);
  if (!hit) return null;
  const own = (ownBrand ?? "").trim().toLowerCase();
  if (own && (hit.toLowerCase().includes(own) || own.includes(hit.toLowerCase()))) return null;
  return hit;
}
