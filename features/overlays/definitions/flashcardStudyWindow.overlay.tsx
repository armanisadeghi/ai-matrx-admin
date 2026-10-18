"use client";

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "flashcardStudyWindow" as const;

export interface OpenFlashcardStudyWindowOptions {
  setId?: string | null;
  title?: string | null;
}

export interface FlashcardStudyWindowHandle {
  close: () => void;
}

export function useOpenFlashcardStudyWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (
      opts: OpenFlashcardStudyWindowOptions = {},
    ): FlashcardStudyWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            setId: opts.setId ?? null,
            title: opts.title ?? null,
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

export function FlashcardStudyWindowController(
  props: OpenFlashcardStudyWindowOptions,
): null {
  const open = useOpenFlashcardStudyWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.setId, props.title]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type FlashcardStudyWindowDefinitionData = OpenFlashcardStudyWindowOptions;

export const flashcardStudyWindowOverlay = /* @__PURE__ */ defineOverlay<FlashcardStudyWindowDefinitionData>()({
  id: "flashcardStudyWindow",
  label: "Flashcard Study Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { setId: null, title: null },
    windowId: "flashcard-study-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    flashcardStudyWindow: OverlayWire<FlashcardStudyWindowDefinitionData>;
  }
}
