"use client";

/**
 * Opener for the `agentFromChatWindow` overlay — "Make an agent from this chat".
 *
 * - `useOpenAgentFromChatWindow()` — imperative hook; returns a handle with `close()`.
 * - `<AgentFromChatWindowController />` — declarative wrapper.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentFromChatWindow" as const;

export interface OpenAgentFromChatWindowOptions {
  conversationId: string;
  conversationTitle?: string | null;
}

export interface AgentFromChatWindowHandle {
  close: () => void;
}

export function useOpenAgentFromChatWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentFromChatWindowOptions): AgentFromChatWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            conversationId: opts.conversationId,
            conversationTitle: opts.conversationTitle ?? null,
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

export function AgentFromChatWindowController(props: OpenAgentFromChatWindowOptions): null {
  const open = useOpenAgentFromChatWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentFromChatWindowDefinitionData = OpenAgentFromChatWindowOptions;

export const agentFromChatWindowOverlay = defineOverlay<AgentFromChatWindowDefinitionData>()({
  id: "agentFromChatWindow",
  label: "Make an Agent From a Chat",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { conversationId: null, conversationTitle: null },
    windowId: "agent-from-chat-window",
    mobile: "drawer",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentFromChatWindow: OverlayWire<AgentFromChatWindowDefinitionData>;
  }
}
