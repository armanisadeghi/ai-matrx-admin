// features/unified-data/base/baseMoveJob.ts — a big base moves as a server job (AT-MOVEJOB, chair ruling 2026-10-19).
// A base with more rows than the knob records.base_move_direct_max_rows moves through aidream `POST /base-move/jobs`: ONE
// transaction on the server, under the server's statement budget, as this person. The screen reads the job's durable state
// (`GET /base-move/jobs/{id}`) once a second, so a closed tab or a server restart loses nothing. Smaller bases move directly.

import { formatCount } from "@ai-matrx/kit/format";
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

// ── snapshots and restores (AT-SNAPJOB, 2026-10-19) ─────────────────────────────────────────────────────────────────────
// The same job and the same knob: above records.base_move_direct_max_rows a snapshot (or a restore) runs on the server in ONE
// transaction (aidream `POST /base-move/snapshot-jobs` / `/restore-jobs`), each copy and archive pass lands a progress note,
// and this reads them from `GET /base-move/jobs/{id}` once a second. Smaller bases stay on the direct path.

export interface BaseJobProgress { table?: string; at?: number; of?: number; done?: number | null; total?: number | null; seconds?: number }
export type BaseSnapshotJobView =
  | { state: "running"; kind: "snapshot" | "restore"; phase: string; progress?: BaseJobProgress }
  | { state: "done"; kind: "snapshot" | "restore"; result: Record<string, unknown>; seconds?: number | null }
  | { state: "refused"; kind: "snapshot" | "restore"; code?: string | null; message: string };

/** The progress line: "Copying Tasks (1 of 2): 275 of 1,050 rows… 6 s". */
export function snapshotProgressLine(view: BaseSnapshotJobView | null, verb: "snapshot" | "restore"): string {
  const start = verb === "snapshot" ? "Taking the snapshot…" : "Restoring as a new base…";
  if (!view || view.state !== "running") return start;
  const p = view.progress ?? {};
  const secs = typeof p.seconds === "number" ? ` ${Math.round(p.seconds)} s` : "";
  const which = p.table ? `${p.table}${p.of && p.of > 1 ? ` (${p.at} of ${p.of})` : ""}` : "";
  if (view.phase === "copying" && which) {
    const rows = typeof p.total === "number" ? `: ${formatCount(p.done ?? 0)} of ${formatCount(p.total)} rows` : "";
    return `Copying ${which}${rows}…${secs}`;
  }
  if (view.phase === "putting_away" && which) return `Putting away ${which}…${secs}`;
  if (view.phase === "linking") return `Linking the copies…${secs}`;
  return `${start}${secs}`;
}

export async function startBaseSnapshotJob(organizationId: string, args: { homeId: string; tables: Array<{ id: string; name: string }>; label: string }): Promise<string> {
  const { data } = await postJson<{ job_id: string }>("/base-move/snapshot-jobs",
    { organization_id: organizationId, home_id: args.homeId, tables: args.tables, label: args.label, origin: "manual" }, { organizationId });
  return data.job_id;
}

export async function startSnapshotRestoreJob(organizationId: string, args: { snapshotId: string; tables: unknown[]; baseName: string }): Promise<string> {
  const { data } = await postJson<{ job_id: string }>("/base-move/restore-jobs",
    { organization_id: organizationId, snapshot_id: args.snapshotId, tables: args.tables, base_name: args.baseName }, { organizationId });
  return data.job_id;
}

export async function readBaseSnapshotJob(organizationId: string, jobId: string): Promise<BaseSnapshotJobView> {
  const { data } = await getJson<BaseSnapshotJobView>(`/base-move/jobs/${jobId}`, { organizationId });
  return data;
}

/** Reads (one a second) with the same phase and progress before the screen stops following a job and says so (FIX-SNAP2). */
export const SNAPSHOT_JOB_STALL_READS = 120;

/**
 * Follow a job once a second until it lands or is refused; every running view goes to `onView`. A job whose phase and
 * progress (the clock aside) stay the same for SNAPSHOT_JOB_STALL_READS reads answers `refused` with code "stalled" —
 * never "Copying…" forever (live walk 2026-10-19).
 */
export async function followBaseSnapshotJob(organizationId: string, jobId: string, onView: (v: BaseSnapshotJobView) => void): Promise<BaseSnapshotJobView> {
  let lastMark: string | null = null;
  let still = 0;
  for (;;) {
    const view = await readBaseSnapshotJob(organizationId, jobId);
    onView(view);
    if (view.state !== "running") return view;
    const { seconds: _clock, ...moved } = view.progress ?? {};
    const mark = JSON.stringify([view.phase, moved]);
    still = mark === lastMark ? still + 1 : 0;
    lastMark = mark;
    if (still >= SNAPSHOT_JOB_STALL_READS) {
      const p = view.progress ?? {};
      const at = typeof p.total === "number" ? ` at ${formatCount(p.done ?? 0, { locale: "en-US" })} of ${formatCount(p.total, { locale: "en-US" })} rows` : "";
      const what = view.kind === "restore" ? "restore" : "snapshot";
      return { state: "refused", kind: view.kind, code: "stalled",
        message: `The ${what} stopped moving${at} for ${Math.round(SNAPSHOT_JOB_STALL_READS / 60)} minutes, so this screen stopped waiting. Open Snapshots again later to see whether it finished.` };
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

