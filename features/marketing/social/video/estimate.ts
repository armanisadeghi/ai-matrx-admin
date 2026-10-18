/** One reading of the estimate for every screen (plan page, project page, run log): what is left to make and its price. */

import type { EstimateAnswer } from "./types";

export interface EstimateSummary {
  /** Items that will be made (and charged) now. */
  toMake: number;
  /** Items already made and reused for $0.00. */
  reused: number;
  usd: number;
  points: number;
}

/**
 * The server's lines are only what still has to run; `cached` lists what is already made. Totals cover the lines.
 * When the server names the counts itself (`to_make`, `reused`), those win.
 */
export function summarizeEstimate(est: EstimateAnswer & { to_make?: number; reused?: number }): EstimateSummary {
  return {
    toMake: typeof est.to_make === "number" ? est.to_make : est.lines.length,
    reused: typeof est.reused === "number" ? est.reused : est.cached.length,
    usd: est.total_usd,
    points: est.total_points,
  };
}

/** The label beside the price: "13 to make", "4 to make · 9 reused", "All made". */
export function estimateLabel(s: EstimateSummary): string {
  if (s.toMake === 0) return s.reused > 0 ? `${s.reused} reused` : "All made";
  return s.reused > 0 ? `${s.toMake} to make · ${s.reused} reused` : `${s.toMake} to make`;
}

const USD = (n: number) => `$${n.toFixed(2)}`;

/**
 * The per-second price of the clips that are billed by length (an AI presenter's talking takes): "4 to 8 s each at
 * $0.05 a second ($0.20 to $0.40 each)". Null when nothing in the estimate is billed per second.
 */
export function perSecondLine(est: Pick<EstimateAnswer, "lines">): string | null {
  const bySecond = est.lines.filter((l) => l.unit === "second" && l.unit_price_usd != null && l.quantity > 0);
  if (!bySecond.length) return null;
  const price = Math.min(...bySecond.map((l) => l.unit_price_usd as number));
  const priceTop = Math.max(...bySecond.map((l) => l.unit_price_usd as number));
  const lo = Math.min(...bySecond.map((l) => l.quantity));
  const hi = Math.max(...bySecond.map((l) => l.quantity));
  const secs = lo === hi ? `${lo} s` : `${lo} to ${hi} s`;
  const cost = (q: number) => USD(q * price);
  const each = lo === hi ? cost(lo) : `${cost(lo)} to ${cost(hi)}`;
  const rate = price === priceTop ? USD(price) : `${USD(price)} to ${USD(priceTop)}`;
  const total = bySecond.reduce((sum, l) => sum + (l.cost_usd ?? 0), 0);
  return `${bySecond.length} video ${bySecond.length === 1 ? "take" : "takes"}, ${secs} each at ${rate} a second (${each} each, ${USD(total)} in all)`;
}

/** The line that tells the person when the studio stops to ask: "Asks before spending over $1". Null when the setting is unknown. */
export function confirmLine(est: Pick<EstimateAnswer, "confirm_over_points">): string | null {
  const pts = est.confirm_over_points;
  if (pts == null) return null;
  if (pts <= 0) return "Asks before every generation";
  const usd = pts / 20000;
  return `Asks before spending over ${Number.isInteger(usd) ? `$${usd}` : USD(usd)}`;
}
