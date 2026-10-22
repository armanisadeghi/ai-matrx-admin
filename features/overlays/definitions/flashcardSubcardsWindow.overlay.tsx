"use client";

/**
 * Opener for the `flashcardSubcardsWindow` overlay.
 */

import type { FlashcardSubcard } from "@/components/mardown-display/blocks/flashcards/flashcard-subcards";
import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "flashcardSubcardsWindow" as const;

export interface OpenFlashcardSubcardsWindowOptions {
  subcards?: FlashcardSubcard[];
  title?: string;
  parentFront?: string;
}

export interface FlashcardSubcardsWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenFlashcardSubcardsWindowOptions>(OVERLAY_ID, {
  data: (opts: OpenFlashcardSubcardsWindowOptions = {}) => ({
            subcards: opts.subcards ?? [],
            title: opts.title ?? null,
            parentFront: opts.parentFront ?? null,
          }),
});

export const useOpenFlashcardSubcardsWindow = opener.useOpen;

export const FlashcardSubcardsWindowController = opener.Controller;

export type FlashcardSubcardsWindowDefinitionData = OpenFlashcardSubcardsWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    flashcardSubcardsWindow: OverlayWire<FlashcardSubcardsWindowDefinitionData>;
  }
}
