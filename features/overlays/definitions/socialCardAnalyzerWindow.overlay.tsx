"use client";

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

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

export function useOpenSocialCardWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (options: OpenSocialCardWindowOptions = {}) => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            url: options.url ?? "",
            title: options.title ?? "",
            description: options.description ?? "",
            image: options.image ?? "",
            siteName: options.siteName ?? "",
            ogType: options.ogType ?? "",
            cardType: options.cardType ?? "",
          },
        }),
      );
      return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })) };
    },
    [dispatch],
  );
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type SocialCardAnalyzerWindowDefinitionData = OpenSocialCardWindowOptions;

export const socialCardAnalyzerWindowOverlay = /* @__PURE__ */ defineOverlay<SocialCardAnalyzerWindowDefinitionData>()({
  id: "socialCardAnalyzerWindow",
  label: "Social Cards",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          url: "",
          title: "",
          description: "",
          image: "",
          siteName: "",
          ogType: "",
          cardType: "",
        },
    windowId: "social-card-window",
    mobile: "fullscreen",
  },
  link: {
    key: "social_cards",
    hydrate: (ctx) => import("./socialCardAnalyzerWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    socialCardAnalyzerWindow: OverlayWire<SocialCardAnalyzerWindowDefinitionData>;
  }
}
