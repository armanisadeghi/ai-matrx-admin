"use client";

/**
 * Opener for the `scopeBatchImportWindow` overlay.
 *
 * - `useOpenScopeBatchImportWindow()` — imperative hook. Call to open with
 *   typed options; returns a handle with a `close()` method.
 * - `<ScopeBatchImportWindowController />` — declarative wrapper. Mount to
 *   open, unmount to close.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "scopeBatchImportWindow" as const;

export interface OpenScopeBatchImportWindowOptions {
  agentId: string;
}

export interface ScopeBatchImportWindowHandle {
  close: () => void;
}

export function useOpenScopeBatchImportWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenScopeBatchImportWindowOptions): ScopeBatchImportWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            agentId: opts.agentId,
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
export function ScopeBatchImportWindowController(
  props: OpenScopeBatchImportWindowOptions,
): null {
  const open = useOpenScopeBatchImportWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.agentId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ScopeBatchImportWindowDefinitionData = OpenScopeBatchImportWindowOptions;

export const scopeBatchImportWindowOverlay = defineOverlay<ScopeBatchImportWindowDefinitionData>()({
  id: "scopeBatchImportWindow",
  label: "Batch Add from Scope Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {},
});


declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    scopeBatchImportWindow: OverlayWire<ScopeBatchImportWindowDefinitionData>;
  }
}
