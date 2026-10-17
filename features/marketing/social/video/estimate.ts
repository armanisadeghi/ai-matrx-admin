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
