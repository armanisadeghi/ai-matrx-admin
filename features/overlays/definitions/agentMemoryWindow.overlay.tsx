"use client";

/**
 * Opener for the `agentMemoryWindow` overlay.
 *
 * - `useOpenAgentMemoryWindow()` — imperative hook. Call to open; returns a
 *   handle with a `close()` method.
 * - `<AgentMemoryWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentMemoryWindow" as const;

export interface AgentMemoryWindowHandle {
  close: () => void;
}

export function useOpenAgentMemoryWindow() {
  const dispatch = useAppDispatch();
  return useCallback((): AgentMemoryWindowHandle => {
    dispatch(openOverlay({ overlayId: OVERLAY_ID, data: {} }));
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  }, [dispatch]);
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount.
 */
export function AgentMemoryWindowController(): null {
  const open = useOpenAgentMemoryWindow();
  useEffect(() => {
    const handle = open();
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentMemoryWindowDefinitionData = Record<string, unknown>;

export const agentMemoryWindowOverlay = /* @__PURE__ */ defineOverlay<AgentMemoryWindowDefinitionData>()({
  id: "agentMemoryWindow",
  label: "Agent Memory",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "agent-memory-window",
    mobile: "drawer",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentMemoryWindow: OverlayWire<AgentMemoryWindowDefinitionData>;
  }
}
