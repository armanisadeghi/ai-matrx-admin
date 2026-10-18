"use client";

/**
 * Opener for the `promptPreviewWindow` overlay.
 *
 * - `useOpenPromptPreviewWindow()` — imperative hook. Call to open with typed
 *   options; returns a handle with a `close()` method.
 * - `<PromptPreviewWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "promptPreviewWindow" as const;

export interface OpenPromptPreviewWindowOptions {
  conversationId: string;
}

export interface PromptPreviewWindowHandle {
  close: () => void;
}

export function useOpenPromptPreviewWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenPromptPreviewWindowOptions): PromptPreviewWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            conversationId: opts.conversationId,
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

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount.
 */
export function PromptPreviewWindowController(
  props: OpenPromptPreviewWindowOptions,
): null {
  const open = useOpenPromptPreviewWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.conversationId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type PromptPreviewWindowDefinitionData = OpenPromptPreviewWindowOptions;

export const promptPreviewWindowOverlay = /* @__PURE__ */ defineOverlay<PromptPreviewWindowDefinitionData>()({
  id: "promptPreviewWindow",
  label: "Full Prompt Preview Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { conversationId: "" },
    windowId: "prompt-preview-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    promptPreviewWindow: OverlayWire<PromptPreviewWindowDefinitionData>;
  }
}
