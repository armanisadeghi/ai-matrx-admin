"use client";

/**
 * Opener for the `masterworkCheckupWindow` overlay — the Final Checkup an
 * Expert opens from their Rulebook when they feel done.
 *
 * - `useOpenMasterworkCheckupWindow()` — imperative hook, returns a handle.
 * - `<MasterworkCheckupWindowController />` — declarative wrapper.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "masterworkCheckupWindow" as const;

export interface OpenMasterworkCheckupWindowOptions {
  /** The Rulebook being checked. The window is meaningless without it. */
  rulebookId: string;
}

export interface MasterworkCheckupWindowHandle {
  close: () => void;
}

export function useOpenMasterworkCheckupWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (
      opts: OpenMasterworkCheckupWindowOptions,
    ): MasterworkCheckupWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: { rulebookId: opts.rulebookId },
        }),
      );
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
      };
    },
    [dispatch],
  );
}

export function MasterworkCheckupWindowController(
  props: OpenMasterworkCheckupWindowOptions,
): null {
  const open = useOpenMasterworkCheckupWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.rulebookId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type MasterworkCheckupWindowDefinitionData = OpenMasterworkCheckupWindowOptions;

export const masterworkCheckupWindowOverlay = defineOverlay<MasterworkCheckupWindowDefinitionData>()({
  id: "masterworkCheckupWindow",
  label: "Final Checkup",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { rulebookId: null },
    windowId: "masterwork-checkup-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    masterworkCheckupWindow: OverlayWire<MasterworkCheckupWindowDefinitionData>;
  }
}
