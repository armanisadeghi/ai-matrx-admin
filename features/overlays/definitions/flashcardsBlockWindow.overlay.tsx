"use client";

/**
 * Opener for the `flashcardsBlockWindow` overlay.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import type { FlashcardsBlockData } from "@ai-matrx/agents/generated/stream-events";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "flashcardsBlockWindow" as const;

export interface OpenFlashcardsBlockWindowOptions {
  content?: string | null;
  serverData?: FlashcardsBlockData | null;
  title?: string;
  additionalDetails?: Record<string, unknown> | null;
  taskId?: string | null;
  artifactId?: string | null;
  messageId?: string | null;
  conversationId?: string | null;
  blockIndex?: number | null;
}

export interface FlashcardsBlockWindowHandle {
  close: () => void;
}

export function useOpenFlashcardsBlockWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (
      opts: OpenFlashcardsBlockWindowOptions = {},
    ): FlashcardsBlockWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            content: opts.content ?? null,
            serverData: opts.serverData ?? null,
            title: opts.title ?? null,
            additionalDetails: opts.additionalDetails ?? null,
            taskId: opts.taskId ?? null,
            artifactId: opts.artifactId ?? null,
            messageId: opts.messageId ?? null,
            conversationId: opts.conversationId ?? null,
            blockIndex: opts.blockIndex ?? null,
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

export function FlashcardsBlockWindowController(
  props: OpenFlashcardsBlockWindowOptions,
): null {
  const open = useOpenFlashcardsBlockWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.content, props.serverData, props.title]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type FlashcardsBlockWindowDefinitionData = OpenFlashcardsBlockWindowOptions;

export const flashcardsBlockWindowOverlay = defineOverlay<FlashcardsBlockWindowDefinitionData>()({
  id: "flashcardsBlockWindow",
  label: "Flashcards Block Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          content: null,
          serverData: null,
          title: null,
          additionalDetails: null,
          taskId: null,
          artifactId: null,
          messageId: null,
          conversationId: null,
          blockIndex: null,
        },
    windowId: "flashcards-block-window",
    mobile: "fullscreen",
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    flashcardsBlockWindow: OverlayWire<FlashcardsBlockWindowDefinitionData>;
  }
}
