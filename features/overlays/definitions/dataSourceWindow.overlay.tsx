"use client";

/**
 * Opener for the `dataSourceWindow` overlay (singleton): one Data library source — what it gives,
 * what it costs, Get data. Opening another source replaces the one showing.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback } from "react";

import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "dataSourceWindow" as const;

export interface DataSourceWindowHandle {
  close: () => void;
}

export function useOpenDataSourceWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (sourceKey: string, values?: Record<string, string>): DataSourceWindowHandle => {
      dispatch(openOverlay({ overlayId: OVERLAY_ID, data: values ? { sourceKey, values } : { sourceKey } }));
      return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })) };
    },
    [dispatch],
  );
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type DataSourceWindowDefinitionData = Record<string, unknown>;

export const dataSourceWindowOverlay = /* @__PURE__ */ defineOverlay<DataSourceWindowDefinitionData>()({
  id: "dataSourceWindow",
  label: "Data Source",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { sourceKey: null },
    windowId: "data-source",
    mobile: "fullscreen",
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    dataSourceWindow: OverlayWire<DataSourceWindowDefinitionData>;
  }
}
