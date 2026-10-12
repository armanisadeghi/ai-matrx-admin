"use client";

/**
 * Opener for the `provisionWindow` overlay — the Provision window (features/provision-window).
 * `openProvisionWindow(snapshotId)` shows one saved capture of a call point's values.
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */
import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@/lib/redux/slices/overlaySlice";

const OVERLAY_ID = "provisionWindow" as const;

export function useOpenProvisionWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (snapshotId: string, title?: string) => {
      dispatch(openOverlay({ overlayId: OVERLAY_ID, data: { snapshotId, title } }));
      return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })) };
    },
    [dispatch],
  );
}
