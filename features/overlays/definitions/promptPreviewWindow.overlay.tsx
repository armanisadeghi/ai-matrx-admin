"use client";

/**
 * Opener for the `promptPreviewWindow` overlay.
 *
 * - `useOpenPromptPreviewWindow()` — imperative hook. Call to open with typed
 *   options; returns a handle with a `close()` method.
 * - `<PromptPreviewWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close.
 */

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "promptPreviewWindow" as const;

export interface OpenPromptPreviewWindowOptions {
  conversationId: string;
}

export interface PromptPreviewWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createPromptPreviewWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (opts: OpenPromptPreviewWindowOptions): PromptPreviewWindowHandle => {
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
  };
}

export function useOpenPromptPreviewWindow() {
  const store = useAppStore();
  return useMemo(() => createPromptPreviewWindowOpener(store), [store]);
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

export type PromptPreviewWindowDefinitionData = OpenPromptPreviewWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    promptPreviewWindow: OverlayWire<PromptPreviewWindowDefinitionData>;
  }
}
