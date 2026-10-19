"use client";

import { useEffect, type ReactNode } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsDebugMode } from "@/lib/redux/preferences/adminDebugSlice";

/**
 * Admin debug overlays exist only while debug mode is on: turning it off closes them (the old
 * DebugIndicatorManager rendered nothing outside debug mode). Used by the debug indicator overlays.
 */
export function DebugModeGate({ close, children }: { close: () => void; children: ReactNode }) {
  const isDebugMode = useAppSelector(selectIsDebugMode);
  useEffect(() => {
    if (!isDebugMode) close();
  }, [isDebugMode, close]);
  return isDebugMode ? <>{children}</> : null;
}

/** Opened without the record it inspects: say so and close, never a blank overlay. */
export function DebugNeedsRecord({ close, what }: { close: () => void; what: string }) {
  useEffect(() => {
    console.warn(`[debug] opened without a ${what} id; closing`);
    close();
  }, [close, what]);
  return null;
}
