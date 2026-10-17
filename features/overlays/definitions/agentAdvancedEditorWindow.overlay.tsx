"use client";

/**
 * Opener for the `agentAdvancedEditorWindow` overlay.
 *
 * - `useOpenAgentContentWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentContentWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentAdvancedEditorWindow" as const;

export interface OpenAgentContentWindowOptions {
  initialAgentId?: string | null;
  /** TODO: tighten to `AgentContentTab` once that type is imported. */
  initialTab?: unknown;
  /** TODO: tighten to `AgentContentTab[]` once that type is imported. */
  tabs?: unknown;
  multiAgentMode?: boolean;
}

export interface AgentContentWindowHandle {
  close: () => void;
}

export function useOpenAgentContentWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentContentWindowOptions = {}): AgentContentWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            initialAgentId: opts.initialAgentId,
            initialTab: opts.initialTab,
            tabs: opts.tabs,
            multiAgentMode: opts.multiAgentMode,
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
export function AgentContentWindowController(props: OpenAgentContentWindowOptions): null {
  const open = useOpenAgentContentWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.initialAgentId, props.initialTab, props.tabs, props.multiAgentMode]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentAdvancedEditorWindowDefinitionData = OpenAgentContentWindowOptions;

export const agentAdvancedEditorWindowOverlay = defineOverlay<AgentAdvancedEditorWindowDefinitionData>()({
  id: "agentAdvancedEditorWindow",
  label: "Agent Advanced Editor Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialAgentId: null, initialTab: "messages", tabs: null },
    windowId: "agent-advanced-editor-window",
    mobile: "drawer",
    mobileSidebarAs: "drawer",
  },
  link: {
    key: "agent-content",
    hydrate: (ctx) => import("./agentAdvancedEditorWindow.link").then((m) => m.hydrate(ctx)),
  },
  render: () => import("./agentAdvancedEditorWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentAdvancedEditorWindow: OverlayWire<AgentAdvancedEditorWindowDefinitionData>;
  }
}
