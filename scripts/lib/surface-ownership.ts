/**
 * Who owns a `ui.ui_surface` row (surface-declarations plan D1: two sources, one table).
 *
 * - `declared_by = 'database'` (applet, person and organization surfaces): the DB is truth; the row
 *   is owned by its DB authoring path (`ui.save_applet_surface` / `ui.save_surface_extension`).
 * - a code row: owned by its TS manifest here, or by a server JSON declaration in aidream
 *   (`aidream/services/tooling/surface_declarations`).
 *
 * `null` = no owner; `check:surface-impact` reports it (SURFACE_ORPHANED / SURFACE_UNOWNED).
 */
export type SurfaceOwner = "database" | "manifest" | "server-json";

export function surfaceOwner(
  surface: { name: string; declared_by: string | null },
  manifestNames: ReadonlySet<string> | ReadonlyMap<string, unknown>,
  serverDeclared: ReadonlySet<string>,
): SurfaceOwner | null {
  if (surface.declared_by === "database") return "database";
  if (manifestNames.has(surface.name)) return "manifest";
  if (serverDeclared.has(surface.name)) return "server-json";
  return null;
}
