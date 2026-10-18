"use client";

/**
 * Opener for the `runControlsWindow` overlay — the "Chat Options" run-controls
 * window (Attach / Context / Document / Overrides / Tools / Skills / Sandbox /
 * Settings / Preferences / Creator) for one conversation.
 *
 * - `useOpenRunControlsWindow()` — imperative hook. Call to open with typed
 *   options; returns a handle with a `close()` method.
 * - `<RunControlsWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close.
 */

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { RunControlsTab } from "@ai-matrx/chat/agents/components/inputs/smart-input/RunControlsTabPanel";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "runControlsWindow" as const;

export interface OpenRunControlsWindowOptions {
  conversationId: string;
  /** Show the Attach tab (the `/chat/new` "+" variant). Default false. */
  includeAttach?: boolean;
  /** Tab to land on. Defaults to the surface's natural first tab. */
  initialTab?: RunControlsTab;
}

export interface RunControlsWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createRunControlsWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (opts: OpenRunControlsWindowOptions): RunControlsWindowHandle => {
    dispatch(
      openOverlay({
        overlayId: OVERLAY_ID,
        data: {
          conversationId: opts.conversationId,
          includeAttach: opts.includeAttach ?? false,
          initialTab: opts.initialTab ?? null,
        },
      }),
    );
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  };
}

export function useOpenRunControlsWindow() {
  const store = useAppStore();
  return useMemo(() => createRunControlsWindowOpener(store), [store]);
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount.
 */
export function RunControlsWindowController(
  props: OpenRunControlsWindowOptions,
): null {
  const open = useOpenRunControlsWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.conversationId, props.includeAttach, props.initialTab]);
  return null;
}

export type RunControlsWindowDefinitionData = OpenRunControlsWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    runControlsWindow: OverlayWire<RunControlsWindowDefinitionData>;
  }
}
