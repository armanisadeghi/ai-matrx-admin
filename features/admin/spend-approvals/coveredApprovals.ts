/**
 * A waiting spend-approval record that the same agent's owner-decided approval already covers (the gate ignores it).
 * Pure on purpose: the list, the KPIs, the filter and the record page all read these, and nothing else decides it.
 */
type CoverRow = { status: string; covered_by_id: string | null };

/** Covered: waiting on paper, but the agent's own approval already lets the run. It is not waiting anywhere. */
export const isCovered = (r: CoverRow): boolean => r.status === "waiting" && r.covered_by_id != null;

/** Waiting and nobody has decided it, directly or through the agent. */
export const isWaiting = (r: CoverRow): boolean => r.status === "waiting" && r.covered_by_id == null;

export const COVERED_LABEL = "Covered by the agent's approval";
