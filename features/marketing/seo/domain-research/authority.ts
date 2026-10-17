// features/marketing/seo/domain-research/authority.ts — the "Authority" row: one score per source,
// side by side (pure). Three different Tools answer three different scores on the same 0-100 scale
// (each on its own source's scale, never averaged); a source is named only when it is a known industry
// leader (R-1), and the aggregators' score reads "Matrx" — the unpinned `seo_authority_score` call is served
// only by our own sources. Nothing here reaches a vendor: it reads the finished call records.

import { isCallRunning, type ToolCallView } from "@ai-matrx/agents/tools";

export type AuthorityKey = "authority" | "matrx" | "searchAds";

export type TileStatus = "idle" | "running" | "ready" | "empty" | "failed";

export interface AuthorityTile {
  key: AuthorityKey;
  /** What the score is called: "Domain Authority". */
  label: string;
  /** Who produced it, shown beside the other values: "Moz", "SpyFu", or "Matrx". */
  source: string;
  score: number | null;
  status: TileStatus;
  /** Plain words when the tile has no number: why. */
  note: string | null;
  /** What this one answer cost, in points; null before it ran. */
  points: number | null;
  /** True when the answer was saved earlier (own repeat). */
  saved: boolean;
}

const FIELD: Record<AuthorityKey, { field: string; label: string; leader: string | null }> = {
  authority: { field: "domain_authority", label: "Domain Authority", leader: "Moz" },
  matrx: { field: "score", label: "Authority score", leader: null },
  searchAds: { field: "site_strength", label: "Site strength", leader: "SpyFu" },
};

export function bandOf(score: number | null): string {
  if (score == null) return "";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Strong";
  if (score >= 40) return "Good";
  if (score >= 20) return "Fair";
  return "Low";
}

function scoreFrom(output: unknown, field: string): number | null {
  if (output === null || typeof output !== "object") return null;
  const value = (output as Record<string, unknown>)[field];
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
}

/** The source label: a known leader keeps its name, anything else (and any "Matrx") reads "Matrx". */
function sourceOf(key: AuthorityKey, view: ToolCallView | null): string {
  const leader = FIELD[key].leader;
  if (leader) return leader;
  const shown = view?.display_source;
  return shown && shown !== "Matrx" ? shown : "Matrx";
}

export function authorityTile(
  key: AuthorityKey,
  view: ToolCallView | null,
  clientError: string | null,
  field: string = FIELD[key].field,
): AuthorityTile {
  const { label } = FIELD[key];
  const base = { key, label, source: sourceOf(key, view), score: null, note: null, points: null, saved: false };
  if (!view) {
    return clientError ? { ...base, status: "failed", note: clientError } : { ...base, status: "idle" };
  }
  const points = view.points_charged;
  if (isCallRunning(view.status)) return { ...base, status: "running", points: null };
  if (view.status === "needs_approval") return { ...base, status: "running", note: "Waiting for your OK" };
  if (view.status === "succeeded") {
    const score = scoreFrom(view.output, field);
    if (score == null) return { ...base, status: "empty", note: "No score for this website", points, saved: view.cache !== "none" };
    return { ...base, status: "ready", score, points, saved: view.cache !== "none" };
  }
  if (view.status === "empty") return { ...base, status: "empty", note: "No score for this website", points };
  return { ...base, status: "failed", note: view.error?.message ?? "That didn't work", points };
}

/**
 * Which call is the "Matrx" tile. Once the server announces `compare_sources` on the authority-score Tool,
 * its unpinned call is served only by our own sources and is the tile. Before that, an unpinned call can be
 * answered by Moz itself (the same value twice, two charges), so the tile is the link strength the Backlinks
 * panel already bought — never a second Moz.
 */
export type MatrxTileFrom = "authority_score" | "backlinks_rank";

export function authorityTiles(
  views: Record<AuthorityKey, ToolCallView | null> & { links?: ToolCallView | null },
  errors: Record<AuthorityKey, string | null> & { links?: string | null },
  matrxFrom: MatrxTileFrom = "authority_score",
): AuthorityTile[] {
  const matrxKey = matrxFrom === "authority_score" ? "matrx" : "links";
  const matrx = authorityTile("matrx", views[matrxKey] ?? null, errors[matrxKey] ?? null, matrxFrom === "authority_score" ? "score" : "rank");
  return [
    authorityTile("authority", views.authority, errors.authority),
    matrxFrom === "authority_score" ? matrx : { ...matrx, label: "Link strength" },
    authorityTile("searchAds", views.searchAds, errors.searchAds),
  ];
}
