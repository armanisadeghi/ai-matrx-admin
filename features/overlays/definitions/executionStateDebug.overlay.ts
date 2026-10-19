"use client";

/**
 * Openers for the `executionStateDebug` overlay (admin debug mode). It replaced the `adminDebug.indicators`
 * slice state and DebugIndicatorManager (adversarial review 2026-10-18, D-3): open by dispatch,
 * rendered only while open, dragged by summon's dock.
 */
import { useCallback } from "react";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { AppDispatch } from "@/lib/redux/store";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "executionStateDebug" as const;

export interface OpenExecutionStateDebugOptions {
  /** The agent execution instance (conversation) id to inspect. */
  instanceId: string;
}

/** Open (or retarget) the indicator; returns its close. */
export function openExecutionStateDebug(dispatch: AppDispatch, opts: OpenExecutionStateDebugOptions): () => void {
  dispatch(openOverlay({ overlayId: OVERLAY_ID, data: { instanceId: opts.instanceId } }));
  return () => dispatch(closeOverlay({ overlayId: OVERLAY_ID }));
}

export function closeExecutionStateDebug(dispatch: AppDispatch): void {
  dispatch(closeOverlay({ overlayId: OVERLAY_ID }));
}

export function useOpenExecutionStateDebug() {
  const dispatch = useAppDispatch();
  return useCallback((opts: OpenExecutionStateDebugOptions) => openExecutionStateDebug(dispatch, opts), [dispatch]);
}

export type ExecutionStateDebugDefinitionData = OpenExecutionStateDebugOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    executionStateDebug: OverlayWire<ExecutionStateDebugDefinitionData>;
  }
}
