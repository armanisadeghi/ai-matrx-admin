"use client";

/**
 * Opener for the `systemInstructionWindow` overlay.
 *
 * - `useOpenSystemInstructionWindow()` — imperative hook. Call to open with typed
 *   options; returns a handle with a `close()` method.
 * - `<SystemInstructionWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close.
 */

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "systemInstructionWindow" as const;

export interface OpenSystemInstructionWindowOptions {
  conversationId: string;
}

export interface SystemInstructionWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createSystemInstructionWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (
    opts: OpenSystemInstructionWindowOptions,
  ): SystemInstructionWindowHandle => {
    dispatch(
      openOverlay({
        overlayId: OVERLAY_ID,
        data: {
          conversationId: opts.conversationId,
        },
      }),
    );
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  };
}

export function useOpenSystemInstructionWindow() {
  const store = useAppStore();
  return useMemo(() => createSystemInstructionWindowOpener(store), [store]);
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount.
 */
export function SystemInstructionWindowController(
  props: OpenSystemInstructionWindowOptions,
): null {
  const open = useOpenSystemInstructionWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.conversationId]);
  return null;
}

export type SystemInstructionWindowDefinitionData = OpenSystemInstructionWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    systemInstructionWindow: OverlayWire<SystemInstructionWindowDefinitionData>;
  }
}
