/**
 * Tool Battle — pure display logic. No React, no I/O.
 *
 * The numbers themselves are the server's: `battle.summary` (lane rollups, ranking, field coverage) is
 * derived once in aidream `services/tool_battle/analysis.py` and rewritten after every cell, so the page
 * never re-derives a rate. What lives here is only how a number reads and which lane placed where.
 */

import { formatDurationMs, formatUsd } from "@ai-matrx/kit/format";
import { blindAnonLabel } from "@/features/agent-comparison/shared/blind";
import type { BattleView, CellView, Lane, LaneRollup } from "./types";

export type Direction = "lower" | "higher";

/**
 * Competition ranking (1-1-3) of `values` by lane id; null when a lane has no value or every shown
 * value is equal (not a comparison). `shown` makes values that READ the same tie.
 */
export function placeLanes(
  values: Record<string, number | null>,
  direction: Direction,
  shown: (v: number) => string = String,
): Record<string, number | null> {
  const out: Record<string, number | null> = Object.fromEntries(Object.keys(values).map((k) => [k, null]));
  const ranked = Object.entries(values)
    .filter((e): e is [string, number] => e[1] !== null)
    .map(([id, v]) => ({ id, v, text: shown(v) }));
  if (ranked.length < 2 || ranked.every((r) => r.text === ranked[0].text)) return out;
  ranked.sort((a, b) => (direction === "lower" ? a.v - b.v : b.v - a.v));
  ranked.forEach((r, i) => {
    const prev = ranked[i - 1];
    out[r.id] = prev && prev.text === r.text ? (out[prev.id] ?? i + 1) : i + 1;
  });
  return out;
}

export type Mark = "best" | "worst" | null;

export function marks(places: Record<string, number | null>): Record<string, Mark> {
  const present = Object.values(places).filter((p): p is number => p !== null);
  const out: Record<string, Mark> = {};
  if (present.length === 0) return out;
  const last = Math.max(...present);
  for (const [id, p] of Object.entries(places)) {
    if (p === 1) out[id] = "best";
    else if (p !== null && p === last) out[id] = "worst";
  }
  return out;
}

export function formatMs(ms: number | null | undefined): string {
  return formatDurationMs(ms, { style: "compact" });
}

export function formatPercent(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return "—";
  return `${Math.round(rate * 100)}%`;
}

/** "8 of 10" — a rate always travels with its sample (CONTRACT §12a). */
export function formatOf(n: number, total: number): string {
  return `${n} of ${total}`;
}

export function formatPoints(points: number | null | undefined): string {
  if (points === null || points === undefined || !Number.isFinite(points)) return "—";
  return `${Math.round(points).toLocaleString("en-US")} pts`;
}

/** What each lane is called on screen: its label, or "Response A" while a blind battle is unrevealed. */
export function laneName(battle: BattleView, lane: Lane, revealed: boolean): string {
  if (!battle.blind || revealed) return lane.label;
  const source = blindAnonLabel(lane.lane_id, battle.blindOrder).replace("Response", "Source");
  return source;
}

/** Lanes in the order the page shows them: the blind shuffle while hidden, the battle's order otherwise. */
export function shownLanes(battle: BattleView, revealed: boolean): Lane[] {
  if (!battle.blind || revealed || battle.blindOrder.length === 0) return battle.lanes;
  const byId = new Map(battle.lanes.map((l) => [l.lane_id, l]));
  return battle.blindOrder.map((id) => byId.get(id)).filter((l): l is Lane => l !== undefined);
}

export interface LaneMetricPlaces {
  success: Record<string, number | null>;
  speed: Record<string, number | null>;
  cost: Record<string, number | null>;
  fields: Record<string, number | null>;
}

export function lanePlaces(rollups: Record<string, LaneRollup>): LaneMetricPlaces {
  const pick = (f: (r: LaneRollup) => number | null) =>
    Object.fromEntries(Object.entries(rollups).map(([id, r]) => [id, f(r)]));
  return {
    success: placeLanes(pick((r) => r.success_rate), "higher", (v) => formatPercent(v)),
    speed: placeLanes(pick((r) => r.p50_ms), "lower", (v) => formatMs(v)),
    cost: placeLanes(pick((r) => r.cost_per_success_usd), "lower", (v) => formatUsd(v, { digits: "adaptive" })),
    fields: placeLanes(pick((r) => r.mean_filled_fields), "higher", (v) => v.toFixed(1)),
  };
}

export const SETTLED_CELL = new Set(["succeeded", "empty", "failed", "refused", "cancelled"]);

export function progressOf(cells: CellView[]): { done: number; total: number } {
  return { done: cells.filter((c) => SETTLED_CELL.has(c.status)).length, total: cells.length };
}

/** A running cell whose heartbeat is older than the server's lease (`battle.leaseSeconds`) lost its runner. */
export function isStalled(cell: CellView, now: number, leaseSeconds: number | null): boolean {
  if (leaseSeconds === null || cell.status !== "running" || !cell.heartbeatAt) return false;
  return now - Date.parse(cell.heartbeatAt) > leaseSeconds * 1000;
}

export function statusLabel(status: CellView["status"]): string {
  switch (status) {
    case "succeeded": return "Answered";
    case "empty": return "No result";
    case "failed": return "Failed";
    case "refused": return "Refused";
    case "cancelled": return "Canceled";
    case "running": return "Running";
    default: return "Waiting";
  }
}

/** The short word a tile shows when a lookup did not answer ("timed out", "void"). */
export function reasonLabel(cell: CellView): string {
  return (cell.errorCode ?? "").replaceAll("_", " ");
}
