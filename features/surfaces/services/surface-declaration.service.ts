"use client";

/**
 * The full declaration of one surface and its ancestor chain, read from the
 * `ui.ui_surface*` tables — the ONE store for both sources (surface declarations D1):
 * code manifests are mirrored there by the sync, database/applet surfaces live there.
 * Read by the per-surface admin page (W5). No writes.
 */
import { createClient } from "@/utils/supabase/client";
import { readAllRows } from "@ai-matrx/data/db";
import type { Database } from "@/types/database.types";
import type { SurfaceFleetMetric, SurfaceFleetMetricRow } from "@/features/surfaces/services/surface-fleet-metric";
import { handledTargetCount } from "@/features/surfaces/services/surface-fleet-metric";

/** Deepest chain the runtime walks (D5 depth cap 5) plus slack for the root. */
const MAX_CHAIN = 8;

export interface ChainSurface {
  name: string;
  label: string | null;
  parent_surface_name: string | null;
  declared_by: string | null;
  intro: string | null;
  intro_override: string | null;
  situation: string | null;
  situation_override: string | null;
}

export interface DeclaredValue {
  surface_name: string;
  name: string;
  label: string | null;
  description: string | null;
  value_type: string | null;
  auto_context: boolean | null;
  always_available: boolean | null;
  max_inline_chars: number | null;
  item_type: string | null;
  group_key: string | null;
  sort_order: number | null;
}

export interface DeclaredWriteTarget {
  surface_name: string;
  name: string;
  label: string | null;
  description: string | null;
  value_type: string | null;
  mode: string | null;
  updates_value: string | null;
  apply_policy: string | null;
  patchable: boolean | null;
  item_type: string | null;
  sort_order: number | null;
}

export interface DeclaredClientTool {
  surface_name: string;
  name: string;
  label: string | null;
  description: string | null;
  mode: string | null;
  input_schema: unknown;
}

export interface DeclaredAction {
  surface_name: string;
  item_type: string;
  name: string;
  category: string | null;
  label: string | null;
  description: string | null;
  runs: string | null;
  target: string | null;
  policy: string | null;
  updates_value: string | null;
  triggered_by: string[] | null;
}

export interface DeclaredItemType {
  surface_name: string;
  name: string;
  label: string | null;
  description: string | null;
  entity_type: string | null;
}

export interface SurfaceRoleRow {
  surface_name: string;
  name: string;
  label: string | null;
  kind: string | null;
  mandate_key: string | null;
  default_agent_id: string | null;
  auto_run: string | null;
}

export interface RunSupplyRow {
  surface_name: string;
  last_run_at: string | null;
  runs_30d: number;
  supplied_keys: string[];
  refreshed_at: string | null;
}

/**
 * Root-first ancestors, then the surface itself last.
 *
 * Two reads, whatever the depth: the precomputed chain (`ui.mv_surface_chain`, W4 —
 * re-rolled by triggers whenever a name, parent or deleted state changes) names the
 * ancestors, then one `ui_surface` read fetches them all. The old walk sent one request
 * per level in sequence, so a single PostgREST stall on any level held the whole page
 * past the 12-second read deadline.
 */
export async function loadSurfaceChain(surfaceName: string): Promise<ChainSurface[]> {
  const ui = createClient().schema("ui");
  const { data: links, error: chainError } = await ui
    .from("mv_surface_chain")
    .select("ancestor_name, depth")
    .eq("surface_name", surfaceName)
    .order("depth", { ascending: true })
    .limit(MAX_CHAIN);
  if (chainError) throw new Error(`ui.mv_surface_chain ${surfaceName}: ${chainError.message}`);
  const names = (links ?? []).map((l) => l.ancestor_name).filter((n): n is string => Boolean(n));
  if (!names.includes(surfaceName)) names.unshift(surfaceName);
  const { data: rows, error } = await ui
    .from("ui_surface")
    .select(
      "name, label, parent_surface_name, declared_by, intro, intro_override, situation, situation_override",
    )
    .in("name", names);
  if (error) throw new Error(`ui.ui_surface chain of ${surfaceName}: ${error.message}`);
  const byName = new Map((rows ?? []).map((r) => [r.name, r]));
  // depth 0 is the surface itself; root-first means deepest ancestor first.
  const chain: ChainSurface[] = [];
  for (const n of names) {
    const row = byName.get(n);
    if (row) chain.unshift(row);
  }
  return chain;
}

export interface SurfaceDeclarationData {
  values: DeclaredValue[];
  writeTargets: DeclaredWriteTarget[];
  clientTools: DeclaredClientTool[];
  actions: DeclaredAction[];
  itemTypes: DeclaredItemType[];
}

