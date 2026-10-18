"use client";

/**
 * Opener for the `agentInterfaceVariationsWindow` overlay.
 *
 * - `useOpenAgentInterfaceVariationsWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentInterfaceVariationsWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentInterfaceVariationsWindow" as const;

export interface OpenAgentInterfaceVariationsWindowOptions {
  agentId?: string | null;
}

export interface AgentInterfaceVariationsWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createAgentInterfaceVariationsWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (opts: OpenAgentInterfaceVariationsWindowOptions = {}): AgentInterfaceVariationsWindowHandle => {
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

export function useOpenAgentInterfaceVariationsWindow() {
  const store = useAppStore();
  return useMemo(() => createAgentInterfaceVariationsWindowOpener(store), [store]);
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export function AgentInterfaceVariationsWindowController(props: OpenAgentInterfaceVariationsWindowOptions): null {
  const open = useOpenAgentInterfaceVariationsWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.agentId]);
  return null;
}

export type AgentInterfaceVariationsWindowDefinitionData = OpenAgentInterfaceVariationsWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentInterfaceVariationsWindow: OverlayWire<AgentInterfaceVariationsWindowDefinitionData>;
  }
}
