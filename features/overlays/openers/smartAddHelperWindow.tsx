"use client";

/**
 * Opener for the `smartAddHelperWindow` overlay — one Smart Add helper ("focused session") per
 * people-search method. The instance id is the method, so a second click focuses the same window.
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */
import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@/lib/redux/slices/overlaySlice";
import type { HelperMethod } from "@/features/marketing/smart-add/helpers/types";

const OVERLAY_ID = "smartAddHelperWindow" as const;

export function useOpenSmartAddHelper() {
  const dispatch = useAppDispatch();
  return useCallback(
    (method: HelperMethod) => {
      dispatch(openOverlay({ overlayId: OVERLAY_ID, instanceId: method, data: { method } }));
      return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId: method })) };
    },
    [dispatch],
  );
}
