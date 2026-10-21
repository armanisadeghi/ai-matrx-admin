"use client";

import { useEffect, useState } from "react";

/** The header's center slot: the new app frame's when it is the shell, else the classic shell's. */
export const HEADER_CENTER_SLOTS = "#frame-header-center, #shell-header-center";

/**
 * A `fallback` header is hidden (CSS) while a page-specific header is mounted;
 * its actions must then stay out of the phone sheet too, or the ⋮ would list
 * the section's actions beside the page's.
 */
export function useYieldedFallback(fallback: boolean): boolean {
  const [yielded, setYielded] = useState(false);
  useEffect(() => {
    if (!fallback) return;
    const center = document.querySelector<HTMLElement>(HEADER_CENTER_SLOTS);
    if (!center) return;
    const read = () =>
      setYielded(center.querySelector(':scope > [data-page-header-portal="page"]') != null);
    read();
    const observer = new MutationObserver(read);
    observer.observe(center, { childList: true });
    return () => observer.disconnect();
  }, [fallback]);
  return fallback && yielded;
}
