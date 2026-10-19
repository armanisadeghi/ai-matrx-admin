"use client";

/**
 * Openers for the `resourceDebugIndicator` overlay (admin debug mode). It replaced the `adminDebug.indicators`
 * slice state and DebugIndicatorManager (adversarial review 2026-10-18, D-3): open by dispatch,
 * rendered only while open, dragged by summon's dock.
 */
import { useCallback } from "react";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { AppDispatch } from "@/lib/redux/store";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "resourceDebugIndicator" as const;

export interface OpenResourceDebugIndicatorOptions {
  /** The agent execution conversation whose attached resources to show. */
  conversationId: string;
}

/** Open (or retarget) the indicator; returns its close. */
export function openResourceDebugIndicator(dispatch: AppDispatch, opts: OpenResourceDebugIndicatorOptions): () => void {
  dispatch(openOverlay({ overlayId: OVERLAY_ID, data: { conversationId: opts.conversationId } }));
  return () => dispatch(closeOverlay({ overlayId: OVERLAY_ID }));
}

export function closeResourceDebugIndicator(dispatch: AppDispatch): void {
  dispatch(closeOverlay({ overlayId: OVERLAY_ID }));
}

export function useOpenResourceDebugIndicator() {
  const dispatch = useAppDispatch();
  return useCallback((opts: OpenResourceDebugIndicatorOptions) => openResourceDebugIndicator(dispatch, opts), [dispatch]);
}

export type ResourceDebugIndicatorDefinitionData = OpenResourceDebugIndicatorOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    resourceDebugIndicator: OverlayWire<ResourceDebugIndicatorDefinitionData>;
  }
}
