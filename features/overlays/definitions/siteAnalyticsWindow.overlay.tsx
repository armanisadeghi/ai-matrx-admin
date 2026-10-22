"use client";

/**
 * Opener for the `siteAnalyticsWindow` overlay — one site's Google Analytics in
 * a floating panel, so a reader comparing sites keeps their list on screen.
 * The window wraps the canonical `SiteAnalyticsPanel`.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "siteAnalyticsWindow" as const;

export interface OpenSiteAnalyticsWindowOptions {
  siteId: string;
  /** The site's name or domain, for the title — no read needed to render. */
  siteLabel?: string | null;
}

const opener = appOpener<OpenSiteAnalyticsWindowOptions>(OVERLAY_ID, {
  data: (options: OpenSiteAnalyticsWindowOptions) => ({
            siteId: options.siteId,
            siteLabel: options.siteLabel ?? "",
          }),
});

export const useOpenSiteAnalyticsWindow = opener.useOpen;

export type SiteAnalyticsWindowDefinitionData = OpenSiteAnalyticsWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    siteAnalyticsWindow: OverlayWire<SiteAnalyticsWindowDefinitionData>;
  }
}
