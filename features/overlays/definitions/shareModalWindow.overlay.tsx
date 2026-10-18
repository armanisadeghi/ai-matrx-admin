"use client";

/**
 * Opener for the `shareModalWindow` overlay.
 *
 * - `useOpenShareModalWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ShareModalWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { ResourceType } from "@/utils/permissions/registry";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "shareModalWindow" as const;

export interface OpenShareModalWindowOptions {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
}

export interface ShareModalWindowHandle {
  close: () => void;
}

export function useOpenShareModalWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenShareModalWindowOptions): ShareModalWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            resourceType: opts.resourceType,
            resourceId: opts.resourceId,
            resourceName: opts.resourceName,
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
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export function ShareModalWindowController(
  props: OpenShareModalWindowOptions,
): null {
  const open = useOpenShareModalWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.resourceType, props.resourceId, props.resourceName]);
  return null;
}

export type ShareModalWindowDefinitionData = OpenShareModalWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    shareModalWindow: OverlayWire<ShareModalWindowDefinitionData>;
  }
}
