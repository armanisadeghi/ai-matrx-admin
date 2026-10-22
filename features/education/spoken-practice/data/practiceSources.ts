// features/education/spoken-practice/data/practiceSources.ts
//
// The Sources a practice session is built on, turned from the server's
// `POST /sources/resolve` answer into what the session designer reads. The
// reading is the server's (a deck's cards, a page's clean text, pasted text);
// this module only joins the texts under a size budget and says so when it had
// to cut. Pure — no I/O.

import type { ResolvedSourceSet, SourceSet } from "@ai-matrx/agents/sources";
import type { PracticeSource } from "../types";

/** Most grounding text one session sends the designer. */
export const MAX_PRACTICE_MATERIAL_CHARS = 60_000;

export interface PracticeMaterial {
  material: string;
  /** True when a Source was cut to fit the budget. */
  cut: boolean;
  /** Labels of the Sources that carried text. */
  labels: string[];
}

/**
 * Join the resolved texts, each under its own heading. Over budget, every
 * Source gets an equal share of what is left (a short one gives its unused
 * share back), so one long Source cannot push the others out.
 */
export function practiceMaterialFromResolved(
  resolved: ResolvedSourceSet,
  maxChars: number = MAX_PRACTICE_MATERIAL_CHARS,
): PracticeMaterial {
  const readable = resolved.sources.filter((s) => s.text.trim().length > 0);
  const order = readable
    .map((s, i) => ({ i, len: s.text.trim().length }))
    .sort((a, b) => a.len - b.len);
  const share = new Map<number, number>();
  let left = maxChars;
  order.forEach((entry, n) => {
    const give = Math.min(entry.len, Math.floor(left / (order.length - n)));
    share.set(entry.i, give);
    left -= give;
  });
  let cut = false;
  const blocks = readable.map((s, i) => {
    const text = s.text.trim();
    const allowed = share.get(i) ?? 0;
    const body = text.length > allowed ? ((cut = true), text.slice(0, allowed)) : text;
    return `## ${s.label}\n${body}`;
  });
  return { material: blocks.join("\n\n"), cut, labels: readable.map((s) => s.label) };
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
  maxChars: number = MAX_PRACTICE_MATERIAL_CHARS,
): { source: PracticeSource | null; cut: boolean } {
  const { material, cut, labels } = practiceMaterialFromResolved(resolved, maxChars);
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
    },
  };
}
