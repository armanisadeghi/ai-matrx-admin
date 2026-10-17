"use client";

/**
 * Opener for the `agentFloatingChat` overlay.
 *
 * - `useOpenAgentFloatingChat()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentFloatingChatController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentFloatingChat" as const;

export interface OpenAgentFloatingChatOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
}

export interface AgentFloatingChatHandle {
  instanceId: string;
  close: () => void;
}

export function useOpenAgentFloatingChat() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentFloatingChatOptions): AgentFloatingChatHandle => {
      const instanceId = opts.instanceId ?? `agentFloatingChat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
export function AgentFloatingChatController(props: OpenAgentFloatingChatOptions): null {
  const open = useOpenAgentFloatingChat();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.conversationId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentFloatingChatDefinitionData = OpenAgentFloatingChatOptions;

export const agentFloatingChatOverlay = defineOverlay<AgentFloatingChatDefinitionData>()({
  id: "agentFloatingChat",
  label: "Agent Floating Chat",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "agent-floating-chat",
    ephemeral: true,
  },
  render: () => import("./agentFloatingChat.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentFloatingChat: OverlayWire<AgentFloatingChatDefinitionData>;
  }
}
