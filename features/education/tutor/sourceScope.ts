// features/education/tutor/sourceScope.ts
//
// "The tutor answers from the material you're studying" (NotebookLM's bar: a
// notebook answers from exactly its sources). A surface that opens the tutor
// names WHERE the learner is — `TutorGroundingSeed.studyContext` — and this
// module resolves that place to the exact Sources behind it:
//
//   kit (`scope`)                 → the kit's filed Sources (kitSource edges)
//   file / processed_document     → itself (it IS a Source; legacy anchor kits too)
//   deck / guide / note / map / quiz → its lineage (`readArtifactOrigins`)
//
// Each Source is mapped to the Knowledge index's (source_kind, source_id) so
// grounding can search ONLY those (`corpus: { mode: "explicit" }`). A context
// with no mappable Source resolves to an empty list and the caller falls back
// to the learner's whole library. A read failure THROWS — the caller says so;
// it never silently widens.

import { associationsService } from "@/features/scopes/service/associationsService";
import { peekHref } from "@/features/organizations/peek/peekHref";
import { supabase } from "@/utils/supabase/client";
import { docprocDb } from "@/utils/supabase/docprocDb";
import { readArtifactOrigins } from "@/features/education/convert/lineage";
import { KIT_TOKEN, kitSourcesFromEdges } from "@/features/education/kits/kitScope";
import type { GroundingSource } from "@/features/rag/api/grounding";

/** Where the tutor was opened from. Optional on the seed; omit = whole library. */
export interface TutorStudyContext {
  /** Canonical entity token: `scope` (a kit), `fc_set`, `note`, `study_media`, `assessment`, `file`… */
  entityType: string;
  entityId: string;
  /** The place's own name, for the strip ("Cell biology kit"). */
  title?: string;
}

/** One Source in play: what the strip shows and opens, plus its index key. */
export interface TutorScopedSource {
  entityType: string;
  entityId: string;
  title: string;
  href: string;
  grounding: GroundingSource;
}

/** A Source reference before it is mapped onto the index. */
export interface TutorSourceRef {
  entityType: string;
  entityId: string;
  title: string | null;
}

/** Tokens that are themselves a learner's Source, never something made from one. */
const SOURCE_TOKENS = new Set(["file", "cld_file", "processed_document"]);

/** The Sources a context points at (no index mapping yet). */
export async function sourceRefsForContext(
  context: TutorStudyContext,
): Promise<TutorSourceRef[]> {
  const { entityType, entityId } = context;
  if (entityType === KIT_TOKEN) {
    const res = await associationsService.listForEntity(KIT_TOKEN, entityId);
    if (!res.ok) {
      throw new Error("We couldn't read this kit's sources.", { cause: res.error });
    }
    return kitSourcesFromEdges(res.data.edges).map((s) => ({
      entityType: s.type,
      entityId: s.id,
      title: s.title,
    }));
  }
  if (SOURCE_TOKENS.has(entityType)) {
    return [{ entityType, entityId, title: context.title ?? null }];
  }
  const origins = await readArtifactOrigins(entityType, entityId, { failureMode: "throw" });
  return origins.map((o) => ({
    entityType: o.entityType,
    entityId: o.entityId,
    title: o.title,
  }));
}

interface ProcessedDocKey {
  id: string;
  name: string;
  source_kind: string;
  source_id: string;
}

/**
 * Map Source refs onto the Knowledge index's keys. A file is indexed as
 * `cld_file`, a note as `note`; a processed document carries its own
 * (source_kind, source_id). Anything else has no index identity and is dropped.
 */
export function mapRefsToScopedSources(
  refs: readonly TutorSourceRef[],
  processedDocs: ReadonlyMap<string, ProcessedDocKey>,
): TutorScopedSource[] {
  const seen = new Set<string>();
  const out: TutorScopedSource[] = [];
  for (const ref of refs) {
    const token = ref.entityType === "cld_file" ? "file" : ref.entityType;
    let grounding: GroundingSource | null = null;
    if (token === "file") {
      grounding = { sourceKind: "cld_file", sourceId: ref.entityId, title: ref.title ?? "File" };
    } else if (token === "note") {
      grounding = { sourceKind: "note", sourceId: ref.entityId, title: ref.title ?? "Note" };
    } else if (token === "processed_document") {
      const doc = processedDocs.get(ref.entityId);
      if (doc) {
        grounding = { sourceKind: doc.source_kind, sourceId: doc.source_id, title: ref.title ?? doc.name };
      }
    }
    if (!grounding) continue;
    const key = `${grounding.sourceKind}:${grounding.sourceId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      entityType: token,
      entityId: ref.entityId,
      title: grounding.title,
      href: peekHref(token, ref.entityId) ?? (token === "file" ? `/files/f/${ref.entityId}` : `/knowledge/sources/${ref.entityId}`),
      grounding,
    });
  }
  return out;
}

/** Resolve a study context to the exact Sources the tutor may search. */
export async function resolveTutorSourceScope(
  context: TutorStudyContext,
): Promise<TutorScopedSource[]> {
  const refs = await sourceRefsForContext(context);
  const docIds = refs.filter((r) => r.entityType === "processed_document").map((r) => r.entityId);
  const docs = new Map<string, ProcessedDocKey>();
  if (docIds.length) {
    const res = await docprocDb(supabase)
      .from("processed_documents")
      .select("id, name, source_kind, source_id")
      .in("id", docIds);
    if (res.error) {
      throw new Error("We couldn't read this material's sources.", { cause: res.error });
    }
    for (const row of res.data ?? []) docs.set(row.id, row);
  }
  return mapRefsToScopedSources(refs, docs);
}
