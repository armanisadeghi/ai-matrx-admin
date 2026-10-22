// features/education/assessment/data/generationSource.ts
//
// What a quiz / practice test is generated from — pure, no hooks. A topic runs
// the topic mandate; everything else is a SourceSet resolved on the server.

import {
  createSourceRef,
  createSourceSet,
  type ResolvedSourceSet,
  type SourceSet,
} from "@ai-matrx/agents/sources";

export type GenerationSource =
  | { mode: "topic"; topic: string }
  | {
      mode: "sources";
      /** Pointers only — what the person picked, exactly as chosen (parts, form). */
      sources: SourceSet;
      /** A topic typed beside the Sources narrows them ("Focus on: …"). */
      topic?: string;
      /** The picking surface's own resolve (names each Source as its card did). */
      resolve?: () => Promise<ResolvedSourceSet>;
    }
  /** Agent-target shorthands: each is a one-Source set through the same door. */
  | { mode: "deck"; deck: { id: string; name: string } }
  | { mode: "document"; document: { id: string; name: string } };

/** A deck / document shorthand as the one-Source set it stands for. */
export function asSourceSet(source: GenerationSource): SourceSet | null {
  if (source.mode === "sources") return source.sources;
  if (source.mode === "deck") return createSourceSet([createSourceRef("fc_set", source.deck.id)]);
  if (source.mode === "document")
    return createSourceSet([createSourceRef("processed_document", source.document.id)]);
  return null;
}

