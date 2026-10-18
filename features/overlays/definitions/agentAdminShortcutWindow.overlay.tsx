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

export type AgentAdminShortcutWindowDefinitionData = OpenAgentShortcutQuickCreateWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentAdminShortcutWindow: OverlayWire<AgentAdminShortcutWindowDefinitionData>;
  }
}
