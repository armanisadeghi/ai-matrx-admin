// features/education/create/generationSourceWrite.ts
//
// The `generation_source` write target of the mind-map and memory Create
// surfaces (the agent stages WHERE it is made from; the learner still presses
// Make). Held once: the two pages carried the same 70-line validator. It
// validates FIRST and THROWS on a bad shape (the writeback seam turns a throw
// into an error envelope the agent reads); no setter fires until every check
// has passed. A topic is staged into the Source input's topic; a deck is picked
// through the same door as Use existing.

import {
  MEDIA_GENERATOR_SOURCE_KINDS,
  isMediaGeneratorSourceKind,
} from "@/features/education/media/types";

export interface GenerationSourceWriteOptions {
  /** "a mind map" / "memory aids" — named in refusals. */
  what: string;
  isBusy: boolean;
  decks: ReadonlyArray<{ id: string; name: string }>;
  topicMin: number;
  topicMax: number;
  setTopic: (topic: string) => void;
  pickDeck: (deck: { id: string; name: string }) => void;
}

export function generationSourceWrite(opts: GenerationSourceWriteOptions) {
  return (value: unknown) => {
    if (opts.isBusy)
      throw new Error(
        `generation_source refused — ${opts.what} is being generated right now. Wait for the run to finish before changing the source.`,
      );
    if (typeof value !== "object" || value === null || Array.isArray(value))
      throw new Error(
        'generation_source expects an OBJECT like { source_kind?: "deck" | "topic", topic?: string, deck_id?: string }.',
      );
    const patch = value as Record<string, unknown>;
    const allowed = ["source_kind", "topic", "deck_id"];
    const unknownKeys = Object.keys(patch).filter((k) => !allowed.includes(k));
    if (unknownKeys.length > 0)
      throw new Error(
        `generation_source rejected — unsupported field(s): ${unknownKeys.join(", ")}. It accepts only ${allowed.join(", ")}. The focus angle has its own target, generation_focus.`,
      );

    const hasKind = patch.source_kind !== undefined;
    const hasTopic = patch.topic !== undefined;
    const hasDeck = patch.deck_id !== undefined;
    if (!hasKind && !hasTopic && !hasDeck)
      throw new Error(`generation_source needs at least one of ${allowed.join(", ")}.`);
    // topic and deck_id are two ALTERNATIVE sources — a value naming both is
    // contradictory rather than something to silently pick a winner from.
    if (hasTopic && hasDeck)
      throw new Error("generation_source rejected — topic and deck_id are alternative sources; send one, not both.");

    let kind: string | null = null;
    if (hasKind) {
      if (typeof patch.source_kind !== "string" || !isMediaGeneratorSourceKind(patch.source_kind))
        throw new Error(
          `generation_source.source_kind expects exactly one of: ${MEDIA_GENERATOR_SOURCE_KINDS.join(", ")}.`,
        );
      kind = patch.source_kind;
    }

    let nextTopic: string | null = null;
    if (hasTopic) {
      if (typeof patch.topic !== "string") throw new Error("generation_source.topic expects a plain text string.");
      const trimmed = patch.topic.trim();
      if (trimmed.length < opts.topicMin || trimmed.length > opts.topicMax)
        throw new Error(
          `generation_source.topic expects ${opts.topicMin}-${opts.topicMax} characters after trimming (got ${trimmed.length}).`,
        );
      if (kind === "deck")
        throw new Error(
          'generation_source rejected — a topic cannot be the source while source_kind is "deck". Send the topic on its own, or send deck_id instead.',
        );
      nextTopic = trimmed;
    }

    let nextDeck: { id: string; name: string } | null = null;
    if (hasDeck) {
      if (typeof patch.deck_id !== "string" || !patch.deck_id.trim())
        throw new Error("generation_source.deck_id expects a non-empty deck id string from available_decks.");
      if (kind === "topic")
        throw new Error(
          'generation_source rejected — a deck cannot be the source while source_kind is "topic". Send deck_id on its own, or send topic instead.',
        );
      if (opts.decks.length === 0)
        throw new Error(
          "generation_source.deck_id rejected — the learner has no flashcard decks, so only a topic can work here.",
        );
      const match = opts.decks.find((d) => d.id === patch.deck_id);
      if (!match)
        throw new Error(
          `generation_source.deck_id ${JSON.stringify(patch.deck_id)} is not one of the learner's decks. Read available_decks and use an \`id\` from it.`,
        );
      nextDeck = match;
    }

    // Every check passed — now stage. `source_kind` alone changes nothing: the
    // Source input has no mode to flip, it holds whatever is picked.
    if (nextTopic !== null) opts.setTopic(nextTopic);
    if (nextDeck !== null) opts.pickDeck(nextDeck);
  };
}
