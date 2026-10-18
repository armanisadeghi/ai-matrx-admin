"use client";

/**
 * Opener for the `agentCreateAppWindow` overlay.
 *
 * - `useOpenAgentCreateAppWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentCreateAppWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentCreateAppWindow" as const;

export type OpenAgentCreateAppWindowOptions = Record<string, never>;

export interface AgentCreateAppWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createAgentCreateAppWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (_opts: OpenAgentCreateAppWindowOptions = {}): AgentCreateAppWindowHandle => {
    dispatch(
      openOverlay({
        overlayId: OVERLAY_ID,
      }),
    );
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  };
}

export function useOpenAgentCreateAppWindow() {
  const store = useAppStore();
  return useMemo(() => createAgentCreateAppWindowOpener(store), [store]);
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export function AgentCreateAppWindowController(props: OpenAgentCreateAppWindowOptions): null {
  const open = useOpenAgentCreateAppWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props]);
  return null;
}

export type AgentCreateAppWindowDefinitionData = OpenAgentCreateAppWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentCreateAppWindow: OverlayWire<AgentCreateAppWindowDefinitionData>;
  }
}
