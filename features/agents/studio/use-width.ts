"use client";

import { useCallback, useRef, useState } from "react";

/**
 * The live width of one element (ResizeObserver). `null` until the first REAL measure, so a caller can
 * hold its layout choice until it is real instead of drawing one layout and swapping to another.
 *
 * The ref is a CALLBACK ref and the observer follows the element: when the caller re-parents the
 * element (the Studio swaps its surface wrapper the moment an agent exists, which mounts a new body
 * div), the observer moves to the new node. The old version observed the first node forever; once it
 * was detached it reported width 0, and a 1440 window drew the phone tab layout right after the flip
 * (final review 2026-10-18, fin-dt-09). A 0 width (detached or not laid out yet) is never a measure.
 */
export function useMeasuredWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState<number | null>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    const take = (w: number) => {
      const rounded = Math.round(w);
      if (rounded > 0) setWidth(rounded);
    };
    take(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w !== undefined) take(w);
    });
    ro.observe(el);
    observer.current = ro;
  }, []);
  return { ref, width };
}
