"use client";

/**
 * Opener for the `agentAdminShortcutWindow` overlay.
 *
 * - `useOpenAgentShortcutQuickCreateWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentShortcutQuickCreateWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentAdminShortcutWindow" as const;

export interface OpenAgentShortcutQuickCreateWindowOptions {
  agentId?: string | null;
  /** TODO: tighten to `QuickCreateTab` once that type is imported. */
  initialActiveTab?: unknown;
}

export interface AgentShortcutQuickCreateWindowHandle {
  close: () => void;
}

export function useOpenAgentShortcutQuickCreateWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentShortcutQuickCreateWindowOptions = {}): AgentShortcutQuickCreateWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            agentId: opts.agentId,
            initialActiveTab: opts.initialActiveTab,
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
export function AgentShortcutQuickCreateWindowController(props: OpenAgentShortcutQuickCreateWindowOptions): null {
  const open = useOpenAgentShortcutQuickCreateWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.agentId, props.initialActiveTab]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentAdminShortcutWindowDefinitionData = OpenAgentShortcutQuickCreateWindowOptions;

export const agentAdminShortcutWindowOverlay = /* @__PURE__ */ defineOverlay<AgentAdminShortcutWindowDefinitionData>()({
  id: "agentAdminShortcutWindow",
  label: "Agent Admin Shortcut Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { agentId: null, activeTab: "essentials" },
    windowId: "agent-admin-shortcut-window",
    mobile: "drawer",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentAdminShortcutWindow: OverlayWire<AgentAdminShortcutWindowDefinitionData>;
  }
}
