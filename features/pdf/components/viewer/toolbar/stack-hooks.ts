"use client";

/**
 * The state of a scrolling PDF stack, free of any viewer weight: one zoom for
 * every page (`useStackZoom`) and the current page from scroll position
 * (`useScrollPages`). A host imports these statically and lazy-loads only the
 * toolbar row (./PdfStackToolbar.tsx) with the viewer.
 */

import { useCallback, useEffect, useState, type RefObject } from "react";
import type { PdfToolbarZoom } from "./PdfToolbarRow";

export const STACK_ZOOM_MIN = 0.5;
export const STACK_ZOOM_MAX = 3;
export const STACK_ZOOM_STEP = 0.25;

/** Clamp + round a stack zoom so repeated steps never drift (0.7500000001). */
export function clampStackZoom(z: number): number {
  return Math.min(STACK_ZOOM_MAX, Math.max(STACK_ZOOM_MIN, Math.round(z * 100) / 100));
}

/**
 * One zoom for every page of a stack. Controlled when `onChange` is given
 * (the host keeps the number: the e-sign editor and signer do), otherwise it
 * keeps its own, seeded from `value` and following it when it changes.
 */
export function useStackZoom(
  value = 1,
  onChange?: (zoom: number) => void,
): PdfToolbarZoom & { value: number; set(zoom: number): void } {
  const [own, setOwn] = useState(value);
  useEffect(() => {
    setOwn(value);
  }, [value]);
  const current = onChange ? value : own;
  const set = useCallback(
    (z: number) => {
      const next = clampStackZoom(z);
      if (onChange) onChange(next);
      else setOwn(next);
    },
    [onChange],
  );
  return {
    value: current,
    set,
    label: current === 1 ? "Fit W" : `${Math.round(current * 100)}%`,
    mode: current === 1 ? "fit-width" : "scale",
    canIn: current < STACK_ZOOM_MAX,
    canOut: current > STACK_ZOOM_MIN,
    step: (direction) => set(current + direction * STACK_ZOOM_STEP),
    // A stack has one fit: the width. (fit page / actual are omitted from its row.)
    setMode: () => set(1),
  };
}

/** The nearest ancestor that scrolls vertically; null = the page itself. */
function scrollParent(node: HTMLElement | null): HTMLElement | null {
  for (let el: HTMLElement | null = node; el; el = el.parentElement) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === "auto" || oy === "scroll" || oy === "overlay") && el.scrollHeight > el.clientHeight + 1) {
      return el;
    }
  }
  return null;
}

/**
 * Which page is showing, from scroll position — across every `[data-pdf-page]`
 * under `contentRef`, in document order (several documents = one run of pages).
 */
export function useScrollPages(
  contentRef: RefObject<HTMLElement | null>,
  /** Pixels of sticky chrome at the top of the scroll area that a page must clear. */
  topInset = 0,
): { page: number; pages: number; goTo(page: number): void } {
  const [state, setState] = useState({ page: 1, pages: 0 });

  const measure = useCallback(() => {
    const root = contentRef.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>("[data-pdf-page]");
    const scroller = scrollParent(root);
    const top = scroller ? scroller.getBoundingClientRect().top : 0;
    const height = scroller ? scroller.clientHeight : window.innerHeight;
    // The page under the upper third of the viewport is "the current page".
    const probe = top + topInset + (height - topInset) / 3;
    let page = 1;
    els.forEach((el, i) => {
      if (el.getBoundingClientRect().top <= probe) page = i + 1;
    });
    setState((prev) => (prev.page === page && prev.pages === els.length ? prev : { page, pages: els.length }));
  }, [contentRef, topInset]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return undefined;
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    schedule();
    const scroller = scrollParent(root);
    const target: HTMLElement | Window = scroller ?? window;
    target.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const mo = new MutationObserver(schedule);
    mo.observe(root, { childList: true, subtree: true });
    const ro = new ResizeObserver(schedule);
    ro.observe(root);
    return () => {
      cancelAnimationFrame(raf);
      target.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      mo.disconnect();
      ro.disconnect();
    };
  }, [contentRef, measure]);

  const goTo = useCallback(
    (n: number) => {
      const root = contentRef.current;
      if (!root) return;
      const els = root.querySelectorAll<HTMLElement>("[data-pdf-page]");
      const el = els[Math.min(els.length, Math.max(1, n)) - 1];
      if (!el) return;
      const scroller = scrollParent(root);
      const delta = el.getBoundingClientRect().top - (scroller ? scroller.getBoundingClientRect().top : 0) - topInset;
      if (scroller) scroller.scrollTo({ top: scroller.scrollTop + delta, behavior: "smooth" });
      else window.scrollTo({ top: window.scrollY + delta, behavior: "smooth" });
    },
    [contentRef, topInset],
  );

  return { ...state, goTo };
}
