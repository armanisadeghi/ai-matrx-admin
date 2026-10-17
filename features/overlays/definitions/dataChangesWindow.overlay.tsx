"use client";

/**
 * Opener for the `dataChangesWindow` overlay (singleton): what a refresh of a fetched table changed
 * (New / Changed / Gone) and the table's refresh history. Opening another table replaces the one showing.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback } from "react";

import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "dataChangesWindow" as const;

export interface OpenDataChangesOptions {
  tableId: string;
  organizationId: string | null;
  /** The refresh to show first; the newest when left out. */
  jobId?: string | null;
  tableName?: string | null;
}

export interface DataChangesWindowHandle {
  close: () => void;
}

export function useOpenDataChangesWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenDataChangesOptions): DataChangesWindowHandle => {
      dispatch(openOverlay({ overlayId: OVERLAY_ID, data: { ...opts } }));
      return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })) };
    },
    [dispatch],
  );
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type DataChangesWindowDefinitionData = OpenDataChangesOptions;

export const dataChangesWindowOverlay = defineOverlay<DataChangesWindowDefinitionData>()({
  id: "dataChangesWindow",
  label: "Data Changes",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { tableId: null },
    windowId: "data-changes",
    mobile: "fullscreen",
  },
  link: {
    key: "data_changes",
    hydrate: (ctx) => import("./dataChangesWindow.link").then((m) => m.hydrate(ctx)),
  },
  render: () => import("./dataChangesWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    dataChangesWindow: OverlayWire<DataChangesWindowDefinitionData>;
  }
}
