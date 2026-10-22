"use client";

/**
 * Surface fleet metric — one row per surface, BOTH sources (code manifests and
 * database/applet surfaces), read from `ui.vw_surface_fleet_metric` (aidream
 * migration 20261022450000). Surface declarations PLAN W0.
 *
 * - Values supplied come from 30-day run receipts rolled up in
 *   `ui.mv_surface_run_supply` (the receipts surface evidence reads), plus a
 *   probe's `last_check.suppliedValues`. The rollup refreshes on demand:
 *   `refreshSurfaceRunSupply()` (~3 s, platform admins only).
 * - Write handlers are not in the database: only the static AST check knows
 *   them, so its `--emit` census (write-handler-coverage.generated.json) is
 *   read here and counted against the database's write target names.
 */
import { createClient } from "@/utils/supabase/client";
import { readAllRows } from "@ai-matrx/data/db";
import coverage from "@/features/surfaces/data/write-handler-coverage.generated.json";

export interface SurfaceFleetMetricRow {
  id: string;
  name: string;
  label: string | null;
  declared_by: string;
  client_name: string;
  parent_surface_name: string | null;
  is_active: boolean;
  values_declared_on: number;
  values_supplied: number;
  values_supplied_by_probe: number;
  supplied_ratio: number | null;
  write_targets: number;
  patchable_targets: number;
  write_target_names: string[];
  situation_present: boolean;
  situation_source: "own" | "inherited" | null;
  situation_from: string | null;
  last_run_at: string | null;
  runs_30d: number;
  probe_result: string | null;
  probe_checked_at: string | null;
  supply_refreshed_at: string | null;
}

/** A row with its handler count resolved (null = the code check does not measure this surface). */
export interface SurfaceFleetMetric extends SurfaceFleetMetricRow {
  handled_targets: number | null;
}

const HANDLED: Record<string, string[]> = (coverage as { handled: Record<string, string[]> }).handled;

/**
 * Handlers the static check found for this surface's database write targets.
 * Code surfaces only: database/applet surfaces have no code mount the check can
 * read, so their count is unknown (null), never a made-up 0.
 */
export function handledTargetCount(row: SurfaceFleetMetricRow): number | null {
  if (row.write_targets === 0) return 0;
  if (row.declared_by !== "code") return null;
  const handled = new Set(HANDLED[row.name] ?? []);
  return row.write_target_names.filter((n) => handled.has(n)).length;
}

// The view is newer than the generated Database types; read it through an
// untyped schema handle rather than widening every caller.
type UntypedSchema = {
  from: (relation: string) => {
    select: (
      columns: string,
      options?: { count?: "exact" },
    ) => {
      order: (
        column: string,
        options: { ascending: boolean },
      ) => {
        range: (
          from: number,
          to: number,
        ) => PromiseLike<{
          data: SurfaceFleetMetricRow[] | null;
          error: { message: string } | null;
          count: number | null;
        }>;
      };
    };
  };
  rpc: (fn: string) => PromiseLike<{ data: string | null; error: { message: string } | null }>;
};

const ui = () => createClient().schema("ui") as unknown as UntypedSchema;

export async function listSurfaceFleetMetric(): Promise<Map<string, SurfaceFleetMetric>> {
  const rows = await readAllRows<SurfaceFleetMetricRow>(
    ({ from, to }) =>
      ui()
        .from("vw_surface_fleet_metric")
        .select("*", { count: "exact" })
        .order("name", { ascending: true })
        .range(from, to),
    { label: "ui.vw_surface_fleet_metric" },
  );
  return new Map(
    rows.map((r) => [
      r.name,
      {
        ...r,
        supplied_ratio: r.supplied_ratio === null ? null : Number(r.supplied_ratio),
        handled_targets: handledTargetCount(r),
      },
    ]),
  );
}

/** Re-roll the 30-day supply rollup; returns its new snapshot time. */
export async function refreshSurfaceRunSupply(): Promise<string | null> {
  const { data, error } = await ui().rpc("refresh_surface_run_supply");
  if (error) throw new Error(`ui.refresh_surface_run_supply: ${error.message}`);
  return data;
}
