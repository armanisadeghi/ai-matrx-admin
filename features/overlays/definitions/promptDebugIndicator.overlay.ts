"use client";

/**
 * Openers for the `promptDebugIndicator` overlay (admin debug mode). It replaced the `adminDebug.indicators`
 * slice state and DebugIndicatorManager (adversarial review 2026-10-18, D-3): open by dispatch,
 * rendered only while open, dragged by summon's dock.
 */
import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { AppDispatch } from "@/lib/redux/store";
import type { DebugData } from "@/components/debug/SystemPromptDebugModal";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";

const OVERLAY_ID = "promptDebugIndicator" as const;
const opener = createOpener<object>(OVERLAY_ID);

export interface OpenPromptDebugIndicatorOptions {
  /** What the prompt resolved to (selected text, context, variables, metadata). */
  debugData: DebugData;
}

/** Open (or retarget) the indicator; returns its close. */
export function openPromptDebugIndicator(dispatch: AppDispatch, opts: OpenPromptDebugIndicatorOptions): () => void {
  opener.open(dispatch, { data: { debugData: opts.debugData } });
  return () => dispatch(opener.close());
}

export function closePromptDebugIndicator(dispatch: AppDispatch): void {
  dispatch(opener.close());
}

export function useOpenPromptDebugIndicator() {
  const dispatch = useAppDispatch();
  return useCallback((opts: OpenPromptDebugIndicatorOptions) => openPromptDebugIndicator(dispatch, opts), [dispatch]);
}

export type PromptDebugIndicatorDefinitionData = OpenPromptDebugIndicatorOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    promptDebugIndicator: OverlayWire<PromptDebugIndicatorDefinitionData>;
  }
}
