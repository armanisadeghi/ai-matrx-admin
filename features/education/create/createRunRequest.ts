// features/education/create/createRunRequest.ts
//
// What one Education create run asked for, as the JSON `useTabBoundRun` keeps
// on the device: the Sources exactly as chosen (the frozen shape a deck records,
// `deckSourceSetPatch`), the topic, and the page's own style answers. A run that
// stopped with its page is offered again with the SAME request. Flashcards and
// quizzes keep `cardRunRequest` (it also carries Add more cards); every other
// create page uses this. Pure.

import type { SourceSet } from "@ai-matrx/agents/sources";
import type { SourceDraft } from "@ai-matrx/agents/sources/runtime";
import {
  deckDraftsFromMetadata,
  deckSourceSetPatch,
  type DeckSourceName,
} from "@/features/flashcards/data/deckSourceSet";

export interface StudyRunRequest<S> {
  topic: string;
  drafts: SourceDraft[];
  /** The page's Style and details answers (its own restore read them back). */
  style: S;
}

export function studyRunRequest(
  sourceSet: SourceSet,
  names: Record<string, DeckSourceName>,
  topic: string,
  style: object,
): Record<string, unknown> {
  return {
    topic,
    style: JSON.parse(JSON.stringify(style)) as Record<string, unknown>,
    ...deckSourceSetPatch(sourceSet, names),
  };
}

/**
 * The stored request back through the page's own style restore, or null when it
 * is not one we can repeat: no Sources and no topic (unless the page's subject
 * is one of its style answers — oral practice's focus — `subjectInStyle`).
 */
export function restoreStudyRunRequest<S>(
  restoreStyle: (data: Record<string, unknown>) => { values: S },
  opts: { subjectInStyle?: boolean } = {},
): (data: Record<string, unknown>) => StudyRunRequest<S> | null {
  return (data) => {
    const topic = typeof data.topic === "string" ? data.topic : "";
    const drafts = deckDraftsFromMetadata(data) ?? [];
    const raw = data.style;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    if (drafts.length === 0 && !topic.trim() && !opts.subjectInStyle) return null;
    return { topic, drafts, style: restoreStyle(raw as Record<string, unknown>).values };
  };
}
