/**
 * The "Recent" section of the Workbooks and Documents homes (PURE) — Google Docs / Sheets' home
 * model: one owner filter, one sort, time-bucketed groups. No React, no clock of its own (`now` is
 * passed in), so every rule here is testable.
 */

export type HomeOwnerFilter = "anyone" | "me" | "not-me";
/** Google's four orders. "Last modified by me" puts what I changed first, the rest after. */
export type HomeSortKey = "opened" | "modified-by-me" | "modified" | "title";

export const HOME_SORT_OPTIONS: ReadonlyArray<{ value: HomeSortKey; label: string }> = [
  { value: "opened", label: "Last opened by me" },
  { value: "modified-by-me", label: "Last modified by me" },
  { value: "modified", label: "Last modified" },
  { value: "title", label: "Title A–Z" },
];

/** What a recent card or row needs from a workbook or a document. */
export interface HomeItem<Row = unknown> {
  row: Row;
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
  sourceLabel: string;
}

export interface DatedItem<Row = unknown> {
  item: HomeItem<Row>;
  /** The moment the chosen sort speaks about, or null when it has none (title sort). */
  at: number | null;
  /** "Opened", "Modified", "You modified" — the word before the date on the card. */
  verb: string;
}

export interface HomeGroup<Row = unknown> {
  key: string;
  label: string | null;
  items: DatedItem<Row>[];
}

const DAY_MS = 86_400_000;

function ms(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

export function filterByOwner<Row>(
  items: readonly HomeItem<Row>[],
  owner: HomeOwnerFilter,
  userId: string | null,
): HomeItem<Row>[] {
  if (owner === "me") return items.filter((i) => i.ownerId === userId);
  if (owner === "not-me") return items.filter((i) => i.ownerId !== userId);
  return [...items];
}

/** The date a card shows and the order the list takes, for one sort. */
export function datedFor<Row>(
  item: HomeItem<Row>,
  sort: HomeSortKey,
  openedAt: ReadonlyMap<string, string>,
  userId: string | null,
): DatedItem<Row> {
  const updated = ms(item.updatedAt);
  switch (sort) {
    case "opened": {
      const opened = ms(openedAt.get(item.id));
      return opened !== null ? { item, at: opened, verb: "Opened" } : { item, at: updated, verb: "Modified" };
    }
    case "modified-by-me":
      return item.updatedBy !== null && item.updatedBy === userId
        ? { item, at: updated, verb: "You modified" }
        : { item, at: updated, verb: "Modified" };
    case "modified":
      return { item, at: updated, verb: "Modified" };
    default:
      return { item, at: updated, verb: "Modified" };
  }
}

export function sortHomeItems<Row>(
  items: readonly HomeItem<Row>[],
  sort: HomeSortKey,
  openedAt: ReadonlyMap<string, string>,
  userId: string | null,
): DatedItem<Row>[] {
  const dated = items.map((i) => datedFor(i, sort, openedAt, userId));
  const byName = (a: DatedItem<Row>, b: DatedItem<Row>) => a.item.name.localeCompare(b.item.name);
  if (sort === "title") return dated.sort(byName);
  // "Last opened by me": opened files first (newest open first), then the never-opened by modified.
  // "Last modified by me": my modifications first, then everyone else's.
  const tier = (d: DatedItem<Row>) =>
    sort === "opened" ? (d.verb === "Opened" ? 0 : 1) : sort === "modified-by-me" ? (d.verb === "You modified" ? 0 : 1) : 0;
  return dated.sort((a, b) => tier(a) - tier(b) || (b.at ?? 0) - (a.at ?? 0) || byName(a, b));
}

/** Google's buckets: Today, Previous 7 days, Previous 30 days, Earlier. */
export function bucketOf(at: number | null, now: number): { key: string; label: string } {
  if (at === null) return { key: "earlier", label: "Earlier" };
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const today = start.getTime();
  if (at >= today) return { key: "today", label: "Today" };
  if (at >= today - 7 * DAY_MS) return { key: "7", label: "Previous 7 days" };
  if (at >= today - 30 * DAY_MS) return { key: "30", label: "Previous 30 days" };
  return { key: "earlier", label: "Earlier" };
}

/**
 * Consecutive runs of one bucket become a group. The "tier" sorts put a second run after the
 * first (opened files, then never-opened ones), so a bucket label can repeat — the key keeps the
 * run index so React never sees two groups with one key.
 */
export function groupHomeItems<Row>(sorted: readonly DatedItem<Row>[], sort: HomeSortKey, now: number): HomeGroup<Row>[] {
  if (sort === "title") return sorted.length ? [{ key: "all", label: null, items: [...sorted] }] : [];
  const groups: HomeGroup<Row>[] = [];
  for (const d of sorted) {
    const b = bucketOf(d.at, now);
    const last = groups[groups.length - 1];
    if (last && last.label === b.label) last.items.push(d);
    else groups.push({ key: `${b.key}-${groups.length}`, label: b.label, items: [d] });
  }
  return groups;
}

/** Google's card date: a time today, "Oct 3" this year, "Oct 3, 2024" before. */
export function homeDateLabel(at: number | null, now: number): string {
  if (at === null) return "";
  const d = new Date(at);
  const n = new Date(now);
  if (d.toDateString() === n.toDateString()) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (d.getFullYear() === n.getFullYear()) return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function matchesHomeQuery(item: HomeItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return item.name.toLowerCase().includes(q) || (item.description?.toLowerCase().includes(q) ?? false);
}
