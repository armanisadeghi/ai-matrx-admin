import type { PromptBlockRow } from "./types";

export type BlockLane = "mine" | "organization" | "system";
export const BLOCK_LANES: readonly BlockLane[] = ["mine", "organization", "system"];
export const BLOCK_LANE_LABEL: Record<BlockLane, string> = {
  mine: "Mine",
  organization: "Organization",
  system: "System",
};

/** The Matrx System organization: system blocks live here. */
export const SYSTEM_ORG_ID = "39c38960-d30c-4840-b0c1-c9960de95582";

export function laneOf(row: Pick<PromptBlockRow, "organization_id" | "visibility" | "created_by">, meId: string | null): BlockLane {
  if (row.organization_id === SYSTEM_ORG_ID) return "system";
  if (row.visibility === "personal" && row.created_by !== null && row.created_by === meId) return "mine";
  return "organization";
}

export function partitionByLane<T extends Pick<PromptBlockRow, "organization_id" | "visibility" | "created_by">>(
  rows: readonly T[],
  meId: string | null,
): Record<BlockLane, T[]> {
  const out: Record<BlockLane, T[]> = { mine: [], organization: [], system: [] };
  for (const row of rows) out[laneOf(row, meId)].push(row);
  return out;
}

export function matchesQuery(row: Pick<PromptBlockRow, "name" | "label" | "description">, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [row.name, row.label, row.description ?? ""].some((s) => s.toLowerCase().includes(q));
}

/** A bound-tool block is "may be stale" when the tool changed after the block's last edit. */
export function mayBeStale(blockUpdatedAt: string, toolUpdatedAt: string | null | undefined): boolean {
  if (!toolUpdatedAt) return false;
  const tool = Date.parse(toolUpdatedAt);
  const block = Date.parse(blockUpdatedAt);
  return Number.isFinite(tool) && Number.isFinite(block) && tool > block;
}
