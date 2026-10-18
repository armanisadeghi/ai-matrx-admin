"use client";

/**
 * Opener for the `agentImportWindow` overlay.
 *
 * - `useOpenAgentImportWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentImportWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentImportWindow" as const;

export interface OpenAgentImportWindowOptions {
}

export interface AgentImportWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createAgentImportWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (opts: OpenAgentImportWindowOptions = {}): AgentImportWindowHandle => {
    dispatch(openOverlay({ overlayId: OVERLAY_ID }));
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  };
}

export function useOpenAgentImportWindow() {
  const store = useAppStore();
  return useMemo(() => createAgentImportWindowOpener(store), [store]);
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export function AgentImportWindowController(props: OpenAgentImportWindowOptions): null {
  const open = useOpenAgentImportWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open]);
  return null;
}

export type AgentImportWindowDefinitionData = OpenAgentImportWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentImportWindow: OverlayWire<AgentImportWindowDefinitionData>;
  }
}
