"use client";

/**
 * Opener for the `chatDebugWindow` overlay.
 *
 * - `useOpenChatDebugWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ChatDebugWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "chatDebugWindow" as const;

export interface OpenChatDebugWindowOptions {
  sessionId: string | null;
}

export interface ChatDebugWindowHandle {
  close: () => void;
}

export function useOpenChatDebugWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenChatDebugWindowOptions): ChatDebugWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            sessionId: opts.sessionId,
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
export function ChatDebugWindowController(props: OpenChatDebugWindowOptions): null {
  const open = useOpenChatDebugWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.sessionId]);
  return null;
}

export type ChatDebugWindowDefinitionData = OpenChatDebugWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    chatDebugWindow: OverlayWire<ChatDebugWindowDefinitionData>;
  }
}
