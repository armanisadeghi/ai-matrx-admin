/** The boards "Add to a board" offers — pure. */

/** How many boards show up front; the rest are one search away. */
export const RECENT_BOARDS = 8;

/** One entry per board name (the most recent wins), newest first, with the first `recent` split from the rest. */
export function boardChoices<T extends { id: string; title: string }>(boards: readonly T[], recent = RECENT_BOARDS): { recent: T[]; more: T[] } {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const b of boards) {
    const key = (b.title || "Untitled board").trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(b);
  }
  return { recent: unique.slice(0, recent), more: unique.slice(recent) };
}
