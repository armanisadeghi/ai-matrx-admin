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

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "siteQuickViewWindow" as const;

export interface OpenSiteQuickViewWindowOptions {
  siteId: string;
  /** The site's name if the caller already knows it — shown while it loads. */
  siteLabel?: string | null;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createSiteQuickViewWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (options: OpenSiteQuickViewWindowOptions) => {
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
  };
}

export function useOpenSiteQuickViewWindow() {
  const store = useAppStore();
  return useMemo(() => createSiteQuickViewWindowOpener(store), [store]);
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

export type SiteQuickViewWindowDefinitionData = OpenSiteQuickViewWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    siteQuickViewWindow: OverlayWire<SiteQuickViewWindowDefinitionData>;
  }
}
