"use client";

/**
 * Opener for the `siteDiscoveryWindow` overlay — one site's Business Discovery
 * Ladder, its proposals and its setup doors in a floating panel (KI-040).
 *
 * A window and not a route change, so a person reviewing a site's queue or its
 * keywords keeps that view while they run discovery beside it (P25).
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "siteDiscoveryWindow" as const;

export interface OpenSiteDiscoveryWindowOptions {
  siteId: string;
  brandId?: string | null;
  organizationId?: string | null;
  /** The site's name or domain, for the title — no read needed to render. */
  siteLabel?: string | null;
}

const opener = appOpener<OpenSiteDiscoveryWindowOptions>(OVERLAY_ID, {
  data: (options: OpenSiteDiscoveryWindowOptions) => ({
            siteId: options.siteId,
            brandId: options.brandId ?? "",
            organizationId: options.organizationId ?? "",
            siteLabel: options.siteLabel ?? "",
          }),
});

export const useOpenSiteDiscoveryWindow = opener.useOpen;

export type SiteDiscoveryWindowDefinitionData = OpenSiteDiscoveryWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    siteDiscoveryWindow: OverlayWire<SiteDiscoveryWindowDefinitionData>;
  }
}
