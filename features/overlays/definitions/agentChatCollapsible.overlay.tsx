"use client";

/**
 * Opener for the `agentChatCollapsible` overlay.
 *
 * - `useOpenChatCollapsible()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ChatCollapsibleController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentChatCollapsible" as const;

export interface OpenChatCollapsibleOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
}

export interface ChatCollapsibleHandle {
  instanceId: string;
  close: () => void;
}

export function useOpenChatCollapsible() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenChatCollapsibleOptions): ChatCollapsibleHandle => {
      const instanceId = opts.instanceId ?? `agentChatCollapsible-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId })),
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
export function ChatCollapsibleController(props: OpenChatCollapsibleOptions): null {
  const open = useOpenChatCollapsible();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.conversationId]);
  return null;
}

export type AgentChatCollapsibleDefinitionData = OpenChatCollapsibleOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentChatCollapsible: OverlayWire<AgentChatCollapsibleDefinitionData>;
  }
}
