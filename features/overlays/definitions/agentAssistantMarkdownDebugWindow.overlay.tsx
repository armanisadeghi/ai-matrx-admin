"use client";

/**
 * Opener for the `agentAssistantMarkdownDebugWindow` overlay.
 *
 * - `useOpenAgentAssistantMarkdownDebugWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentAssistantMarkdownDebugWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentAssistantMarkdownDebugWindow" as const;

export interface OpenAgentAssistantMarkdownDebugWindowOptions {
}

export interface AgentAssistantMarkdownDebugWindowHandle {
  close: () => void;
}

export function useOpenAgentAssistantMarkdownDebugWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentAssistantMarkdownDebugWindowOptions = {}): AgentAssistantMarkdownDebugWindowHandle => {
      dispatch(openOverlay({ overlayId: OVERLAY_ID }));
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
export function AgentAssistantMarkdownDebugWindowController(props: OpenAgentAssistantMarkdownDebugWindowOptions): null {
  const open = useOpenAgentAssistantMarkdownDebugWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentAssistantMarkdownDebugWindowDefinitionData = OpenAgentAssistantMarkdownDebugWindowOptions;

export const agentAssistantMarkdownDebugWindowOverlay = /* @__PURE__ */ defineOverlay<AgentAssistantMarkdownDebugWindowDefinitionData>()({
  id: "agentAssistantMarkdownDebugWindow",
  label: "Agent Assistant Markdown Debug Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "agent-md-debug-window",
    mobile: "card",
    ephemeral: true,
  },
  link: {
    key: "agent-md-debug",
    hydrate: (ctx) => import("./agentAssistantMarkdownDebugWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentAssistantMarkdownDebugWindow: OverlayWire<AgentAssistantMarkdownDebugWindowDefinitionData>;
  }
}
