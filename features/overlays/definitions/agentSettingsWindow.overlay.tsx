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

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
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

export function useOpenAgentSettingsWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentSettingsWindowOptions = {}): AgentSettingsWindowHandle => {
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
    },
    [dispatch],
  );
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

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentSettingsWindowDefinitionData = OpenAgentSettingsWindowOptions;

export const agentSettingsWindowOverlay = defineOverlay<AgentSettingsWindowDefinitionData>()({
  id: "agentSettingsWindow",
  label: "Agent Settings Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          initialAgentId: null,
          surfaceName: null,
          initialView: null,
        },
    windowId: "agent-settings-window",
    mobile: "drawer",
    mobileSidebarAs: "drawer",
  },
  link: {
    key: "agent-settings",
    hydrate: (ctx) => import("./agentSettingsWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentSettingsWindow: OverlayWire<AgentSettingsWindowDefinitionData>;
  }
}
