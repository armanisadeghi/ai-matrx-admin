"use client";

/**
 * Opener for the `siteTrackingWindow` overlay — one site's Tag Manager tracking in a floating
 * panel, so a reader comparing sites keeps their list on screen. The window wraps the canonical
 * `SiteTrackingPanel`.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "siteTrackingWindow" as const;

export interface OpenSiteTrackingWindowOptions {
  siteId: string;
  /** The site's name or domain, for the title — no read needed to render. */
  siteLabel?: string | null;
}

const opener = appOpener<OpenSiteTrackingWindowOptions>(OVERLAY_ID, {
  data: (options: OpenSiteTrackingWindowOptions) => ({
            siteId: options.siteId,
            siteLabel: options.siteLabel ?? "",
          }),
});

export const useOpenSiteTrackingWindow = opener.useOpen;

export type SiteTrackingWindowDefinitionData = OpenSiteTrackingWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    siteTrackingWindow: OverlayWire<SiteTrackingWindowDefinitionData>;
  }
}
