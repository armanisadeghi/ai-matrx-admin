"use client";

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "surfaceContextWindow" as const;

export interface OpenSurfaceContextWindowOptions {
  surfaceName: string;
  isEditable?: boolean;
  /** Which tab "This page" lands on. Default "values". */
  initialSection?: "values" | "actions" | "agents";
}

export function useOpenSurfaceContextWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (options: OpenSurfaceContextWindowOptions) => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            surfaceName: options.surfaceName,
            isEditable: options.isEditable === true,
            initialSection: options.initialSection ?? "values",
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

export function SurfaceContextWindowController(
  props: OpenSurfaceContextWindowOptions,
): null {
  const open = useOpenSurfaceContextWindow();
  useEffect(() => {
    const handle = open(props);
    return () => {
      handle.close();
    };
  }, [open, props.initialSection, props.isEditable, props.surfaceName]);
  return null;
}

export type SurfaceContextWindowDefinitionData = OpenSurfaceContextWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    surfaceContextWindow: OverlayWire<SurfaceContextWindowDefinitionData>;
  }
}
