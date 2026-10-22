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

import { useMemo } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { AppDispatch } from "@/lib/redux/store";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./hook-controller";

const OVERLAY_ID = "siteQuickViewWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

export interface OpenSiteQuickViewWindowOptions {
  siteId: string;
  /** The site's name if the caller already knows it — shown while it loads. */
  siteLabel?: string | null;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createSiteQuickViewWindowOpener(store: { dispatch: AppDispatch }) {
  const dispatch = store.dispatch;
  return (options: OpenSiteQuickViewWindowOptions) => {
    opener.open(dispatch, { data: {
          siteId: options.siteId,
          siteLabel: options.siteLabel ?? "",
        } });
    return { close: () => dispatch(opener.close()) };
  };
}

export function useOpenSiteQuickViewWindow() {
  const dispatch = useAppDispatch();
  return useMemo(() => createSiteQuickViewWindowOpener({ dispatch }), [dispatch]);
}

/** Declarative form — lifecycle = mount/unmount. */
export const SiteQuickViewWindowController = hookController<OpenSiteQuickViewWindowOptions>(useOpenSiteQuickViewWindow, (props: OpenSiteQuickViewWindowOptions) => ({ siteId: props.siteId, siteLabel: props.siteLabel }));

export type SiteQuickViewWindowDefinitionData = OpenSiteQuickViewWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    siteQuickViewWindow: OverlayWire<SiteQuickViewWindowDefinitionData>;
  }
}
