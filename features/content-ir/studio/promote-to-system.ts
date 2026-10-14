"use client";

// features/content-ir/studio/promote-to-system.ts
//
// THE SHAPE PROMOTION DOOR, client side. One database door does all of it:
// `content_ir.promote_kinds_to_system(p_kind_definition_ids)` (SECURITY
// DEFINER, `is_super_admin()` checked in the body). In ONE transaction it
// re-homes each shape into the Matrx System organization (published to the
// web) and carries everything that belongs to it — renderers, sample data,
// surfaces, edges, incident log, teaching blocks — plus every nested shape it
// depends on, so nothing is left behind in the old organization. People's own
// saved instances stay theirs. The screen gate (`selectAdminFeature`) only
// decides whether the control is OFFERED.

import { supabase } from "@/utils/supabase/client";
import { withAdminFeature } from "@/utils/auth/adminFeaturesOnUserPages";
import { operationFailed } from "@/utils/errors";
import { SYSTEM_ORGANIZATION_ID } from "@/constants/platform-orgs";

export interface PromotedShapeRef {
  id: string;
  kind: string;
  label: string;
}

export interface ShapePromotionResult {
  promoted: PromotedShapeRef[];
  /** Shapes the promoted ones depend on, promoted with them. */
  nested: PromotedShapeRef[];
  alreadySystem: PromotedShapeRef[];
  moved: Record<string, number>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function refs(value: unknown): PromotedShapeRef[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((row) => ({
    id: String(row.id ?? ""),
    kind: String(row.kind ?? ""),
    label: String(row.label ?? row.kind ?? ""),
  }));
}

export function isSystemShape(organizationId: string | null | undefined): boolean {
  return organizationId === SYSTEM_ORGANIZATION_ID;
}

export async function promoteShapesToSystem(
  kindDefinitionIds: string[],
): Promise<ShapePromotionResult> {
  const { data, error } = await withAdminFeature(
    "shape.promote-to-system",
    supabase
      .schema("content_ir")
      .rpc("promote_kinds_to_system", { p_kind_definition_ids: kindDefinitionIds }),
  );
  if (error) throw operationFailed("promote to Matrx System", error);
  const row = isRecord(data) ? data : {};
  const moved = isRecord(row.moved)
    ? Object.fromEntries(
        Object.entries(row.moved).map(([key, n]) => [key, Number(n) || 0]),
      )
    : {};
  return {
    promoted: refs(row.promoted),
    nested: refs(row.nested),
    alreadySystem: refs(row.already_system),
    moved,
  };
}

/** One short line for the success toast. */
export function promotionSummary(result: ShapePromotionResult): string {
  const n = result.promoted.length;
  const parts: string[] = [];
  if (n === 1) parts.push(`"${result.promoted[0].label}" is now a system shape`);
  else if (n > 1) parts.push(`${n} shapes are now system shapes`);
  const nested = result.nested.length;
  if (nested > 0) parts.push(`with ${nested} nested shape${nested === 1 ? "" : "s"} they use`);
  const already = result.alreadySystem.length;
  if (already > 0)
    parts.push(`${already} ${already === 1 ? "was" : "were"} already in the system`);
  return parts.length > 0 ? `${parts.join("; ")}.` : "Nothing to promote.";
}

/** The kind's home organization, read by slug — for the detail header. */
export async function fetchShapeHome(
  kind: string,
): Promise<{ id: string; organizationId: string } | null> {
  const { data, error } = await supabase
    .schema("content_ir")
    .from("kind_definition")
    .select("id, organization_id")
    .eq("kind", kind)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw operationFailed("read this shape's home", error);
  return data ? { id: data.id, organizationId: data.organization_id } : null;
}
