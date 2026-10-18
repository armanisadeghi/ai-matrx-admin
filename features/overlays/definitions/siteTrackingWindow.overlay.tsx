"use client";

/**
 * Opener for the `siteTrackingWindow` overlay — one site's Tag Manager tracking in a floating
 * panel, so a reader comparing sites keeps their list on screen. The window wraps the canonical
 * `SiteTrackingPanel`.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "siteTrackingWindow" as const;

export interface OpenSiteTrackingWindowOptions {
  siteId: string;
  /** The site's name or domain, for the title — no read needed to render. */
  siteLabel?: string | null;
}

export function useOpenSiteTrackingWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (options: OpenSiteTrackingWindowOptions) => {
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

export type SiteTrackingWindowDefinitionData = OpenSiteTrackingWindowOptions;

export const siteTrackingWindowOverlay = /* @__PURE__ */ defineOverlay<SiteTrackingWindowDefinitionData>()({
  id: "siteTrackingWindow",
  label: "Tracking",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { siteId: "", siteLabel: "" },
    windowId: "site-tracking-window",
    mobile: "drawer",
    preservation: {
      dataKeys: ["siteId", "siteLabel"],
      // A restored tracking panel with no site is an empty frame, not a window.
      requiredDataKeys: ["siteId"],
    },
  },
  link: {
    key: "site_tracking",
    hydrate: (ctx) => import("./siteTrackingWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    siteTrackingWindow: OverlayWire<SiteTrackingWindowDefinitionData>;
  }
}
