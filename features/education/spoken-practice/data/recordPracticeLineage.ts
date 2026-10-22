// features/education/spoken-practice/data/recordPracticeLineage.ts
//
// A practice session's lineage EDGES: study_session --source--> each Source it was built on.
// Same direction and role as every converter edge (`education/convert/recordSourceLineage.ts`):
// the made thing is the edge SOURCE, role "source". Provenance only — the pairs are registered
// `container_side = none` in platform.association_types, so an edge conveys no access.
//
// Written through the bulk door (`associationsHelpers.linkEdges`), idempotent per edge. Never
// throws and never silent: the session IS saved, so a failure is logged and returned (law 4).

import type { SourceRef, SourceSet } from "@ai-matrx/agents/sources";
import { sourceKey } from "@ai-matrx/agents/sources/runtime";
import { associationsHelpers } from "@/features/scopes/service/associationsService";
import type { PracticeSource } from "../types";

/** Every Source kind (registry token) a `study_session → <kind>` pair is registered for. */
export const PRACTICE_LINEAGE_TARGET_TYPES = [
  "fc_set",
  "file",
  "note",
  "document",
  "udt_document",
  "processed_document",
  "transcript",
  "conversation",
  "dataset",
  "structured_list",
  "workbook",
  "content_ir_kind_instance",
] as const;

const REGISTERED = new Set<string>(PRACTICE_LINEAGE_TARGET_TYPES);

type EdgeSpec = Parameters<typeof associationsHelpers.linkEdges>[0][number];

export interface PracticeLineageSession {
  id: string;
  organization_id?: string | null;
}

/** One `source` edge per distinct, registered Source in the chosen set. Pure. */
export function practiceLineageEdges(
  session: PracticeLineageSession,
  sourceSet: SourceSet,
  names: NonNullable<PracticeSource["sourceNames"]> = {},
): EdgeSpec[] {
  const seen = new Set<string>();
  const edges: EdgeSpec[] = [];
  for (const ref of (sourceSet.sources ?? []) as SourceRef[]) {
    if (!REGISTERED.has(ref.resource_type)) continue;
    const key = `${ref.resource_type}:${ref.resource_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const label = (names as Record<string, { label?: string } | undefined>)[sourceKey(ref)]?.label;
    edges.push({
      source: { type: "study_session" as never, id: session.id },
      target: { type: ref.resource_type as never, id: ref.resource_id },
      role: "source",
      orgId: session.organization_id ?? undefined,
      ...(label ? { label } : {}),
    });
  }
  return edges;
}

/** Write the session's lineage edges. Returns null when all landed (or none apply), else the failure. */
export async function recordPracticeLineage(
  session: PracticeLineageSession,
  sourceSet: SourceSet | undefined,
  names?: PracticeSource["sourceNames"],
): Promise<string | null> {
  if (!sourceSet) return null;
  const edges = practiceLineageEdges(session, sourceSet, names);
  if (edges.length === 0) return null;
  const res = await associationsHelpers.linkEdges(edges);
  if (res.ok) return null;
  const message = "error" in res ? String((res as { error: unknown }).error) : "unknown";
  console.error("[spoken-practice/lineage] source edges failed:", message);
  return message;
}
