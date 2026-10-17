"use client";

/**
 * Opener for the `siteDiscoveryWindow` overlay — one site's Business Discovery
 * Ladder, its proposals and its setup doors in a floating panel (KI-040).
 *
 * A window and not a route change, so a person reviewing a site's queue or its
 * keywords keeps that view while they run discovery beside it (P25).
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "siteDiscoveryWindow" as const;

export interface OpenSiteDiscoveryWindowOptions {
  siteId: string;
  brandId?: string | null;
  organizationId?: string | null;
  /** The site's name or domain, for the title — no read needed to render. */
  siteLabel?: string | null;
}

export function useOpenSiteDiscoveryWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (options: OpenSiteDiscoveryWindowOptions) => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            siteId: options.siteId,
            brandId: options.brandId ?? "",
            organizationId: options.organizationId ?? "",
            siteLabel: options.siteLabel ?? "",
          },
        }),
      );
      return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })) };
    },
    [dispatch],
  );
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type SiteDiscoveryWindowDefinitionData = OpenSiteDiscoveryWindowOptions;

export const siteDiscoveryWindowOverlay = defineOverlay<SiteDiscoveryWindowDefinitionData>()({
  id: "siteDiscoveryWindow",
  label: "Business discovery",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          siteId: "",
          brandId: "",
          organizationId: "",
          siteLabel: "",
        },
    windowId: "site-discovery-window",
    mobile: "fullscreen",
    preservation: {
      dataKeys: ["siteId", "brandId", "organizationId", "siteLabel"],
    },
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    siteDiscoveryWindow: OverlayWire<SiteDiscoveryWindowDefinitionData>;
  }
}
