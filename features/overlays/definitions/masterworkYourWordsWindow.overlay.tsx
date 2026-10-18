"use client";

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "masterworkYourWordsWindow" as const;

export interface OpenMasterworkYourWordsWindowOptions {
  rulebookId: string;
}

export interface MasterworkYourWordsWindowHandle {
  close: () => void;
}

export function useOpenMasterworkYourWordsWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (
      opts: OpenMasterworkYourWordsWindowOptions,
    ): MasterworkYourWordsWindowHandle => {
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

export function MasterworkYourWordsWindowController(
  props: OpenMasterworkYourWordsWindowOptions,
): null {
  const open = useOpenMasterworkYourWordsWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.rulebookId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type MasterworkYourWordsWindowDefinitionData = OpenMasterworkYourWordsWindowOptions;

export const masterworkYourWordsWindowOverlay = defineOverlay<MasterworkYourWordsWindowDefinitionData>()({
  id: "masterworkYourWordsWindow",
  label: "Your words",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { rulebookId: null },
    windowId: "masterwork-your-words-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    masterworkYourWordsWindow: OverlayWire<MasterworkYourWordsWindowDefinitionData>;
  }
}
