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

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
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

export function useOpenScraperWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenScraperWindowOptions = {}): ScraperWindowHandle => {
      const data =
        opts.url || opts.mode
          ? { url: opts.url, mode: opts.mode ?? (opts.url ? "url" : undefined) }
          : undefined;
      dispatch(openOverlay({ overlayId: OVERLAY_ID, data }));
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
      };
    },
    [dispatch],
  );
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

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ScraperWindowDefinitionData = OpenScraperWindowOptions;

export const scraperWindowOverlay = defineOverlay<ScraperWindowDefinitionData>()({
  id: "scraperWindow",
  label: "Scraper Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          mode: "single",
          url: "",
          keyword: "",
          maxPages: 1,
          results: [],
          scrapeStates: {},
          selectedIndex: null,
          activeTab: "results",
        },
    windowId: "scraper-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
  },
  link: {
    key: "scraper",
    hydrate: (ctx) => import("./scraperWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    scraperWindow: OverlayWire<ScraperWindowDefinitionData>;
  }
}
