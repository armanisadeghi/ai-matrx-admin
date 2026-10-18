"use client";

/**
 * Opener for the `agentDataStorageWindow` overlay.
 *
 * - `useOpenAgentDataStorageWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentDataStorageWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentDataStorageWindow" as const;

export interface OpenAgentDataStorageWindowOptions {
  agentId?: string | null;
}

export interface AgentDataStorageWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createAgentDataStorageWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (opts: OpenAgentDataStorageWindowOptions = {}): AgentDataStorageWindowHandle => {
    dispatch(
      openOverlay({
        overlayId: OVERLAY_ID,
        data: {
          agentId: opts.agentId,
        },
      }),
    );
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  };
}

export function useOpenAgentDataStorageWindow() {
  const store = useAppStore();
  return useMemo(() => createAgentDataStorageWindowOpener(store), [store]);
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export function AgentDataStorageWindowController(props: OpenAgentDataStorageWindowOptions): null {
  const open = useOpenAgentDataStorageWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.agentId]);
  return null;
}

export type AgentDataStorageWindowDefinitionData = OpenAgentDataStorageWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentDataStorageWindow: OverlayWire<AgentDataStorageWindowDefinitionData>;
  }
}
