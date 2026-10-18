"use client";

/**
 * Opener for the `workInboxWindow` overlay (a window that wraps a canonical list).
 *
 * - `useOpenWorkInboxWindow()` — imperative hook; returns a handle with `close()`.
 * - `<WorkInboxWindowController />` — declarative: mount to open, unmount to close.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "workInboxWindow" as const;

export interface WorkInboxWindowHandle {
  close: () => void;
}

export function useOpenWorkInboxWindow() {
  const dispatch = useAppDispatch();
  return useCallback((): WorkInboxWindowHandle => {
    dispatch(openOverlay({ overlayId: OVERLAY_ID }));
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  }, [dispatch]);
}

export function WorkInboxWindowController(): null {
  const open = useOpenWorkInboxWindow();
  useEffect(() => {
    const handle = open();
    return () => handle.close();
  }, [open]);
  return null;
}

export type WorkInboxWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    workInboxWindow: OverlayWire<WorkInboxWindowDefinitionData>;
  }
}
