"use client";

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

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

const opener = appOpener<OpenKeywordWindowOptions>(OVERLAY_ID, {
  data: (options: OpenKeywordWindowOptions = {}) => ({
            phrase: options.phrase ?? "",
            targetPhrase: options.phrase ?? "",
            history: [],
            organizationId: options.organizationId ?? "",
            siteId: options.siteId ?? "",
            pageId: options.pageId ?? "",
            brandId: options.brandId ?? "",
            activeTab: options.tab ?? "overview",
          }),
});

export const useOpenKeywordWindow = opener.useOpen;

export type KeywordWindowDefinitionData = OpenKeywordWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    keywordWindow: OverlayWire<KeywordWindowDefinitionData>;
  }
}
