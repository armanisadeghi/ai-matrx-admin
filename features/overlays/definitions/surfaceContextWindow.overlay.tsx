"use client";

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "surfaceContextWindow" as const;

export interface OpenSurfaceContextWindowOptions {
  surfaceName: string;
  isEditable?: boolean;
  /** Which tab "This page" lands on. Default "values". */
  initialSection?: "values" | "actions" | "agents";
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createSurfaceContextWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (options: OpenSurfaceContextWindowOptions) => {
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
  };
}

export function useOpenSurfaceContextWindow() {
  const store = useAppStore();
  return useMemo(() => createSurfaceContextWindowOpener(store), [store]);
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
