"use client";

/**
 * Opener for the `toolCallWindow` overlay.
 *
 * - `useOpenToolCallWindowPanel()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ToolCallWindowPanelController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "toolCallWindow" as const;

export interface OpenToolCallWindowPanelOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  requestId: string | null;
  callIds: string[];
  /** TODO: tighten to `ToolLifecycleEntry[] | null` once that type is imported. */
  entries: unknown;
  initialCallId: string | null;
  initialTab: string | null;
  /** Enables the sidebar "All messages" scope (conversation-wide tool list). */
  conversationId?: string | null;
}

export interface ToolCallWindowPanelHandle {
  instanceId: string;
  close: () => void;
}

export function useOpenToolCallWindowPanel() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenToolCallWindowPanelOptions): ToolCallWindowPanelHandle => {
      const instanceId = opts.instanceId ?? `toolCallWindow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          instanceId,
          data: {
            requestId: opts.requestId,
            callIds: opts.callIds,
            entries: opts.entries,
            initialCallId: opts.initialCallId,
            initialTab: opts.initialTab,
            conversationId: opts.conversationId ?? null,
          },
        }),
      );
      return {
        instanceId,
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId })),
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
export function ToolCallWindowPanelController(props: OpenToolCallWindowPanelOptions): null {
  const open = useOpenToolCallWindowPanel();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [
    open,
    props.requestId,
    props.callIds,
    props.entries,
    props.initialCallId,
    props.initialTab,
    props.conversationId,
  ]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ToolCallWindowDefinitionData = OpenToolCallWindowPanelOptions;

export const toolCallWindowOverlay = /* @__PURE__ */ defineOverlay<ToolCallWindowDefinitionData>()({
  id: "toolCallWindow",
  label: "Tool Call Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          requestId: null,
          callIds: [],
          entries: null,
          initialCallId: null,
          initialTab: null,
          conversationId: null,
          readOnly: false,
        },
    windowId: "tool-call-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    toolCallWindow: OverlayWire<ToolCallWindowDefinitionData>;
  }
}
