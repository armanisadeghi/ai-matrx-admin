import type { SurfaceSyncPlan } from "@ai-matrx/alchemy/checks";

/**
 * THE DATABASE ROOT (surface declarations D5, 2026-10-22). Every chain ends at
 * `matrx-default/default` ("AI Matrx"), a database-declared row with no manifest in the
 * registry, so no manifest can name it in `inheritsFrom`. A manifest with no `inheritsFrom`
 * (the module surfaces, standalone pages) is a direct child of that root: the plan claims
 * `parent_surface_name = matrx-default/default` for it, on insert and on update, so the
 * sync parents it and `--check` reports it when it is not. Before this the plan claimed no
 * parent for such a manifest and the 30 module rows stayed roots (NULL) forever, unseen.
 */
export const DATABASE_ROOT_SURFACE = "matrx-default/default";

export function withDatabaseRoot(
  plan: SurfaceSyncPlan,
  manifests: readonly { surfaceName: string; inheritsFrom?: string | null }[],
): SurfaceSyncPlan {
  const silent = new Set(
    manifests.filter((m) => !m.inheritsFrom && m.surfaceName !== DATABASE_ROOT_SURFACE).map((m) => m.surfaceName),
  );
  return {
    ...plan,
    surfaces: plan.surfaces.map((surface) =>
      silent.has(surface.name)
        ? {
            ...surface,
            insert: { ...surface.insert, parent_surface_name: DATABASE_ROOT_SURFACE },
            update: { ...surface.update, parent_surface_name: DATABASE_ROOT_SURFACE },
          }
        : surface,
    ),
  };
}
