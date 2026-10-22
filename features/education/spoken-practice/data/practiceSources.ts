// features/education/spoken-practice/data/practiceSources.ts
//
// The Sources a practice session is built on, turned from the server's
// `POST /sources/resolve` answer into what the session designer reads. The
// reading is the server's (a deck's cards, a page's clean text, pasted text);
// this module only joins the texts and reports a cut the server made. Pure — no I/O.

import type { ResolvedSourceSet, SourceSet } from "@ai-matrx/agents/sources";
import { lineageSourceOf } from "@/features/flashcards/data/generateDeckFromSources";
import type { ConvertSource } from "@/features/education/convert/types";
import type { PracticeSource } from "../types";

/** Every Source kind (registry token) a `study_session -> <kind>` pair is registered for. */
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

/**
 * The lineage anchors of the Sources the session was built on, for the ONE lineage
 * writer (`convert/recordSourceLineage.ts`). A Source whose kind has no registered
 * `study_session` pair is left out rather than failing the whole write.
 */
export function practiceLineageSources(resolved: ResolvedSourceSet): ConvertSource[] {
  const seen = new Set<string>();
  const out: ConvertSource[] = [];
  for (const s of resolved.sources) {
    if (!s.text.trim()) continue;
    const anchor = lineageSourceOf(s);
    const type = anchor.ref?.fileId ? "file" : anchor.ref?.entityType;
    const id = anchor.ref?.fileId ?? anchor.ref?.entityId;
    if (!type || !id || !REGISTERED.has(type)) continue;
    const key = `${type}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(anchor);
  }
  return out;
}

export interface PracticeMaterial {
  material: string;
  /** True when the server cut a Source to the size the person chose in the review. */
  cut: boolean;
  /** Labels of the Sources that carried text. */
  labels: string[];
}

/**
 * Join the resolved texts, each under its own heading. Nothing is cut here: the
 * server already resolved the Sources inside the designer model's context window
 * (a Source that did not fit comes back in `dropped`, and a Source cut to the size
 * the person chose in the review comes back `truncated`), and `cut` reports that.
 */
export function practiceMaterialFromResolved(resolved: ResolvedSourceSet): PracticeMaterial {
  const readable = resolved.sources.filter((s) => s.text.trim().length > 0);
  const blocks = readable.map((s) => `## ${s.label}\n${s.text.trim()}`);
  return {
    material: blocks.join("\n\n"),
    cut: readable.some((s) => s.truncated),
    labels: readable.map((s) => s.label),
  };
}

/** A short title for what the session is grounded in. */
export function practiceSourceTitle(labels: readonly string[], onlyDeck: boolean): string {
  if (labels.length === 0) return "your sources";
  if (onlyDeck && labels.length === 1) return `${labels[0]} deck`;
  if (labels.length <= 2) return labels.join(" and ");
  return `${labels[0]}, ${labels[1]} and ${labels.length - 2} more`;
}

/**
 * The session's grounding source. A chosen deck is recorded on the session as
 * its set (`study_session.source_set_id`, as before); everything else is a topic
 * source. The chosen `SourceSet` rides along as the session's lineage.
 */
export function practiceSourceFromResolved(
  resolved: ResolvedSourceSet,
  chosen: SourceSet,
  names: NonNullable<PracticeSource["sourceNames"]>,
): { source: PracticeSource | null; cut: boolean } {
  const { material, cut, labels } = practiceMaterialFromResolved(resolved);
  if (!material) return { source: null, cut: false };
  const deckIds = resolved.sources
    .filter((s) => s.ref.resource_type === "fc_set" && s.text.trim())
    .map((s) => s.ref.resource_id);
  const onlyDeck = deckIds.length > 0 && deckIds.length === labels.length;
  return {
    cut,
    source: {
      kind: deckIds.length > 0 ? "set" : "topic",
      setId: deckIds[0],
      title: practiceSourceTitle(labels, onlyDeck),
      material,
      sourceSet: chosen,
      sourceNames: names,
      lineageSources: practiceLineageSources(resolved),
    },
  };
}
