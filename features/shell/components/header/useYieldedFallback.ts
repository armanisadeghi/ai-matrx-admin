"use client";

import { useEffect, useState } from "react";

/** The header's center slot: the new app frame's when it is the shell, else the classic shell's. */
export const HEADER_CENTER_SLOTS = "#frame-header-center, #shell-header-center";

/**
 * A header's fallback tier. `true` yields to the page's own header; `"derived"` (the address-derived
 * trail a module LAYOUT draws) yields to the page's own header AND to any other fallback — a page's
 * own fallback (the table page's, a route skeleton's) is more specific than the trail. Only one
 * fallback draws at any moment (crumb doors wave 8, features/shell/FEATURE.md).
 */
export type HeaderFallback = boolean | "derived";

/** What a header of each tier steps aside for, among the center slot's direct children. */
export function fallbackYieldsTo(fallback: HeaderFallback): string | null {
  if (!fallback) return null;
  const page = ':scope > [data-page-header-portal="page"]';
  if (fallback !== "derived") return page;
  return `${page}, :scope > [data-page-header-portal="fallback"]:not([data-page-header-fallback="derived"])`;
}

/**
 * A `fallback` header is hidden (CSS) while a page-specific header is mounted;
 * its actions must then stay out of the phone sheet too, or the ⋮ would list
 * the section's actions beside the page's.
 */
export function useYieldedFallback(fallback: HeaderFallback): boolean {
  const [yielded, setYielded] = useState(false);
  const selector = fallbackYieldsTo(fallback);
  useEffect(() => {
    if (!selector) return;
    const center = document.querySelector<HTMLElement>(HEADER_CENTER_SLOTS);
    if (!center) return;
    const read = () => setYielded(center.querySelector(selector) != null);
    read();
    const observer = new MutationObserver(read);
    observer.observe(center, { childList: true });
    return () => observer.disconnect();
  }, [selector]);
  return selector != null && yielded;
}
