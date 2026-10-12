"use client";

/**
 * Opener for the `builderPanelWindow` overlay — the admin Builder panel
 * (features/builder-panel). Hand-maintained opener — see features/overlays/FEATURE.md.
 */
import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay, toggleOverlay } from "@/lib/redux/slices/overlaySlice";

export const BUILDER_PANEL_OVERLAY_ID = "builderPanelWindow" as const;

export interface OpenBuilderPanelOptions {
  surfaceKey?: string | null;
  tab?: "data" | "workflow" | "mandates" | "ai" | "provision";
  entryKey?: string | null;
}

export function useOpenBuilderPanel() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenBuilderPanelOptions = {}) => {
      dispatch(
        openOverlay({
          overlayId: BUILDER_PANEL_OVERLAY_ID,
          data: { surfaceKey: opts.surfaceKey ?? null, tab: opts.tab ?? "data", entryKey: opts.entryKey ?? null },
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
