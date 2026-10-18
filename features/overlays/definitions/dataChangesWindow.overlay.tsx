"use client";

/**
 * Opener for the `dataChangesWindow` overlay (singleton): what a refresh of a fetched table changed
 * (New / Changed / Gone) and the table's refresh history. Opening another table replaces the one showing.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback } from "react";

import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
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

export type DataChangesWindowDefinitionData = OpenDataChangesOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    dataChangesWindow: OverlayWire<DataChangesWindowDefinitionData>;
  }
}
