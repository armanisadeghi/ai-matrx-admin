"use client";

/**
 * Opener for the `messagesWindow` overlay.
 *
 * - `useOpenMessagesWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<MessagesWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "messagesWindow" as const;

export interface OpenMessagesWindowOptions {
  conversationId?: string | null;
}

export interface MessagesWindowHandle {
  close: () => void;
}

export function useOpenMessagesWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenMessagesWindowOptions = {}): MessagesWindowHandle => {
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
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export function MessagesWindowController(props: OpenMessagesWindowOptions): null {
  const open = useOpenMessagesWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.conversationId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type MessagesWindowDefinitionData = OpenMessagesWindowOptions;

export const messagesWindowOverlay = defineOverlay<MessagesWindowDefinitionData>()({
  id: "messagesWindow",
  label: "Messages Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { conversationId: null, search: "" },
    windowId: "messages-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
    preservation: { dataKeys: ["conversationId"] },
  },
  link: {
    key: "messages",
    hydrate: (ctx) => import("./messagesWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    messagesWindow: OverlayWire<MessagesWindowDefinitionData>;
  }
}
