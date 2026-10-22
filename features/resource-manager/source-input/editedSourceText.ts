/**
 * A person's edit of the text their Sources gave becomes a Source of its own.
 *
 * `useResolvedSourceText` shows the server's reading in a box the person may
 * correct. When they do, the corrected text is landed through the Source
 * Convergence door (`POST /sources/land`, as pasted text, via
 * `buildPastedTextLanding`) and the generation request carries a SourceSet that
 * points at THAT Source — never the text itself. The server then reads once
 * (the edited Source), its `truncated` notice is about the text actually used,
 * and lineage names the edited Source plus every Source it was made from
 * (`editedFrom`, pointers only, never read).
 *
 * Landing is deduped by content (`pasted-text:<sha256>`), so pressing Generate
 * twice with the same edit reuses one Source.
 */

import type { ResolvedSourceSet, SourceSet } from "@ai-matrx/agents/sources";
import { createSourceRef } from "@ai-matrx/agents/sources";
import { buildPastedTextLanding } from "@/features/sources/api/pastedText";
import { landSource, type LandedSource } from "@/features/sources/api/sourcesApi";

/** One Source an edit was made from — linked to what is made, never read. */
export interface EditedFromSource {
  resource_type: string;
  resource_id: string;
  label: string;
}

export interface EditedSourceText {
  /** The picked set with its Sources replaced by the one edited Source. */
  sourceSet: SourceSet;
  /** The readable Sources the edit was made from, in pick order. */
  editedFrom: EditedFromSource[];
  landed: LandedSource;
}

/** The name an edit is filed under: the first readable Source's own name, marked edited. */
export function editedSourceName(resolved: ResolvedSourceSet): string {
  const first = resolved.sources.find((s) => s.text.trim())?.label.trim();
  return `${first || "Your sources"} (edited)`;
}

/** The Sources behind the box, as lineage pointers (registry tokens). */
export function editedFromOf(resolved: ResolvedSourceSet): EditedFromSource[] {
  const seen = new Set<string>();
  const out: EditedFromSource[] = [];
  for (const s of resolved.sources) {
    if (!s.text.trim()) continue;
    const resource_type = s.ref.resource_type === "cld_file" ? "file" : s.ref.resource_type;
    const key = `${resource_type}:${s.ref.resource_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ resource_type, resource_id: s.ref.resource_id, label: s.label.trim() || "Source" });
  }
  return out;
}

/** Land the edited text and answer the SourceSet that uses it. Throws the door's refusal. */
export async function landEditedSourceText(input: {
  text: string;
  /** The set the box was read from (its grounding and model budget are kept). */
  from: SourceSet;
  /** The server's reading behind the box. */
  resolved: ResolvedSourceSet;
  organizationId: string;
  userId: string;
}): Promise<EditedSourceText> {
  const body = await buildPastedTextLanding({
    text: input.text,
    name: editedSourceName(input.resolved),
    organizationId: input.organizationId,
    userId: input.userId,
  });
  // The person wrote this text: it is already the clean version to read.
  const landed = await landSource({ ...body, content_already_clean: true });
  return {
    sourceSet: {
      ...input.from,
      sources: [createSourceRef("processed_document", landed.processed_document_id, { delivery: "direct" })],
    },
    editedFrom: editedFromOf(input.resolved),
    landed,
  };
}
