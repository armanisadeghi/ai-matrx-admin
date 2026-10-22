"use client";

/**
 * Opener for the `builderPanelWindow` overlay — the admin Builder panel
 * (features/builder-panel). Hand-maintained opener — see features/overlays/FEATURE.md.
 */
import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { toggleOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";

export const BUILDER_PANEL_OVERLAY_ID = "builderPanelWindow" as const;
const opener = createOpener<object>(BUILDER_PANEL_OVERLAY_ID);

export interface OpenBuilderPanelOptions {
  surfaceKey?: string | null;
  tab?: "run" | "values" | "calls" | "activity" | "workflow" | "mandates" | "ai" | "provision";
  entryKey?: string | null;
}

export function useOpenBuilderPanel() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenBuilderPanelOptions = {}) => {
      opener.open(dispatch, { data: { surfaceKey: opts.surfaceKey ?? null, tab: opts.tab ?? (opts.entryKey ? "values" : "run"), entryKey: opts.entryKey ?? null } });
      return { close: () => dispatch(opener.close()) };
    },
    [dispatch],
  );
}

export function useToggleBuilderPanel() {
  const dispatch = useAppDispatch();
  return useCallback(() => {
    dispatch(toggleOverlay({ overlayId: BUILDER_PANEL_OVERLAY_ID }));
  }, [dispatch]);
}

export type BuilderPanelWindowDefinitionData = OpenBuilderPanelOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    builderPanelWindow: OverlayWire<BuilderPanelWindowDefinitionData>;
  }
}
