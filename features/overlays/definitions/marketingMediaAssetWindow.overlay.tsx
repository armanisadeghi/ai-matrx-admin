"use client";

/** Typed, callback-aware opener for crawled-media asset details. */

import { useEffect, useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay, mintInstanceId } from "@ai-matrx/summon/open";
import {
  createMarketingMediaAssetCallbackGroup,
  type MarketingMediaAssetWindowHandlers,
} from "./callbacks/marketingMediaAssetWindow";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "marketingMediaAssetWindow" as const;

export interface OpenMarketingMediaAssetWindowOptions extends MarketingMediaAssetWindowHandlers {
  siteId: string;
  assetSrc: string;
  /** Stable id when a caller wants to focus/reuse one particular window. */
  windowInstanceId?: string;
}

export interface MarketingMediaAssetWindowHandle {
  instanceId: string;
  close: () => void;
  dispose: () => void;
}

export function useOpenMarketingMediaAssetWindow() {
  const dispatch = useAppDispatch();

  // The opened window owns its callback group (it releases it on close / its own window-close
  // event); this hook never drops it on unmount — a menu or sheet that opened the window unmounts
  // first (an-opened-window-owns-its-callback-group.test.ts).

  return (
    options: OpenMarketingMediaAssetWindowOptions,
  ): MarketingMediaAssetWindowHandle => {
    let releaseGroup = () => {};
    const instanceId =
      options.windowInstanceId ??
      mintInstanceId(OVERLAY_ID);
    const { callbackGroupId, dispose } = createMarketingMediaAssetCallbackGroup(
      {
        ...options,
        onWindowClose: (event) => {
          options.onWindowClose?.(event);
          // The window closed itself: its group goes with it.
          releaseGroup();
        },
      },
    );

    dispatch(
      openOverlay({
        overlayId: OVERLAY_ID,
        instanceId,
        data: {
          callbackGroupId,
          siteId: options.siteId,
          assetSrc: options.assetSrc,
        },
      }),
    );

    releaseGroup = dispose;

    const close = () => {
      dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId }));
      dispose();
    };
    const detach = () => {
      dispose();
    };

    return { instanceId, close, dispose: detach };
  };
}

export type MarketingMediaAssetWindowDefinitionData = OpenMarketingMediaAssetWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    marketingMediaAssetWindow: OverlayWire<MarketingMediaAssetWindowDefinitionData>;
  }
}
