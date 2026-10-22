"use client";

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

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

const opener = appOpener<OpenSerpAnalyzerWindowOptions>(OVERLAY_ID, {
  data: (options: OpenSerpAnalyzerWindowOptions = {}) => ({
            url: options.url ?? "",
            title: options.title ?? "",
            description: options.description ?? "",
          }),
});

export const useOpenSerpAnalyzerWindow = opener.useOpen;

export type SerpAnalyzerWindowDefinitionData = OpenSerpAnalyzerWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    serpAnalyzerWindow: OverlayWire<SerpAnalyzerWindowDefinitionData>;
  }
}
