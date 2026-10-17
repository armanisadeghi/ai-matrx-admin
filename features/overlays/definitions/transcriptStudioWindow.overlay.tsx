"use client";

/**
 * Opener for the `transcriptStudioWindow` overlay.
 *
 * - `useOpenTranscriptStudioWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<TranscriptStudioWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "transcriptStudioWindow" as const;

export interface OpenTranscriptStudioWindowOptions {
  title?: string;
  activeSessionId?: string | null;
}

export interface TranscriptStudioWindowHandle {
  close: () => void;
}

export function useOpenTranscriptStudioWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenTranscriptStudioWindowOptions = {}): TranscriptStudioWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            title: opts.title,
            activeSessionId: opts.activeSessionId,
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
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export function TranscriptStudioWindowController(props: OpenTranscriptStudioWindowOptions): null {
  const open = useOpenTranscriptStudioWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.title, props.activeSessionId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type TranscriptStudioWindowDefinitionData = OpenTranscriptStudioWindowOptions;

export const transcriptStudioWindowOverlay = defineOverlay<TranscriptStudioWindowDefinitionData>()({
  id: "transcriptStudioWindow",
  label: "Transcript Studio Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { activeSessionId: null },
    windowId: "transcript-studio-window",
    mobile: "fullscreen",
    preservation: { dataKeys: ["activeSessionId"] },
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    transcriptStudioWindow: OverlayWire<TranscriptStudioWindowDefinitionData>;
  }
}
