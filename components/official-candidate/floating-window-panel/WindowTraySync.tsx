"use client";

/**
 * WindowTraySync
 *
 * Mounts ONCE in the root layout. Attaches a single debounced resize listener
 * that recomputes the positions of all minimized windows whenever the viewport
 * changes. Zero re-renders — fires and forgets.
 *
 * Debounce: 500ms — a continuous window-drag generates exactly one dispatch
 * when the user stops moving. Short bursts (e.g. snapping) are ignored.
 *
 * Usage (in both authenticated and SSR root layouts):
 *   <WindowTraySync />
 */

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { recomputeTrayPositions } from "@/lib/redux/slices/windowManagerSlice";

const DEBOUNCE_MS = 500;

export function WindowTraySync() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        dispatch(
          recomputeTrayPositions({
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
          }),
        );
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
