/**
 * Reconcile Supabase `sandbox_instances` rows against the live orchestrators.
 *
 * Why this exists: the active-sandbox limit is enforced by counting rows in
 * Supabase whose status is one of {creating, starting, ready, running}. If a
 * container is destroyed out-of-band (orchestrator crash, container exit,
 * manual `docker rm`, or — historically — an in-memory orchestrator restart
 * dropping its store), the Supabase row stays "ready" forever and burns a
 * limit slot. This module asks each tier's orchestrator whether it still
 * knows about the row's `sandbox_id`; if not, the row is marked stopped.
 *
 * Server-only.
 */

import { createClient } from "@/utils/supabase/server";
import {
  resolveOrchestratorByTier,
  orchestratorJsonHeaders,
} from "@/lib/sandbox/orchestrator-routing";
import type { SandboxConfig, SandboxTier } from "@/types/sandbox";

const ACTIVE_STATUSES = ["creating", "starting", "ready", "running"] as const;
const ORCHESTRATOR_DEAD_STATUSES = new Set(["stopped", "destroyed", "error"]);

export interface ReconcileResult {
  total: number;
  reconciled: number;
  still_active: number;
  unreachable: number;
  rows: Array<{
    id: string;
    sandbox_id: string;
    tier: SandboxTier;
    prior_status: string;
    new_status: string;
    reason: string;
  }>;
}

/**
 * Reconcile every active sandbox row owned by `userId` against the live
 * orchestrators. Returns a summary; mutates Supabase in place.
 *
 * Network-call cost: one HTTP call per active row, in parallel. With the
 * 5-row cap this is at most 5 concurrent calls — fine.
 */
export async function reconcileUserSandboxes(
  userId: string,
): Promise<ReconcileResult> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("sandbox_instances")
    .select("id, sandbox_id, status, config")
    .eq("user_id", userId)
    .in("status", [...ACTIVE_STATUSES])
    .is("deleted_at", null);

  if (error || !rows || rows.length === 0) {
    return {
      total: 0,
      reconciled: 0,
      still_active: 0,
      unreachable: 0,
      rows: [],
    };
  }

  const summary: ReconcileResult["rows"] = [];
  let reconciled = 0;
  let stillActive = 0;
  let unreachable = 0;

  await Promise.all(
    rows.map(async (row) => {
      const tier = ((row.config as SandboxConfig | null)?.tier ?? "ec2") as SandboxTier;
      const target = resolveOrchestratorByTier(tier);

      let orchestratorStatus: "alive" | "gone" | "unreachable" = "unreachable";
      let httpStatus = 0;

      try {
        const resp = await fetch(
          `${target.url}/sandboxes/${row.sandbox_id}`,
          {
            method: "GET",
            headers: orchestratorJsonHeaders(target),
            signal: AbortSignal.timeout(5_000),
          },
        );
        httpStatus = resp.status;
        if (resp.status === 404) {
          orchestratorStatus = "gone";
        } else if (resp.ok) {
          const body = (await resp.json()) as { status?: string };
          orchestratorStatus = ORCHESTRATOR_DEAD_STATUSES.has(body.status ?? "")
            ? "gone"
            : "alive";
        }
      } catch {
        orchestratorStatus = "unreachable";
      }

      if (orchestratorStatus === "alive") {
        stillActive += 1;
        return;
      }
      if (orchestratorStatus === "unreachable") {
        unreachable += 1;
        // Don't touch rows when the orchestrator is unreachable — could be a
        // transient network blip. Better to leave them and let a retry catch
        // the real state.
        summary.push({
          id: row.id,
          sandbox_id: row.sandbox_id,
          tier,
          prior_status: row.status,
          new_status: row.status,
          reason: `orchestrator unreachable (http=${httpStatus})`,
        });
        return;
      }

      // orchestratorStatus === "gone" — row references a sandbox the
      // orchestrator no longer knows about. Mark it stopped.
      const { error: updateErr } = await supabase
        .from("sandbox_instances")
        .update({
          status: "destroyed",
          stopped_at: new Date().toISOString(),
          stop_reason: "reconcile_orphan",
        })
        .eq("id", row.id)
        .eq("user_id", userId);

      if (!updateErr) {
        reconciled += 1;
        summary.push({
          id: row.id,
          sandbox_id: row.sandbox_id,
          tier,
          prior_status: row.status,
          new_status: "destroyed",
          reason: `orchestrator returned http=${httpStatus} (gone)`,
        });
      } else {
        // Update failure shouldn't happen in practice; log and surface.
        console.error("[reconcile] update failed:", updateErr);
        summary.push({
          id: row.id,
          sandbox_id: row.sandbox_id,
          tier,
          prior_status: row.status,
          new_status: row.status,
          reason: `update failed: ${updateErr.message}`,
        });
      }
    }),
  );

  return {
    total: rows.length,
    reconciled,
    still_active: stillActive,
    unreachable,
    rows: summary,
  };
}
