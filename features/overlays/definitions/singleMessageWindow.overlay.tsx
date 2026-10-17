"use client";

/**
 * Opener for the `singleMessageWindow` overlay.
 *
 * - `useOpenSingleMessageWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<SingleMessageWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "singleMessageWindow" as const;

export interface OpenSingleMessageWindowOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
}

export interface SingleMessageWindowHandle {
  instanceId: string;
  close: () => void;
}

export function useOpenSingleMessageWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenSingleMessageWindowOptions): SingleMessageWindowHandle => {
      const instanceId =
        opts.instanceId ??
        `singleMessageWindow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          instanceId,
          data: {
            conversationId: opts.conversationId,
          },
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
export function SingleMessageWindowController(
  props: OpenSingleMessageWindowOptions,
): null {
  const open = useOpenSingleMessageWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.conversationId, props.instanceId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type SingleMessageWindowDefinitionData = OpenSingleMessageWindowOptions;

export const singleMessageWindowOverlay = defineOverlay<SingleMessageWindowDefinitionData>()({
  id: "singleMessageWindow",
  label: "Single Message Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { conversationId: null },
    windowId: "single-message-window",
    mobile: "drawer",
    preservation: {
      dataKeys: ["conversationId"],
      requiredDataKeys: ["conversationId"],
    },
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    singleMessageWindow: OverlayWire<SingleMessageWindowDefinitionData>;
  }
}
