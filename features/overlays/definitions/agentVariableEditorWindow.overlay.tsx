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

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { AgentVariableEditorWindowData } from "@/features/agents/components/variables-management/AgentVariableEditorWindow";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentVariableEditorWindow" as const;

export type OpenAgentVariableEditorWindowOptions = AgentVariableEditorWindowData;

export interface AgentVariableEditorWindowHandle {
  close: () => void;
}

export function useOpenAgentVariableEditorWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (
      opts: OpenAgentVariableEditorWindowOptions,
    ): AgentVariableEditorWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            agentId: opts.agentId,
            variableName: opts.variableName,
            justCreated: opts.justCreated ?? false,
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

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentVariableEditorWindowDefinitionData = OpenAgentVariableEditorWindowOptions;

export const agentVariableEditorWindowOverlay = /* @__PURE__ */ defineOverlay<AgentVariableEditorWindowDefinitionData>()({
  id: "agentVariableEditorWindow",
  label: "Variable Editor",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          agentId: null,
          variableName: null,
          justCreated: false,
        },
    windowId: "agent-variable-editor-window",
    mobile: "drawer",
    ephemeral: true,
  },
  link: {
    key: "agent_variable",
    hydrate: (ctx) => import("./agentVariableEditorWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentVariableEditorWindow: OverlayWire<AgentVariableEditorWindowDefinitionData>;
  }
}
