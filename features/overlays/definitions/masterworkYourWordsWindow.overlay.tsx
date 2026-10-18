"use client";

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
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

export type MasterworkYourWordsWindowDefinitionData = OpenMasterworkYourWordsWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    masterworkYourWordsWindow: OverlayWire<MasterworkYourWordsWindowDefinitionData>;
  }
}
