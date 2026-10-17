"use client";

/**
 * Opener for the `messageAnalysisWindow` overlay.
 *
 * - `useOpenMessageAnalysisWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<MessageAnalysisWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "messageAnalysisWindow" as const;

export interface OpenMessageAnalysisWindowOptions {
  conversationId: string | null;
  requestId?: string | null;
  messageId?: string | null;
}

export interface MessageAnalysisWindowHandle {
  close: () => void;
}

export function useOpenMessageAnalysisWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenMessageAnalysisWindowOptions): MessageAnalysisWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            conversationId: opts.conversationId,
            requestId: opts.requestId,
            messageId: opts.messageId,
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
export function MessageAnalysisWindowController(props: OpenMessageAnalysisWindowOptions): null {
  const open = useOpenMessageAnalysisWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.conversationId, props.requestId, props.messageId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type MessageAnalysisWindowDefinitionData = OpenMessageAnalysisWindowOptions;

export const messageAnalysisWindowOverlay = /* @__PURE__ */ defineOverlay<MessageAnalysisWindowDefinitionData>()({
  id: "messageAnalysisWindow",
  label: "Message Analysis Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          conversationId: null,
          requestId: null,
          messageId: null,
          activeTab: "request",
        },
    windowId: "message-analysis-window",
    mobile: "card",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    messageAnalysisWindow: OverlayWire<MessageAnalysisWindowDefinitionData>;
  }
}
