"use client";

/**
 * Opener for the `scraperWindow` overlay.
 *
 * - `useOpenScraperWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ScraperWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "scraperWindow" as const;

/** Which workspace mode the scraper opens into. */
export type ScraperWindowMode = "web" | "url" | "batch";

export interface OpenScraperWindowOptions {
  /**
   * Seed URL — opens the scraper in single-URL ("url") mode pre-filled with this
   * address so the user can read the page in one click. Used by the search
   * renderer's "Read" affordance (the page-reading entry point). When omitted
   * the scraper opens empty in its default Web-search mode.
   */
  url?: string;
  /** Force a specific workspace mode. Defaults to "url" when a `url` is given. */
  mode?: ScraperWindowMode;
}

export interface ScraperWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createScraperWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (opts: OpenScraperWindowOptions = {}): ScraperWindowHandle => {
    const data =
      opts.url || opts.mode
        ? { url: opts.url, mode: opts.mode ?? (opts.url ? "url" : undefined) }
        : undefined;
    dispatch(openOverlay({ overlayId: OVERLAY_ID, data }));
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  };
}

export function useOpenScraperWindow() {
  const store = useAppStore();
  return useMemo(() => createScraperWindowOpener(store), [store]);
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export function ScraperWindowController(props: OpenScraperWindowOptions): null {
  const open = useOpenScraperWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open]);
  return null;
}

export type ScraperWindowDefinitionData = OpenScraperWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    scraperWindow: OverlayWire<ScraperWindowDefinitionData>;
  }
}
