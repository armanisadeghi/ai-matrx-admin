"use client";

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "keywordResearchWindow" as const;

/**
 * Open the canonical Keyword Research window from any surface — the shared
 * launcher + live key-by-key stream feed + compact cluster explorer.
 *
 * Pass `primaryKeyword` to pre-fill the input (a content-plan node's target
 * keyword, a GSC query, a chip the user right-clicked). Add `autoRun: true`
 * to fire the research immediately — use ONLY for an explicit user gesture
 * ("Research this keyword"), never on passive open: a run is a paid
 * agent + provider pipeline.
 */
export interface OpenKeywordResearchWindowOptions {
  primaryKeyword?: string;
  autoRun?: boolean;
  /**
   * MSR-26: pass the site when the opening surface already knows it (a
   * site-scoped page, a page-keyword chip) so the window skips its own site
   * picker. Omitted openers ("anywhere") fall back to the window's own
   * inline site select.
   */
  siteId?: string;
}

export function useOpenKeywordResearchWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (options: OpenKeywordResearchWindowOptions = {}) => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            primaryKeyword: options.primaryKeyword ?? "",
            autoRun: options.autoRun ?? false,
            siteId: options.siteId ?? null,
          },
        }),
      );
      return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })) };
    },
    [dispatch],
  );
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type KeywordResearchWindowDefinitionData = OpenKeywordResearchWindowOptions;

export const keywordResearchWindowOverlay = defineOverlay<KeywordResearchWindowDefinitionData>()({
  id: "keywordResearchWindow",
  label: "Keyword Research",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { primaryKeyword: "", autoRun: false },
    windowId: "keyword-research-window",
    mobile: "fullscreen",
    preservation: { dataKeys: ["primaryKeyword"] },
  },
  link: {
    key: "keyword_research",
    hydrate: (ctx) => import("./keywordResearchWindow.link").then((m) => m.hydrate(ctx)),
  },
  render: () => import("./keywordResearchWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    keywordResearchWindow: OverlayWire<KeywordResearchWindowDefinitionData>;
  }
}
