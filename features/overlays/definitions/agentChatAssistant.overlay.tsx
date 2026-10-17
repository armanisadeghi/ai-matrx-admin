"use client";

/**
 * Opener for the `agentChatAssistant` overlay.
 *
 * - `useOpenAgentChatAssistant()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentChatAssistantController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentChatAssistant" as const;

export interface OpenAgentChatAssistantOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
  stackIndex?: number;
}

export interface AgentChatAssistantHandle {
  instanceId: string;
  close: () => void;
}

export function useOpenAgentChatAssistant() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentChatAssistantOptions): AgentChatAssistantHandle => {
      const instanceId = opts.instanceId ?? `agentChatAssistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          instanceId,
          data: {
            conversationId: opts.conversationId,
            stackIndex: opts.stackIndex,
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
export function AgentChatAssistantController(props: OpenAgentChatAssistantOptions): null {
  const open = useOpenAgentChatAssistant();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.conversationId, props.stackIndex]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentChatAssistantDefinitionData = OpenAgentChatAssistantOptions;

export const agentChatAssistantOverlay = /* @__PURE__ */ defineOverlay<AgentChatAssistantDefinitionData>()({
  id: "agentChatAssistant",
  label: "Agent Chat Assistant",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentChatAssistant: OverlayWire<AgentChatAssistantDefinitionData>;
  }
}
