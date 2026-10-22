"use client";

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "flashcardStudyWindow" as const;

export interface OpenFlashcardStudyWindowOptions {
  setId?: string | null;
  title?: string | null;
}

export interface FlashcardStudyWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenFlashcardStudyWindowOptions>(OVERLAY_ID, {
  data: (opts: OpenFlashcardStudyWindowOptions = {}) => ({
            setId: opts.setId ?? null,
            title: opts.title ?? null,
          }),
});

export const useOpenFlashcardStudyWindow = opener.useOpen;

export const FlashcardStudyWindowController = opener.Controller;

export type FlashcardStudyWindowDefinitionData = OpenFlashcardStudyWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    flashcardStudyWindow: OverlayWire<FlashcardStudyWindowDefinitionData>;
  }
}
