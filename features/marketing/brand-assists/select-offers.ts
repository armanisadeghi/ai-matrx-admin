/**
 * Which brand assists may be offered now — pure, tested (Smart Add VISION Part 24).
 *
 * Arman's rules (2026-10-16):
 * - Never more than 2-3 at once in TOTAL, across every brand. The hard cap is the
 *   producer policy row `brand.assist.` (`max_pending_per_user`, default 3), enforced
 *   by the one emit door; this module only orders the queue and never re-offers.
 * - A "no" stops the boosting. Dismissed ("Not now" / "Stop showing") or snoozed
 *   ("Later") means that assist is not offered again for that brand, unless the knob
 *   `brand_assists.decline_cooldown_days` (default 0 = never) has passed.
 * - Most valuable, cheapest and most certain first (server `rank`).
 */
import type { Assist } from "@/features/assists/types";

export const BRAND_ASSIST_SOURCE_PREFIX = "brand.assist.";
export const BRAND_ASSIST_SURFACE = "matrx-user/marketing-brand";

export interface BrandAssistOffer {
  assist_id: string;
  title: string;
  body: string;
  verb: string;
  lands: string;
  cost_usd: string | null;
  cost_points: number | null;
  rank: number;
  done: boolean;
}

export interface BrandAssistOffers {
  brand_id: string;
  brand_name: string;
  site: string | null;
  offers: BrandAssistOffer[];
  decline_cooldown_days: number;
}

export function brandAssistSourceKey(assistId: string): string {
  return `${BRAND_ASSIST_SOURCE_PREFIX}${assistId}`;
}

export function brandAssistDedupeKey(assistId: string, brandId: string): string {
  return `${BRAND_ASSIST_SOURCE_PREFIX}${assistId}:${brandId}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** True when the person said no (or "later") to this key and the cooldown has not passed. */
export function isDeclined(
  rows: Assist[],
  dedupeKey: string,
  cooldownDays: number,
  now: number,
): boolean {
  return rows.some((row) => {
    if (row.dedupeKey !== dedupeKey) return false;
    const declined = row.status === "dismissed" || row.suppressedUntil !== null;
    if (!declined) return false;
    if (cooldownDays <= 0) return true;
    const at = Date.parse(row.decidedAt ?? row.suppressedUntil ?? "");
    return !Number.isFinite(at) || now - at < cooldownDays * DAY_MS;
  });
}

/**
 * The offers to emit for one brand, best first. `history` is every
 * `brand.assist.*` row of mine (all brands, all statuses).
 */
export function offersToEmit(
  data: BrandAssistOffers,
  history: Assist[],
  now = Date.now(),
): BrandAssistOffer[] {
  const brandId = data.brand_id;
  return data.offers
    .filter((offer) => !offer.done)
    .filter((offer) => {
      const key = brandAssistDedupeKey(offer.assist_id, brandId);
      const live = history.some(
        (row) => row.dedupeKey === key && (row.status === "pending" || row.status === "accepted"),
      );
      return !live && !isDeclined(history, key, data.decline_cooldown_days, now);
    })
    .sort((a, b) => b.rank - a.rank);
}

/** Pending brand assists across every brand — what is already on screen somewhere. */
export function pendingBrandAssists(history: Assist[]): Assist[] {
  return history.filter((row) => row.status === "pending" && row.suppressedUntil === null);
}

/** Points line for a card: exact points, plus exact USD to the cent or below it. */
export function costLine(offer: Pick<BrandAssistOffer, "cost_points" | "cost_usd">): string {
  if (offer.cost_points === 0) return "Free";
  if (offer.cost_points == null) return "Price not set";
  const usd = Number(offer.cost_usd ?? "0");
  const dollars = usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`;
  return `${offer.cost_points.toLocaleString()} points (${dollars})`;
}
