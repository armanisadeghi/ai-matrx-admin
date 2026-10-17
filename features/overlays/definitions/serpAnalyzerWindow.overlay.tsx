"use client";

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "serpAnalyzerWindow" as const;

/**
 * Open the canonical Search Appearance analyzer window with a page's
 * metadata pre-filled. Every field is optional — omit everything to open a
 * blank analyzer.
 */
export interface OpenSerpAnalyzerWindowOptions {
  url?: string;
  title?: string;
  description?: string;
}

export function useOpenSerpAnalyzerWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (options: OpenSerpAnalyzerWindowOptions = {}) => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            url: options.url ?? "",
            title: options.title ?? "",
            description: options.description ?? "",
          },
        }),
      );
      return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })) };
    },
    [dispatch],
  );
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type SerpAnalyzerWindowDefinitionData = OpenSerpAnalyzerWindowOptions;

export const serpAnalyzerWindowOverlay = defineOverlay<SerpAnalyzerWindowDefinitionData>()({
  id: "serpAnalyzerWindow",
  label: "Search Appearance",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { url: "", title: "", description: "" },
    windowId: "serp-analyzer-window",
    mobile: "fullscreen",
  },
  link: {
    key: "serp_analyzer",
    hydrate: (ctx) => import("./serpAnalyzerWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    serpAnalyzerWindow: OverlayWire<SerpAnalyzerWindowDefinitionData>;
  }
}
