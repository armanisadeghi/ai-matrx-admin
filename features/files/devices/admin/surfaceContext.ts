import {
  xmlElement,
  xmlList,
} from "@ai-matrx/chat/surfaces/runtime/context-bundle";
import type { SyncAdminRow } from "./types";
export const FLEET_SEGMENTS = [
  "over-quota",
  "stopped",
  "degraded",
  "behind",
] as const;
export type FleetSegment = (typeof FLEET_SEGMENTS)[number];
export function fleetSearchText(value: unknown): string {
  if (typeof value !== "string")
    throw new Error(
      "Fleet segment search expects plain text. Nothing was changed.",
    );
  return value;
}
export function fleetOverview(
  rows: readonly SyncAdminRow[],
  counts: Record<string, number>,
  observedAt: number,
  searches: Record<FleetSegment, string>,
): string {
  return xmlElement(
    "sync_fleet",
    {
      loaded_mapping_count: rows.length,
      loaded_mapping_limit: 1000,
      observed_at: observedAt,
      ...counts,
    },
    [
      xmlElement("searches", searches),
      xmlList(
        "mappings",
        rows,
        (row) =>
          xmlElement("mapping", {
            id: row.id,
            device_id: row.device_id,
            organization_id: row.organization_id,
            state: row.state,
            desired_state: row.desired_state,
            items_total: row.items_total,
            bytes_total: row.bytes_total,
          }),
        { maxRows: 12 },
      ),
    ],
  );
}
