"use client";

/**
 * Opener for the `siteQuickViewWindow` overlay — one site's Quick view, opened
 * from nothing but its id, so a reader who meets a site anywhere (a Search
 * Console answer in chat, a reference chip, a table cell) can look at it
 * without leaving what they were reading (F-87).
 *
 * The window wraps the canonical `SitePeekWindow`; see
 * `features/window-panels/windows/marketing/SiteQuickViewWindow.tsx`.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "siteQuickViewWindow" as const;

export interface OpenSiteQuickViewWindowOptions {
  siteId: string;
  /** The site's name if the caller already knows it — shown while it loads. */
  siteLabel?: string | null;
}

export function useOpenSiteQuickViewWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (options: OpenSiteQuickViewWindowOptions) => {
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

/** Declarative form — lifecycle = mount/unmount. */
export function SiteQuickViewWindowController(
  props: OpenSiteQuickViewWindowOptions,
): null {
  const open = useOpenSiteQuickViewWindow();
  useEffect(() => {
    const handle = open({ siteId: props.siteId, siteLabel: props.siteLabel });
    return () => {
      handle.close();
    };
  }, [open, props.siteId, props.siteLabel]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type SiteQuickViewWindowDefinitionData = OpenSiteQuickViewWindowOptions;

export const siteQuickViewWindowOverlay = defineOverlay<SiteQuickViewWindowDefinitionData>()({
  id: "siteQuickViewWindow",
  label: "Site Quick view",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { siteId: "", siteLabel: "" },
    windowId: "site-quick-view-window",
    mobile: "drawer",
    preservation: {
      dataKeys: ["siteId", "siteLabel"],
      // A restored Quick view with no site is an empty frame, not a window.
      requiredDataKeys: ["siteId"],
    },
  },
  link: {
    key: "site_quick_view",
    hydrate: (ctx) => import("./siteQuickViewWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    siteQuickViewWindow: OverlayWire<SiteQuickViewWindowDefinitionData>;
  }
}
