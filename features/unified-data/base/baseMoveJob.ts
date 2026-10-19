// features/unified-data/base/baseMoveJob.ts — a big base moves as a server job (AT-MOVEJOB, chair ruling 2026-10-19).
// A base with more rows than the knob records.base_move_direct_max_rows moves through aidream `POST /base-move/jobs`: ONE
// transaction on the server, under the server's statement budget, as this person. The screen reads the job's durable state
// (`GET /base-move/jobs/{id}`) once a second, so a closed tab or a server restart loses nothing. Smaller bases move directly.

import type { RecordsClient } from "@ai-matrx/records/core";

import { getJson, postJson } from "@/lib/python-client";
import { knobInt } from "@/lib/knobs/featureKnobs";

export type BaseMoveJobView =
  | { state: "running"; phase: string }
  | { state: "moved"; result: Record<string, unknown>; seconds?: number | null }
  | { state: "refused"; code?: string | null; message: string };

/** How the move goes: rows in the base against the direct budget. A count that cannot be read goes to the job (it has room for any size). */
export async function planBaseMove(client: Pick<RecordsClient, "tableRowCounts">, tableIds: readonly string[]): Promise<{ rows: number | null; job: boolean }> {
  if (tableIds.length === 0) return { rows: 0, job: false };
  const max = await knobInt("records", "base_move_direct_max_rows");
  const counted = await client.tableRowCounts({ table_ids: [...tableIds] }).catch(() => null);
  if (!counted || !counted.ok) return { rows: null, job: true };
  const rows = counted.data.reduce((n, c) => n + (Number(c.visible_rows) || 0), 0);
  return { rows, job: rows > max };
}

export async function startBaseMoveJob(organizationId: string, homeId: string, toOrganizationId: string): Promise<string> {
  const { data } = await postJson<{ job_id: string }>("/base-move/jobs", { home_id: homeId, to_organization_id: toOrganizationId }, { organizationId });
  return data.job_id;
}

export async function readBaseMoveJob(organizationId: string, jobId: string): Promise<BaseMoveJobView> {
  const { data } = await getJson<BaseMoveJobView>(`/base-move/jobs/${jobId}`, { organizationId });
  return data;
}
