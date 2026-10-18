"use client";

/**
 * Opener for the `agentMemoryWindow` overlay.
 *
 * - `useOpenAgentMemoryWindow()` — imperative hook. Call to open; returns a
 *   handle with a `close()` method.
 * - `<AgentMemoryWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close.
 */

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentMemoryWindow" as const;

export interface AgentMemoryWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createAgentMemoryWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (): AgentMemoryWindowHandle => {
    dispatch(openOverlay({ overlayId: OVERLAY_ID, data: {} }));
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  };
}

export function useOpenAgentMemoryWindow() {
  const store = useAppStore();
  return useMemo(() => createAgentMemoryWindowOpener(store), [store]);
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

export type AgentMemoryWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentMemoryWindow: OverlayWire<AgentMemoryWindowDefinitionData>;
  }
}
