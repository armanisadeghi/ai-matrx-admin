"use client";

/**
 * What the Inspect panel needs about a shape's rendering component: its source
 * (for Copy for AI) and the newest saved inspection (`content_ir.render_inspection`,
 * subject_type `kind_component`). Direct supabase-js reads; RLS is the ceiling.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/utils/supabase/client";
import {
  latestInspectionOf,
  subjectRefOf,
  type InspectionRow,
  type LatestInspection,
} from "./latest-inspection";

export interface ShapeInspectionData {
  /** The web output component the shape renders with; null = none registered. */
  component: { id: string; key: string; source: string | null } | null;
  latest: LatestInspection | null;
}

async function readShapeInspection(kindDefinitionId: string): Promise<ShapeInspectionData> {
  const { data: components, error } = await supabase
    .schema("content_ir")
    .from("kind_component")
    .select("id, component_key, component_source, is_active")
    .eq("kind_definition_id", kindDefinitionId)
    .eq("role", "output")
    .eq("platform", "web")
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
  const rows = components ?? [];
  // The component a viewer sees: an active real one, else any active one.
  const chosen =
    rows.find((r) => r.is_active && r.component_key !== "generic_structured") ??
    rows.find((r) => r.is_active) ??
    null;
  if (!chosen) return { component: null, latest: null };

  const { data: inspections, error: inspectionError } = await supabase
    .schema("content_ir")
    .from("render_inspection")
    .select("id, subject_ref, round, measurements, screenshot_file_id, created_at")
    .eq("subject_type", "kind_component")
    .eq("subject_ref", subjectRefOf(chosen.id))
    .order("round", { ascending: false })
    .limit(40);
  if (inspectionError) throw new Error(inspectionError.message);
  return {
    component: { id: chosen.id, key: chosen.component_key, source: chosen.component_source ?? null },
    latest: latestInspectionOf((inspections ?? []) as InspectionRow[]),
  };
}

export function useShapeInspection(kindDefinitionId: string) {
  return useQuery({
    queryKey: ["content-ir", "shape-inspection", kindDefinitionId],
    queryFn: () => readShapeInspection(kindDefinitionId),
    staleTime: 60_000,
    retry: 1,
  });
}
