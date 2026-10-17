"use client";

/**
 * Opener for the `systemInstructionWindow` overlay.
 *
 * - `useOpenSystemInstructionWindow()` — imperative hook. Call to open with typed
 *   options; returns a handle with a `close()` method.
 * - `<SystemInstructionWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "systemInstructionWindow" as const;

export interface OpenSystemInstructionWindowOptions {
  conversationId: string;
}

export interface SystemInstructionWindowHandle {
  close: () => void;
}

export function useOpenSystemInstructionWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (
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
    },
    [dispatch],
  );
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

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type SystemInstructionWindowDefinitionData = OpenSystemInstructionWindowOptions;

export const systemInstructionWindowOverlay = defineOverlay<SystemInstructionWindowDefinitionData>()({
  id: "systemInstructionWindow",
  label: "Structured System Instruction Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { conversationId: "" },
    windowId: "system-instruction-window",
    mobile: "drawer",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    systemInstructionWindow: OverlayWire<SystemInstructionWindowDefinitionData>;
  }
}
