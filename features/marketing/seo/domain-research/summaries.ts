import { formatCount } from "@ai-matrx/kit/format";
// features/marketing/seo/domain-research/summaries.ts — the few numbers a panel shows at a glance, read
// from a finished answer's own fields (pure). The whole answer stays one press away in its kind.

export interface StatTile {
  label: string;
  value: number;
  /** How the number reads: a count, dollars or a percent. */
  unit: "count" | "usd" | "percent";
}

function num(output: unknown, field: string): number | null {
  if (output === null || typeof output !== "object") return null;
  const value = (output as Record<string, unknown>)[field];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function tiles(entries: [string, number | null, StatTile["unit"]][]): StatTile[] {
  return entries.flatMap(([label, value, unit]) => (value == null ? [] : [{ label, value, unit }]));
}

/** Links pointing at a site: how many, from how many websites, how many count for ranking. */
export function linkTiles(output: unknown): StatTile[] {
  const links = num(output, "backlinks");
  const followed = num(output, "dofollow_backlinks");
  const share = links != null && links > 0 && followed != null ? Math.round((followed / links) * 100) : null;
  return tiles([
    ["Backlinks", links, "count"],
    ["Linking websites", num(output, "referring_domains"), "count"],
    ["Followed links", share, "percent"],
    ["Broken links", num(output, "broken_backlinks"), "count"],
  ]);
}

/** Last month in Google: free visits and what they are worth, ads, and keywords ranking. */
export function searchTiles(output: unknown): StatTile[] {
  return tiles([
    ["Search visits a month", num(output, "organic_clicks"), "count"],
    ["Worth a month", num(output, "organic_value"), "usd"],
    ["Ad budget a month", num(output, "ad_budget"), "usd"],
    ["Keywords ranking", num(output, "organic_keywords"), "count"],
  ]);
}

export function formatTile(tile: StatTile): string {
  const n = tile.value;
  if (tile.unit === "percent") return `${Math.round(n)}%`;
  // Under 10,000 the exact grouped figure ("4,101"); from 10,000 the compact voice ("22K", "1.3M").
  const compact = formatCount(n >= 1e4 ? n : Math.round(n), n >= 1e4 ? { style: "compact" } : { locale: "en-US" });
  return tile.unit === "usd" ? `$${compact}` : compact;
}
