"use client";

/**
 * Opener for the `streamDebug` overlay.
 *
 * - `useOpenStreamDebugFloating()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<StreamDebugFloatingController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "streamDebug" as const;

export interface OpenStreamDebugFloatingOptions {
  conversationId: string;
  /** TODO: tighten to `{ x: number; y: number }` once that type is imported. */
  defaultPosition?: unknown;
  requestIdOverride?: string;
}

export interface StreamDebugFloatingHandle {
  close: () => void;
}

export function useOpenStreamDebugFloating() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenStreamDebugFloatingOptions): StreamDebugFloatingHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            conversationId: opts.conversationId,
            defaultPosition: opts.defaultPosition,
            requestIdOverride: opts.requestIdOverride,
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
export function StreamDebugFloatingController(props: OpenStreamDebugFloatingOptions): null {
  const open = useOpenStreamDebugFloating();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.conversationId, props.defaultPosition, props.requestIdOverride]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type StreamDebugDefinitionData = OpenStreamDebugFloatingOptions;

export const streamDebugOverlay = defineOverlay<StreamDebugDefinitionData>()({
  id: "streamDebug",
  label: "Stream Debug",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { conversationId: null, requestIdOverride: undefined },
    windowId: "stream-debug",
    ephemeral: true,
  },
  render: () => import("./streamDebug.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    streamDebug: OverlayWire<StreamDebugDefinitionData>;
  }
}
