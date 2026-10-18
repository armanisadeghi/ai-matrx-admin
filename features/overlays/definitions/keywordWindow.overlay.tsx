"use client";

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "keywordWindow" as const;

/**
 * Open the canonical Keyword Intelligence window — everything the platform
 * knows about one keyword in one floating tabbed panel. Every field is
 * optional: pass a site/page/brand binding to light up the site-scoped tabs
 * (Site performance, Rankings, SERP); omit everything for a blank window.
 */
export interface OpenKeywordWindowOptions {
  phrase?: string;
  organizationId?: string;
  siteId?: string;
  pageId?: string;
  brandId?: string;
  /** Land on a specific dossier tab. Old rankings/serp values migrate to the AI-visibility tab. */
  tab?: string;
}

export function useOpenKeywordWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (options: OpenKeywordWindowOptions = {}) => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            phrase: options.phrase ?? "",
            targetPhrase: options.phrase ?? "",
            history: [],
            organizationId: options.organizationId ?? "",
            siteId: options.siteId ?? "",
            pageId: options.pageId ?? "",
            brandId: options.brandId ?? "",
            activeTab: options.tab ?? "overview",
          },
        }),
      );
      return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })) };
    },
    [dispatch],
  );
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type KeywordWindowDefinitionData = OpenKeywordWindowOptions;

export const keywordWindowOverlay = defineOverlay<KeywordWindowDefinitionData>()({
  id: "keywordWindow",
  label: "Keyword Intelligence",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          phrase: "",
          targetPhrase: "",
          history: [],
          organizationId: "",
          siteId: "",
          pageId: "",
          brandId: "",
          activeTab: "overview",
        },
    windowId: "keyword-window",
    mobile: "fullscreen",
    preservation: {
      dataKeys: [
        "phrase",
        "targetPhrase",
        "history",
        "activeTab",
        "organizationId",
        "siteId",
        "pageId",
        "brandId",
      ],
    },
  },
  link: {
    key: "keyword",
    hydrate: (ctx) => import("./keywordWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    keywordWindow: OverlayWire<KeywordWindowDefinitionData>;
  }
}
