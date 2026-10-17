"use client";

/**
 * Opener for the `builderPanelWindow` overlay — the admin Builder panel
 * (features/builder-panel). Hand-maintained opener — see features/overlays/FEATURE.md.
 */
import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay, toggleOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

export const BUILDER_PANEL_OVERLAY_ID = "builderPanelWindow" as const;

export interface OpenBuilderPanelOptions {
  surfaceKey?: string | null;
  tab?: "run" | "values" | "calls" | "activity" | "workflow" | "mandates" | "ai" | "provision";
  entryKey?: string | null;
}

export function useOpenBuilderPanel() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenBuilderPanelOptions = {}) => {
      dispatch(
        openOverlay({
          overlayId: BUILDER_PANEL_OVERLAY_ID,
          data: { surfaceKey: opts.surfaceKey ?? null, tab: opts.tab ?? (opts.entryKey ? "values" : "run"), entryKey: opts.entryKey ?? null },
        }),
      );
      return { close: () => dispatch(closeOverlay({ overlayId: BUILDER_PANEL_OVERLAY_ID })) };
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

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type BuilderPanelWindowDefinitionData = OpenBuilderPanelOptions;

export const builderPanelWindowOverlay = /* @__PURE__ */ defineOverlay<BuilderPanelWindowDefinitionData>()({
  id: "builderPanelWindow",
  label: "Builder",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { surfaceKey: null, tab: "run", entryKey: null, raw: false },
    windowId: "builder-panel-window",
    mobile: "fullscreen",
    preservation: { dataKeys: ["surfaceKey", "tab", "entryKey", "raw"] },
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    builderPanelWindow: OverlayWire<BuilderPanelWindowDefinitionData>;
  }
}
