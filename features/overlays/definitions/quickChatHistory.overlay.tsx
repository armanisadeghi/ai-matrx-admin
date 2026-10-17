"use client";

/**
 * Opener for the `quickChatHistory` overlay.
 *
 * - `useOpenChatHistoryWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ChatHistoryWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "quickChatHistory" as const;

export interface OpenChatHistoryWindowOptions {
  initialSelectedConversationId?: string | null;
  /** TODO: tighten to `GroupBy` once that type is imported. */
  initialGroupBy?: unknown;
}

export interface ChatHistoryWindowHandle {
  close: () => void;
}

export function useOpenChatHistoryWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenChatHistoryWindowOptions = {}): ChatHistoryWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            initialSelectedConversationId: opts.initialSelectedConversationId,
            initialGroupBy: opts.initialGroupBy,
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
export function ChatHistoryWindowController(props: OpenChatHistoryWindowOptions): null {
  const open = useOpenChatHistoryWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.initialSelectedConversationId, props.initialGroupBy]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type QuickChatHistoryDefinitionData = OpenChatHistoryWindowOptions;

export const quickChatHistoryOverlay = /* @__PURE__ */ defineOverlay<QuickChatHistoryDefinitionData>()({
  id: "quickChatHistory",
  label: "Quick Chat History",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { selectedConversationId: null, groupBy: "date" },
    windowId: "quick-chat-history",
    mobile: "fullscreen",
  },
  link: {
    key: "chat_history",
    hydrate: (ctx) => import("./quickChatHistory.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    quickChatHistory: OverlayWire<QuickChatHistoryDefinitionData>;
  }
}
