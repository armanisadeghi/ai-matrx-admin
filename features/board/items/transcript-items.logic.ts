/**
 * The pure half of the board's Transcript item (`transcript-items.tsx`).
 * Saved form `{ kind: "entity", entity: "transcript", id }` — a reference, never a copy.
 */

import type { NodeSource } from "../board/document";

export const TRANSCRIPT_ITEM_KEY = "transcript";
export const NEW_TRANSCRIPT_TITLE = "New transcript";

export function transcriptSource(id: string | null): NodeSource {
  return { kind: "entity", entity: TRANSCRIPT_ITEM_KEY, id };
}

export function transcriptIdOf(source: NodeSource): string | null {
  return source.kind === "entity" && source.entity === TRANSCRIPT_ITEM_KEY ? source.id : null;
}

export const transcriptHref = (id: string) => `/transcripts/processor?focus=${encodeURIComponent(id)}`;
