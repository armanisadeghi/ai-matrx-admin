"use client";

/**
 * Gates addressed to a SEAT, shown on the chart's position boxes.
 *
 * A workflow decision gate may name an org-chart seat (`decision.seat`, aidream
 * `matrx_graph/seats.py`): it is asked of whoever holds the seat when it opens.
 * An Orchestra with a person member opens one when the run reaches them. The
 * chart reads them from the ONE waiting-on-you projection (`GET /runs/waiting`
 * via `useWaitingRuns`) — the viewer's own runs plus every gate that asked them
 * as a seat holder — and groups them by seat. No second read path.
 */

import { createContext, useContext } from "react";

import type { WaitingRunRow } from "@/features/workflow-runtime/discovery/waiting";

export interface SeatGate {
  /** Open gates addressed to this seat that the viewer can see. */
  count: number;
  /** The engine's words for the newest one: "Waiting on Arman (Brand owner)" / "No one holds Brand owner". */
  notice: string | null;
  /** False when nobody held the seat as the newest gate opened. */
  filled: boolean;
  /** The newest gate's run — where it is answered. */
  runId: string;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Group waiting rows by the seat their gate names. Rows arrive newest first. */
export function seatGatesByPosition(rows: readonly WaitingRunRow[]): Record<string, SeatGate> {
  const out: Record<string, SeatGate> = {};
  for (const row of rows) {
    const seat = record(row.decision?.seat);
    const positionId = typeof seat?.position_id === "string" ? seat.position_id : null;
    if (!positionId) continue;
    const existing = out[positionId];
    if (existing) {
      existing.count += 1;
      continue;
    }
    out[positionId] = {
      count: 1,
      notice: typeof seat?.notice === "string" ? seat.notice : null,
      filled: seat?.filled !== false,
      runId: row.runId,
    };
  }
  return out;
}

const SeatGatesContext = createContext<Record<string, SeatGate>>({});
export const OrgChartSeatGatesProvider = SeatGatesContext.Provider;

export function useSeatGate(positionId: string | null): SeatGate | null {
  const all = useContext(SeatGatesContext);
  return positionId ? (all[positionId] ?? null) : null;
}
