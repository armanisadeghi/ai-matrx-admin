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

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
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

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createAgentContentWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (opts: OpenAgentContentWindowOptions = {}): AgentContentWindowHandle => {
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
  };
}

export function useOpenAgentContentWindow() {
  const store = useAppStore();
  return useMemo(() => createAgentContentWindowOpener(store), [store]);
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

export type AgentAdvancedEditorWindowDefinitionData = OpenAgentContentWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentAdvancedEditorWindow: OverlayWire<AgentAdvancedEditorWindowDefinitionData>;
  }
}
