"use client";

/**
 * Opener for the `flashcardItemWindow` overlay.
 */

const OVERLAY_ID = "flashcardItemWindow" as const;
import type { ReviewResult } from "@/features/flashcards/types";
import type { FaceImageRef } from "@/components/mardown-display/blocks/flashcards/FlashcardFaceImage";
import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

export interface OpenFlashcardItemWindowOptions {
  front?: string;
  back?: string | null;
  index?: number;
  layoutMode?: "grid" | "list";
  title?: string;
  additionalDetails?: Record<string, unknown> | null;
  lastResult?: ReviewResult | null;
  frontImage?: FaceImageRef | null;
  backImage?: FaceImageRef | null;
}

export interface FlashcardItemWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenFlashcardItemWindowOptions>(OVERLAY_ID, {
  data: (opts: OpenFlashcardItemWindowOptions = {}) => ({
            front: opts.front ?? "",
            back: opts.back ?? null,
            index: opts.index ?? 0,
            layoutMode: opts.layoutMode ?? "grid",
            title: opts.title ?? null,
            additionalDetails: opts.additionalDetails ?? null,
            lastResult: opts.lastResult ?? null,
            frontImage: opts.frontImage ?? null,
            backImage: opts.backImage ?? null,
          }),
});

export const useOpenFlashcardItemWindow = opener.useOpen;

export const FlashcardItemWindowController = opener.Controller;

export type FlashcardItemWindowDefinitionData = OpenFlashcardItemWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    flashcardItemWindow: OverlayWire<FlashcardItemWindowDefinitionData>;
  }
}
