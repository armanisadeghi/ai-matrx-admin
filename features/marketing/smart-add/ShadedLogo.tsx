"use client";

import { useState } from "react";
import { browserImageUrl } from "@/lib/media/external-image";
import { brightnessOf, LOGO_TILE_BG, shadeForBrightness } from "./logo-shade";

type Shade = "light" | "dark" | "checker";

/**
 * The ONE way a found logo is drawn: raw (never tinted), loaded through our image proxy so its brightness can be
 * read, on the backdrop that brightness asks for. A white or transparent-white logo gets the dark backdrop instead of
 * vanishing on a white card (2026-10-22: Smart Add validate showed a blank card for a white logo).
 *
 * `tile="always"` — a tile in every case (light / dark / checker, as Smart Add's logo choices).
 * `tile="when-needed"` — the logo sits bare on the page; only a logo that needs the dark backdrop gets one.
 */
export function ShadedLogo({
  url,
  tile = "when-needed",
  className = "",
  imgClassName = "max-h-full max-w-full object-contain",
  onError,
  testId,
}: {
  url: string;
  tile?: "always" | "when-needed";
  /** The wrapper's size and shape. */
  className?: string;
  imgClassName?: string;
  onError?: () => void;
  testId?: string;
}) {
  const [shade, setShade] = useState<Shade>("checker");
  const backdrop =
    tile === "always" ? LOGO_TILE_BG[shade] : shade === "dark" ? `${LOGO_TILE_BG.dark} rounded-md p-[6%]` : "";
  return (
    <span className={`inline-flex items-center justify-center overflow-hidden ${backdrop} ${className}`} data-testid={testId} data-shade={shade}>
      <img
        src={browserImageUrl(url)}
        alt=""
        className={imgClassName}
        onLoad={(e) => setShade(shadeForBrightness(brightnessOf(e.currentTarget)))}
        onError={onError}
      />
    </span>
  );
}
