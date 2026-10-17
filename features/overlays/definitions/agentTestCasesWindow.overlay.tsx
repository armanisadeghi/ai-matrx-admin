"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentTestCasesWindow" as const;

export interface OpenAgentTestCasesWindowOptions {
  agentId: string;
  conversationId: string;
}

export interface AgentTestCasesWindowHandle {
  close: () => void;
}

export function useOpenAgentTestCasesWindow() {
  const dispatch = useAppDispatch();

  return (
    options: OpenAgentTestCasesWindowOptions,
  ): AgentTestCasesWindowHandle => {
    dispatch(
      openOverlay({
        overlayId: OVERLAY_ID,
        data: {
          agentId: options.agentId,
          conversationId: options.conversationId,
        },
      }),
    );

    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  };
}

export function AgentTestCasesWindowController({
  agentId,
  conversationId,
}: OpenAgentTestCasesWindowOptions): null {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      openOverlay({
        overlayId: OVERLAY_ID,
        data: { agentId, conversationId },
      }),
    );
    return () => {
      dispatch(closeOverlay({ overlayId: OVERLAY_ID }));
    };
  }, [agentId, conversationId, dispatch]);

  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentTestCasesWindowDefinitionData = OpenAgentTestCasesWindowOptions;

export const agentTestCasesWindowOverlay = defineOverlay<AgentTestCasesWindowDefinitionData>()({
  id: "agentTestCasesWindow",
  label: "Test Cases",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { agentId: "", conversationId: "" },
    windowId: "agent-test-cases-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
  render: () => import("./agentTestCasesWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentTestCasesWindow: OverlayWire<AgentTestCasesWindowDefinitionData>;
  }
}
