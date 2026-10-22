"use client";

/**
 * Opener for the `agentVariableEditorWindow` overlay — the floating editor for
 * one agent variable (Bind to a context item, picklist, input type, default).
 *
 * - `useOpenAgentVariableEditorWindow()` — imperative hook; returns a `close()` handle.
 *
 * The open state lives in the overlay slice on purpose: the agent builder swaps
 * to a separate tree below 768px, and page-local state died on every rotate.
 */

import type { AgentVariableEditorWindowData } from "@/features/agents/components/variables-management/AgentVariableEditorWindow";
import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentVariableEditorWindow" as const;

export type OpenAgentVariableEditorWindowOptions = AgentVariableEditorWindowData;

export interface AgentVariableEditorWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenAgentVariableEditorWindowOptions>(OVERLAY_ID, {
  instanceId: () => undefined,
  data: (opts: OpenAgentVariableEditorWindowOptions) => ({
            agentId: opts.agentId,
            variableName: opts.variableName,
            justCreated: opts.justCreated ?? false,
          }),
});

export const useOpenAgentVariableEditorWindow = opener.useOpen;

export type AgentVariableEditorWindowDefinitionData = OpenAgentVariableEditorWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentVariableEditorWindow: OverlayWire<AgentVariableEditorWindowDefinitionData>;
  }
}
