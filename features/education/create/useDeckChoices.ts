"use client";

// features/education/create/useDeckChoices.ts
//
// The learner's decks, for what an AGENT is offered on an Education create page
// (`available_decks` in the surface scope, the `deck_id` a write target may
// stage). Read on demand — the first time the scope or a write target asks —
// never on every page load: the page itself never needs the list (Use existing
// lists decks for the learner; a deck in the link is read by id in
// `useEducationSources`). React Compiler is on: no manual memo.

import { useRef, useState } from "react";
import { fcService } from "@/features/flashcards/data/fcService";

export interface DeckChoice {
  id: string;
  name: string;
}

export function useDeckChoices() {
  const [decks, setDecks] = useState<DeckChoice[] | null>(null);
  const reading = useRef<Promise<DeckChoice[]> | null>(null);
  /** Read the list once (later calls share the same read). */
  const load = (): Promise<DeckChoice[]> => {
    if (!reading.current) {
      reading.current = fcService.listDecks().then((res) => {
        const list = (res.data ?? []).map((d) => ({ id: d.id, name: d.name }));
        setDecks(list);
        return list;
      }).catch(() => {
        // A failed read is asked again next time, never remembered as "no decks".
        reading.current = null;
        return [];
      });
    }
    return reading.current;
  };
  return {
    /** What has been read so far ([] until the first ask lands). */
    decks: decks ?? [],
    /** False until the list has been read. */
    loaded: decks !== null,
    load,
  };
}
