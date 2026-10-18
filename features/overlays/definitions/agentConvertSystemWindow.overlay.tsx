"use client";

/**
 * Opener for the `agentConvertSystemWindow` overlay.
 *
 * - `useOpenAgentConvertSystemWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentConvertSystemWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { AnyMandateKey } from "@ai-matrx/agents/mandates";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentConvertSystemWindow" as const;

export interface OpenAgentConvertSystemWindowOptions {
  agentId?: string | null;
  /** Optional agent-mandate context (admin mandates console) — serializable only.
   * When set, the sync window names the mandate and offers an in-diff rebind. */
  mandateId?: string | null;
  mandateKey?: AnyMandateKey | null;
  mandateLabel?: string | null;
}

export interface AgentConvertSystemWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createAgentConvertSystemWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (opts: OpenAgentConvertSystemWindowOptions = {}): AgentConvertSystemWindowHandle => {
    dispatch(
      openOverlay({
        overlayId: OVERLAY_ID,
        data: {
          agentId: opts.agentId,
          mandateId: opts.mandateId,
          mandateKey: opts.mandateKey,
          mandateLabel: opts.mandateLabel,
        },
      }),
    );
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  };
}

export function useOpenAgentConvertSystemWindow() {
  const store = useAppStore();
  return useMemo(() => createAgentConvertSystemWindowOpener(store), [store]);
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export function AgentConvertSystemWindowController(props: OpenAgentConvertSystemWindowOptions): null {
  const open = useOpenAgentConvertSystemWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.agentId]);
  return null;
}

export type AgentConvertSystemWindowDefinitionData = OpenAgentConvertSystemWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentConvertSystemWindow: OverlayWire<AgentConvertSystemWindowDefinitionData>;
  }
}
