"use client";

/**
 * Opener for the `providerReferenceWindow` overlay (the AI Models page's Provider Reference).
 * The window loads its own provider list, so it opens with no data and comes back on reload.
 */

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { isOverlayOpen, toggleOverlay } from "@ai-matrx/summon/boot";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "providerReferenceWindow" as const;

/** `[isOpen, toggle]` for the Provider Reference window. */
export function useProviderReferenceWindow(): [boolean, () => void] {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => isOverlayOpen(s, OVERLAY_ID));
  const toggle = useCallback(() => {
    dispatch(toggleOverlay({ overlayId: OVERLAY_ID }));
  }, [dispatch]);
  return [open, toggle];
}

export type ProviderReferenceWindowDefinitionData = Record<string, never>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    providerReferenceWindow: OverlayWire<ProviderReferenceWindowDefinitionData>;
  }
}
