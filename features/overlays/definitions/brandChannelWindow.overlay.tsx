"use client";

/**
 * Opener for the `brandChannelWindow` overlay — one client's owned YouTube
 * channel in a floating panel, so a reader comparing clients keeps their list
 * on screen. The window wraps the canonical `BrandChannelPanel`.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "brandChannelWindow" as const;

export interface OpenBrandChannelWindowOptions {
  brandId: string;
  /** The client's name, for the title — no read needed to render. */
  brandLabel?: string | null;
}

const opener = appOpener<OpenBrandChannelWindowOptions>(OVERLAY_ID, {
  data: (options: OpenBrandChannelWindowOptions) => ({
            brandId: options.brandId,
            brandLabel: options.brandLabel ?? "",
          }),
});

export const useOpenBrandChannelWindow = opener.useOpen;

export type BrandChannelWindowDefinitionData = OpenBrandChannelWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    brandChannelWindow: OverlayWire<BrandChannelWindowDefinitionData>;
  }
}
