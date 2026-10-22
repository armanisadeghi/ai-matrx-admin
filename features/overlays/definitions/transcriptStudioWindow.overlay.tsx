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

import { useMemo } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { AppDispatch } from "@/lib/redux/store";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./app-opener";

const OVERLAY_ID = "transcriptStudioWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

export interface OpenTranscriptStudioWindowOptions {
  title?: string;
  activeSessionId?: string | null;
}

export interface TranscriptStudioWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createTranscriptStudioWindowOpener(store: { dispatch: AppDispatch }) {
  const dispatch = store.dispatch;
  return (opts: OpenTranscriptStudioWindowOptions = {}): TranscriptStudioWindowHandle => {
    opener.open(dispatch, { data: {
          title: opts.title,
          activeSessionId: opts.activeSessionId,
        } });
    return {
      close: () => dispatch(opener.close()),
    };
  };
}

export function useOpenTranscriptStudioWindow() {
  const dispatch = useAppDispatch();
  return useMemo(() => createTranscriptStudioWindowOpener({ dispatch }), [dispatch]);
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const TranscriptStudioWindowController = hookController<OpenTranscriptStudioWindowOptions>(useOpenTranscriptStudioWindow);

export type TranscriptStudioWindowDefinitionData = OpenTranscriptStudioWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    transcriptStudioWindow: OverlayWire<TranscriptStudioWindowDefinitionData>;
  }
}
