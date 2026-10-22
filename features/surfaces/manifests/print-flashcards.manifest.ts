/**
 * Surface manifest — Flashcard decks (`/print/flashcards`).
 *
 * A deck shown card by card with the printer's layouts; printing goes through
 * the print options dialog, which stays the person's. Read-only: the page has
 * no field an agent could set. Emitter: `features/print/sections/FlashcardsSection.tsx`.
 */

import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import { buildPrintToolManifest, printShown } from "@/features/print/surfaces/print-tool-surface";

export const PRINT_FLASHCARDS_SURFACE_NAME = "matrx-user/print-flashcards" as const;

export const printFlashcardsManifest = buildPrintToolManifest({
  surfaceName: PRINT_FLASHCARDS_SURFACE_NAME,
  label: "Flashcard decks",
  urlPattern: "/print/flashcards",
  description: "Prints a flashcard deck as cut-apart cards, duplex-mirrored or stacked.",
  situation: 'They are printing the flashcard deck "{deck_title|}" ({card_count|} cards).',
  formLabel: "Deck",
  fields: [],
  shown: [
    printShown("deck_title", "Deck", "string", "The deck's title."),
    printShown("card_count", "Cards", "number", "How many cards the deck has."),
    printShown("cards", "Cards list", "array", "Every card: { front, back }.", { typicalCharCount: 1200 }),
    printShown("layouts", "Layouts", "array", "The printer's layouts: { id, label, description }.", { typicalCharCount: 400 }),
  ],
});

export function createPrintFlashcardsScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
