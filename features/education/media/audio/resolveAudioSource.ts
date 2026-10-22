// features/education/media/audio/resolveAudioSource.ts
//
// What audio study still needs beside the one Source input: a typed topic as a source
// (`resolveTopicAudioSource`, honestly `inferred`) and the "spend extra time on these"
// note read from the FSRS study spine for adaptive audio (`weakAreaNoteForDecks`). A deck
// or any picked Source is read on the SERVER through the Source input — never here.

"use client";

import { fcService } from "@/features/flashcards/data/fcService";
import { studyService } from "@/features/education/study/service/studyService";
import type { TrustEnvelope } from "@/features/education/trust/types";
import type { EduMediaSource } from "../types";

export interface ResolvedAudioSource {
  content: string;
  source: EduMediaSource;
  trust: TrustEnvelope;
  weakAreaNote: string | null;
  truncated: boolean;
}

/** Build the "spend extra time on these" note from the deck's weakest cards. */
async function computeWeakAreaNote(
  deckCardIds: string[],
  frontById: Map<string, string>,
): Promise<string | null> {
  const res = await studyService.listWeakest("fc_card");
  if (res.error || !res.data?.length) return null;
  const deckSet = new Set(deckCardIds);
  const weakFronts = res.data
    .filter((m) => m.item_id && deckSet.has(m.item_id))
    .map((m) => frontById.get(m.item_id as string))
    .filter((f): f is string => Boolean(f))
    .slice(0, 8)
    .map((f) => f.replace(/\s+/g, " ").trim().slice(0, 80));
  if (weakFronts.length === 0) return null;
  return weakFronts.join("; ");
}

/**
 * The "spend extra time on these" note for decks already read through the Source
 * input (their text came from the server, so no card text is re-serialized here).
 * Null when the listener has no weak items in them.
 */
export async function weakAreaNoteForDecks(deckIds: readonly string[]): Promise<string | null> {
  const notes: string[] = [];
  for (const id of deckIds) {
    const res = await fcService.getDeckWithCards(id);
    if (res.error || !res.data) continue;
    const { cards } = res.data;
    const note = await computeWeakAreaNote(
      cards.map((c) => c.id),
      new Map(cards.map((c) => [c.id, c.front])),
    );
    if (note) notes.push(note);
  }
  return notes.length ? notes.join("; ") : null;
}

export function resolveTopicAudioSource(topic: string): ResolvedAudioSource {
  const clean = topic.trim();
  return {
    content: clean,
    source: { kind: "topic", id: null, title: clean.slice(0, 120) },
    // A free-text topic is NOT grounded in the learner's own material — say so
    // honestly (P0). The audio is reasoned from general knowledge about the topic.
    trust: {
      citations: [],
      confidence: "inferred",
      groundedIn: undefined,
    },
    weakAreaNote: null,
    truncated: false,
  };
}
