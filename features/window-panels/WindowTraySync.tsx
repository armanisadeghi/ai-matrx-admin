"use client";

/**
 * WindowTraySync
 *
 * Mounts ONCE in the root layout. Attaches a single debounced resize listener
 * that:
 *  1. Recomputes the positions of all minimized windows (tray slots can change
 *     when chips-per-row shifts on viewport resize).
 *  2. Clamps every docked windowed window into the new viewport so windows
 *     positioned for a larger screen stay reachable after a downsize.
 *
 * Zero re-renders — fires and forgets.
 *
 * Debounce: 500ms — a continuous window-drag generates exactly one dispatch
 * when the user stops moving. Short bursts (e.g. snapping) are ignored.
 *
 * Usage (in both authenticated and SSR root layouts):
 *   <WindowTraySync />
 */

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  recomputeTrayPositions,
  clampAllWindowRects,
} from "@/lib/redux/slices/windowManagerSlice";

const DEBOUNCE_MS = 500;

export function WindowTraySync() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        dispatch(recomputeTrayPositions({ viewportWidth, viewportHeight }));
        dispatch(clampAllWindowRects({ viewportWidth, viewportHeight }));
        timer = null;
      }, DEBOUNCE_MS);
    };

    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      if (timer !== null) clearTimeout(timer);
    };
  }, [dispatch]);

  return null;
}

export default WindowTraySync;
