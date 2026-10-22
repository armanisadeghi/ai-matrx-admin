"use client";

/**
 * The Swipe view's logic editor (records-ui `deckLogicEditor` slot) — ONE front door.
 *
 * `@ai-matrx/rich-content/swipe-deck-logic` pulls the diagram canvas, so it loads only when a person opens the
 * editor (records-ui renders the slot on that action, never on mount). One `dynamic(ssr:false)` edge, no others
 * on this path (code-splitting rule 3); its props are records-ui's `DeckLogicEditorProps` exactly.
 */

import dynamic from "next/dynamic";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";

export const DeckLogicEditor = dynamic(() => import("@ai-matrx/rich-content/swipe-deck-logic").then((m) => m.SwipeDeckLogicEditor), {
  ssr: false,
  loading: () => <RegionSkeleton shape="cards" count={1} aria-label="Loading the logic editor" />,
});
