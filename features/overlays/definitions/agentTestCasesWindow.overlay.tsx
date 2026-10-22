"use client";

import { useAppDispatch } from "@/lib/redux/hooks";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./hook-controller";

const OVERLAY_ID = "agentTestCasesWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

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
    opener.open(dispatch, { data: {
          agentId: options.agentId,
          conversationId: options.conversationId,
        } });

    return {
      close: () => dispatch(opener.close()),
    };
  };
}

export const AgentTestCasesWindowController = hookController<OpenAgentTestCasesWindowOptions>(useOpenAgentTestCasesWindow);

export type AgentTestCasesWindowDefinitionData = OpenAgentTestCasesWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentTestCasesWindow: OverlayWire<AgentTestCasesWindowDefinitionData>;
  }
}
