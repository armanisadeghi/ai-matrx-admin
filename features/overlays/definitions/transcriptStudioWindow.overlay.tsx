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

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "transcriptStudioWindow" as const;

export interface OpenTranscriptStudioWindowOptions {
  title?: string;
  activeSessionId?: string | null;
}

export interface TranscriptStudioWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createTranscriptStudioWindowOpener(store: Pick<AppStore, "dispatch">) {
  const dispatch = store.dispatch;
  return (opts: OpenTranscriptStudioWindowOptions = {}): TranscriptStudioWindowHandle => {
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
  };
}

export function useOpenTranscriptStudioWindow() {
  const store = useAppStore();
  return useMemo(() => createTranscriptStudioWindowOpener(store), [store]);
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

export type TranscriptStudioWindowDefinitionData = OpenTranscriptStudioWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    transcriptStudioWindow: OverlayWire<TranscriptStudioWindowDefinitionData>;
  }
}
