"use client";

/**
 * Opener for the `brandChannelWindow` overlay — one client's owned YouTube
 * channel in a floating panel, so a reader comparing clients keeps their list
 * on screen. The window wraps the canonical `BrandChannelPanel`.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "brandChannelWindow" as const;

export interface OpenBrandChannelWindowOptions {
  brandId: string;
  /** The client's name, for the title — no read needed to render. */
  brandLabel?: string | null;
}

export function useOpenBrandChannelWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (options: OpenBrandChannelWindowOptions) => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            brandId: options.brandId,
            brandLabel: options.brandLabel ?? "",
          },
        }),
      );
      return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })) };
    },
    [dispatch],
  );
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type BrandChannelWindowDefinitionData = OpenBrandChannelWindowOptions;

export const brandChannelWindowOverlay = /* @__PURE__ */ defineOverlay<BrandChannelWindowDefinitionData>()({
  id: "brandChannelWindow",
  label: "YouTube channel",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { brandId: "", brandLabel: "" },
    windowId: "brand-channel-window",
    mobile: "drawer",
    preservation: {
      dataKeys: ["brandId", "brandLabel"],
      // A restored channel window with no brand is an empty frame, not a window.
      requiredDataKeys: ["brandId"],
    },
  },
  link: {
    key: "brand_channel",
    hydrate: (ctx) => import("./brandChannelWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    brandChannelWindow: OverlayWire<BrandChannelWindowDefinitionData>;
  }
}
