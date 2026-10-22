"use client";

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "socialCardAnalyzerWindow" as const;

/**
 * Open the canonical Social Cards analyzer window with a page's Open Graph
 * metadata pre-filled. Every field is optional — omit everything to open a
 * blank analyzer.
 */
export interface OpenSocialCardWindowOptions {
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  ogType?: string;
  cardType?: string;
}

const opener = appOpener<OpenSocialCardWindowOptions>(OVERLAY_ID, {
  data: (options: OpenSocialCardWindowOptions = {}) => ({
            url: options.url ?? "",
            title: options.title ?? "",
            description: options.description ?? "",
            image: options.image ?? "",
            siteName: options.siteName ?? "",
            ogType: options.ogType ?? "",
            cardType: options.cardType ?? "",
          }),
});

export const useOpenSocialCardWindow = opener.useOpen;

export type SocialCardAnalyzerWindowDefinitionData = OpenSocialCardWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    socialCardAnalyzerWindow: OverlayWire<SocialCardAnalyzerWindowDefinitionData>;
  }
}
