"use client";

/**
 * Opener for the `agentMemoryWindow` overlay.
 *
 * - `useOpenAgentMemoryWindow()` — imperative hook. Call to open; returns a
 *   handle with a `close()` method.
 * - `<AgentMemoryWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close.
 */

import { useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./hook-controller";

const OVERLAY_ID = "agentMemoryWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

export interface AgentMemoryWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createAgentMemoryWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (): AgentMemoryWindowHandle => {
    opener.open(dispatch, { data: {} });
    return {
      close: () => dispatch(opener.close()),
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
export const AgentMemoryWindowController = hookController(useOpenAgentMemoryWindow);

export type AgentMemoryWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentMemoryWindow: OverlayWire<AgentMemoryWindowDefinitionData>;
  }
}
