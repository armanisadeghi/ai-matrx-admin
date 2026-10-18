"use client";

/**
 * Opener for the `flashcardItemWindow` overlay.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";

const OVERLAY_ID = "flashcardItemWindow" as const;

import type { ReviewResult } from "@/features/flashcards/types";
import type { FaceImageRef } from "@/components/mardown-display/blocks/flashcards/FlashcardFaceImage";
import type { OverlayWire } from "./overlay-types";

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

export function useOpenFlashcardItemWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenFlashcardItemWindowOptions = {}): FlashcardItemWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            front: opts.front ?? "",
            back: opts.back ?? null,
            index: opts.index ?? 0,
            layoutMode: opts.layoutMode ?? "grid",
            title: opts.title ?? null,
            additionalDetails: opts.additionalDetails ?? null,
            lastResult: opts.lastResult ?? null,
            frontImage: opts.frontImage ?? null,
            backImage: opts.backImage ?? null,
          },
        }),
      );
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
      };
    },
    [dispatch],
  );
}

export function FlashcardItemWindowController(
  props: OpenFlashcardItemWindowOptions,
): null {
  const open = useOpenFlashcardItemWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [
    open,
    props.front,
    props.back,
    props.index,
    props.layoutMode,
    props.title,
  ]);
  return null;
}

export type FlashcardItemWindowDefinitionData = OpenFlashcardItemWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    flashcardItemWindow: OverlayWire<FlashcardItemWindowDefinitionData>;
  }
}
