// features/education/spoken-practice/data/practiceSources.ts
//
// The Sources a practice session is built on, turned from the server's
// `POST /sources/resolve` answer into what the session designer reads. The
// reading is the server's (a deck's cards, a page's clean text, pasted text);
// this module only joins the texts and reports a cut the server made. Pure — no I/O.

import type { ResolvedSourceSet, SourceSet } from "@ai-matrx/agents/sources";
import { lineageSourcesOf } from "@/features/flashcards/data/generateDeckFromSources";
import { namerFloorOf } from "@/features/education/create/groundedMaterial";
import type { ConvertSource } from "@/features/education/convert/types";
import type { PracticeSource } from "../types";

/**
 * The lineage anchors of the Sources the session was built on, for the ONE lineage
 * writer (`convert/recordSourceLineage.ts`). The anchors are the shared Education rule
 * (`lineageSourcesOf`): pasted text, web pages and YouTube land as `processed_document`,
 * a stored file as `file`, every other Source as its own token. There is no list of
 * kinds here: which `study_session -> <kind>` pairs exist is the registry's answer at
 * write time, and a pair it refuses comes back as a failed edge the screen announces
 * with Retry (`announceLineage`) — never a Source silently left out.
 */
export function practiceLineageSources(resolved: ResolvedSourceSet): ConvertSource[] {
  const readable = { ...resolved, sources: resolved.sources.filter((s) => s.text.trim()) };
  const seen = new Set<string>();
  return lineageSourcesOf(readable).filter((anchor) => {
    const key = `${anchor.ref?.fileId ? "file" : anchor.ref?.entityType}:${anchor.ref?.fileId ?? anchor.ref?.entityId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

/**
 * The session's grounding source. A chosen deck is recorded on the session as
 * its set (`study_session.source_set_id`, as before); everything else is a topic
 * source. The chosen `SourceSet` rides along as the session's lineage.
 */
export function practiceSourceFromResolved(
  resolved: ResolvedSourceSet,
  chosen: SourceSet,
  names: NonNullable<PracticeSource["sourceNames"]>,
  /** THE kit namer's title (`nameFromSources`); its floor is the first readable Source's name. */
  title: string = namerFloorOf(resolved.sources),
): { source: PracticeSource | null; cut: boolean } {
  const { material, cut } = practiceMaterialFromResolved(resolved);
  if (!material) return { source: null, cut: false };
  const deckIds = resolved.sources
    .filter((s) => s.ref.resource_type === "fc_set" && s.text.trim())
    .map((s) => s.ref.resource_id);
  return {
    cut,
    source: {
      kind: deckIds.length > 0 ? "set" : "topic",
      setId: deckIds[0],
      title,
      material,
      sourceSet: chosen,
      sourceNames: names,
      lineageSources: practiceLineageSources(resolved),
    },
  };
}
