"use client";

/**
 * Opener for the `dataSourceWindow` overlay (singleton): one Data library source — what it gives,
 * what it costs, Get data. Opening another source replaces the one showing.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback } from "react";

import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@/lib/redux/slices/overlaySlice";

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
