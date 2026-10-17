"use client";

/**
 * Opener for the `siteAnalyticsWindow` overlay — one site's Google Analytics in
 * a floating panel, so a reader comparing sites keeps their list on screen.
 * The window wraps the canonical `SiteAnalyticsPanel`.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "siteAnalyticsWindow" as const;

export interface OpenSiteAnalyticsWindowOptions {
  siteId: string;
  /** The site's name or domain, for the title — no read needed to render. */
  siteLabel?: string | null;
}

export function useOpenSiteAnalyticsWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (options: OpenSiteAnalyticsWindowOptions) => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            siteId: options.siteId,
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

export type SiteAnalyticsWindowDefinitionData = OpenSiteAnalyticsWindowOptions;

export const siteAnalyticsWindowOverlay = defineOverlay<SiteAnalyticsWindowDefinitionData>()({
  id: "siteAnalyticsWindow",
  label: "Google Analytics",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { siteId: "", siteLabel: "" },
    windowId: "site-analytics-window",
    mobile: "drawer",
    preservation: {
      dataKeys: ["siteId", "siteLabel"],
      requiredDataKeys: ["siteId"],
    },
  },
  link: {
    key: "site_analytics",
    hydrate: (ctx) => import("./siteAnalyticsWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    siteAnalyticsWindow: OverlayWire<SiteAnalyticsWindowDefinitionData>;
  }
}
