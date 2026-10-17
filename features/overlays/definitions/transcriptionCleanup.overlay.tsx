"use client";

/**
 * Opener for the `transcriptionCleanup` overlay.
 *
 * - `useOpenTranscriptionCleanup()` — imperative hook. Call to open with typed
 *   options; returns a handle with a `close()` method.
 * - `<TranscriptionCleanupController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "transcriptionCleanup" as const;

export interface OpenTranscriptionCleanupOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
}

export interface TranscriptionCleanupHandle {
  instanceId: string;
  close: () => void;
}

export function useOpenTranscriptionCleanup() {
  const dispatch = useAppDispatch();
  return useCallback(
    (
      opts: OpenTranscriptionCleanupOptions = {},
    ): TranscriptionCleanupHandle => {
      const instanceId =
        opts.instanceId ??
        `transcriptionCleanup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          instanceId,
          data: {},
        }),
      );
      return {
        instanceId,
        close: () =>
          dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId })),
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
export function TranscriptionCleanupController(
  props: OpenTranscriptionCleanupOptions,
): null {
  const open = useOpenTranscriptionCleanup();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type TranscriptionCleanupDefinitionData = OpenTranscriptionCleanupOptions;

export const transcriptionCleanupOverlay = /* @__PURE__ */ defineOverlay<TranscriptionCleanupDefinitionData>()({
  id: "transcriptionCleanup",
  label: "Transcription Cleanup",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { transcript: null },
    windowId: "transcription-cleanup",
    mobile: "fullscreen",
  },
  link: {
    key: "transcription-cleanup",
    hydrate: (ctx) => import("./transcriptionCleanup.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    transcriptionCleanup: OverlayWire<TranscriptionCleanupDefinitionData>;
  }
}
