"use client";

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
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

export type ConvertToShapeWindowDefinitionData = OpenConvertToShapeWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    convertToShapeWindow: OverlayWire<ConvertToShapeWindowDefinitionData>;
  }
}
