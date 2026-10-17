"use client";

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "convertToShapeWindow" as const;

export interface OpenConvertToShapeWindowOptions {
  initialJsonContent: string;
}

export function useOpenConvertToShapeWindow() {
  const dispatch = useAppDispatch();

  return useCallback(
    ({ initialJsonContent }: OpenConvertToShapeWindowOptions) => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: { initialJsonContent },
        }),
      );
      return {
        close: () => {
          dispatch(closeOverlay({ overlayId: OVERLAY_ID }));
        },
      };
    },
    [dispatch],
  );
}

export function ConvertToShapeWindowController({
  initialJsonContent,
}: OpenConvertToShapeWindowOptions): null {
  const open = useOpenConvertToShapeWindow();

  useEffect(() => {
    const handle = open({ initialJsonContent });
    return () => {
      handle.close();
    };
  }, [initialJsonContent, open]);

  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ConvertToShapeWindowDefinitionData = OpenConvertToShapeWindowOptions;

export const convertToShapeWindowOverlay = /* @__PURE__ */ defineOverlay<ConvertToShapeWindowDefinitionData>()({
  id: "convertToShapeWindow",
  label: "Convert JSON to Shape",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialJsonContent: "" },
    windowId: "convert-to-shape-window",
    mobile: "drawer",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    convertToShapeWindow: OverlayWire<ConvertToShapeWindowDefinitionData>;
  }
}