/** Every declared row for the given surfaces (the chain), each tagged with its declaring surface. */
export async function loadDeclaration(surfaceNames: string[]): Promise<SurfaceDeclarationData> {
  const ui = () => createClient().schema("ui");
  const live = { deleted: "deleted_at" } as const;
  const [values, writeTargets, clientTools, actions, itemTypes] = await Promise.all([
    readAllRows<DeclaredValue>(
      ({ from, to }) =>
        ui()
          .from("ui_surface_value")
          .select(
            "surface_name, name, label, description, value_type, auto_context, always_available, max_inline_chars, item_type, group_key, sort_order",
            { count: "exact" },
          )
          .in("surface_name", surfaceNames)
          .is(live.deleted, null)
          .order("sort_order", { ascending: true })
          .range(from, to),
      { label: "ui.ui_surface_value" },
    ),
    readAllRows<DeclaredWriteTarget>(
      ({ from, to }) =>
        ui()
          .from("ui_surface_write_target")
          .select(
            "surface_name, name, label, description, value_type, mode, updates_value, apply_policy, patchable, item_type, sort_order",
            { count: "exact" },
          )
          .in("surface_name", surfaceNames)
          .is(live.deleted, null)
          .order("sort_order", { ascending: true })
          .range(from, to),
      { label: "ui.ui_surface_write_target" },
    ),
    readAllRows<DeclaredClientTool>(
      ({ from, to }) =>
        ui()
          .from("ui_surface_client_tool")
          .select("surface_name, name, label, description, mode, input_schema", { count: "exact" })
          .in("surface_name", surfaceNames)
          .is(live.deleted, null)
          .order("name", { ascending: true })
          .range(from, to),
      { label: "ui.ui_surface_client_tool" },
    ),
    readAllRows<DeclaredAction>(
      ({ from, to }) =>
        ui()
          .from("ui_surface_action")
          .select(
            "surface_name, item_type, name, category, label, description, runs, target, policy, updates_value, triggered_by",
            { count: "exact" },
          )
          .in("surface_name", surfaceNames)
          .is(live.deleted, null)
          .order("sort_order", { ascending: true })
          .range(from, to),
      { label: "ui.ui_surface_action" },
    ),
    readAllRows<DeclaredItemType>(
      ({ from, to }) =>
        ui()
          .from("ui_surface_item_type")
          .select("surface_name, name, label, description, entity_type", { count: "exact" })
          .in("surface_name", surfaceNames)
          .is(live.deleted, null)
          .order("sort_order", { ascending: true })
          .range(from, to),
      { label: "ui.ui_surface_item_type" },
    ),
  ]);
  return { values, writeTargets, clientTools, actions, itemTypes };
}

export type IntelligenceRow = Database["ui"]["Functions"]["surface_intelligence"]["Returns"][number];

/**
 * Everything bound to the surface or any ancestor — agent bindings (`agent.menu_surface`) and
 * mandate shortcuts (`mandate.vw_shortcut`) — through the W4 read `ui.surface_intelligence`,
 * which runs as the caller and tags each row with `group_level` (page / module / ai_matrx)
 * and `scope` (person / organization / system). One read; ordered page→module→ai_matrx,
 * then person→organization→system.
 */
export async function loadSurfaceIntelligence(surfaceName: string): Promise<IntelligenceRow[]> {
  const { data, error } = await createClient()
    .schema("ui")
    .rpc("surface_intelligence", { p_surface_name: surfaceName });
  if (error) throw new Error(`ui.surface_intelligence: ${error.message}`);
  return data ?? [];
}

/**
 * The fixed jobs (agent roles) declared on the surface and its ancestors. Role slots are not
 * menu bindings (W4 census), so they stay a direct read over the chain.
 */
export async function loadChainRoles(surfaceNames: string[]): Promise<SurfaceRoleRow[]> {
  const supabase = createClient();
  return readAllRows<SurfaceRoleRow>(
    ({ from, to }) =>
      supabase
        .schema("ui")
        .from("ui_surface_agent_role")
        .select("surface_name, name, label, kind, mandate_key, default_agent_id, auto_run", {
          count: "exact",
        })
        .in("surface_name", surfaceNames)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true })
        .range(from, to),
    { label: "ui.ui_surface_agent_role" },
  );
}

// The view and rollup are newer than the generated Database types.
type UntypedSingle<T> = {
  from: (relation: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => PromiseLike<{ data: T | null; error: { message: string } | null }>;
      };
    };
  };
};

/** This surface's fleet metric row (both sources) with its handler count resolved. */
export async function loadSurfaceFleetMetric(surfaceName: string): Promise<SurfaceFleetMetric | null> {
  const ui = createClient().schema("ui") as unknown as UntypedSingle<SurfaceFleetMetricRow>;
  const { data, error } = await ui
    .from("vw_surface_fleet_metric")
    .select("*")
    .eq("name", surfaceName)
    .maybeSingle();
  if (error) throw new Error(`ui.vw_surface_fleet_metric: ${error.message}`);
  if (!data) return null;
  return {
    ...data,
    supplied_ratio: data.supplied_ratio === null ? null : Number(data.supplied_ratio),
    handled_targets: handledTargetCount(data),
  };
}

/** The 30-day run-supply rollup row (`ui.mv_surface_run_supply`); null when no run in 30 days. */
export async function loadRunSupply(surfaceName: string): Promise<RunSupplyRow | null> {
  const ui = createClient().schema("ui") as unknown as UntypedSingle<RunSupplyRow>;
  const { data, error } = await ui
    .from("mv_surface_run_supply")
    .select("surface_name, last_run_at, runs_30d, supplied_keys, refreshed_at")
    .eq("surface_name", surfaceName)
    .maybeSingle();
  if (error) throw new Error(`ui.mv_surface_run_supply: ${error.message}`);
  return data;
}
