"use client";

/**
 * Opener for the `agentSettingsWindow` overlay.
 *
 * - `useOpenAgentSettingsWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentSettingsWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentSettingsWindow" as const;

export interface OpenAgentSettingsWindowOptions {
  initialAgentId?: string;
  /**
   * When set, Agent Settings shows a Surface tab for this surface's
   * agent↔surface bindings (defaults the pane to Surface).
   */
  surfaceName?: string;
  /** Override which pane opens first when `surfaceName` is set. */
  initialView?: "info" | "surface";
}

export interface AgentSettingsWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createAgentSettingsWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (opts: OpenAgentSettingsWindowOptions = {}): AgentSettingsWindowHandle => {
    dispatch(
      openOverlay({
        overlayId: OVERLAY_ID,
        data: {
          initialAgentId: opts.initialAgentId,
          surfaceName: opts.surfaceName,
          initialView: opts.initialView,
        },
      }),
    );
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  };
}

export function useOpenAgentSettingsWindow() {
  const store = useAppStore();
  return useMemo(() => createAgentSettingsWindowOpener(store), [store]);
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export function AgentSettingsWindowController(
  props: OpenAgentSettingsWindowOptions,
): null {
  const open = useOpenAgentSettingsWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
    // Intentionally key on the identity fields that change the panel —
    // remounting on every props object identity would thrash the overlay.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open is stable
  }, [
    open,
    props.initialAgentId,
    props.surfaceName,
    props.initialView,
  ]);
  return null;
}

export type AgentSettingsWindowDefinitionData = OpenAgentSettingsWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentSettingsWindow: OverlayWire<AgentSettingsWindowDefinitionData>;
  }
}
