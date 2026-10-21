"use client";

/**
 * Logo tones: whether a see-through logo is drawn light or dark, so its tile takes a backdrop it shows on
 * (a white wordmark on a white card disappears). Shared by the asset gallery and the brand Overview's look.
 */

import { useEffect, useState } from "react";
import { proxiedExternalImageUrl } from "@/lib/media/external-image";

export type Tone = "light" | "dark";

/**
 * A transparent logo drawn for a dark (or light) header disappears on a same-colored tile — a
 * white wordmark on a white card. Each image is sampled once through our same-origin image proxy
 * (a cross-origin canvas cannot be read) and only the tile's backdrop changes, never its size.
 */
export function useLogoTones(urls: string[]): Map<string, Tone> {
  const key = [...new Set(urls)].sort().join("\n");
  const [tones, setTones] = useState<{ key: string; map: Map<string, Tone> }>({ key: "", map: new Map() });
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const found = new Map<string, Tone>();
    void Promise.all(
      key.split("\n").map(async (url) => {
        try {
          const img = new Image();
          img.src = proxiedExternalImageUrl(url);
          await img.decode();
          const scale = Math.min(1, 64 / Math.max(img.naturalWidth, img.naturalHeight));
          const w = Math.max(1, Math.round(img.naturalWidth * scale));
          const h = Math.max(1, Math.round(img.naturalHeight * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h).data;
          let opaque = 0;
          let lum = 0;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 40) {
              opaque += 1;
              lum += (data[i] + data[i + 1] + data[i + 2]) / 3;
            }
          }
          const pixels = data.length / 4;
          // Only see-through images take their backdrop from the page; a solid image carries its own.
          if (opaque === 0 || opaque > pixels * 0.95) return;
          const avg = lum / opaque;
          if (avg > 200) found.set(url, "light");
          else if (avg < 55) found.set(url, "dark");
        } catch {
          // Unreadable image: the default tile stays.
        }
      }),
    ).then(() => {
      if (!cancelled) setTones({ key, map: found });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return tones.key === key ? tones.map : new Map();
}

/** Backdrop that keeps a see-through logo visible in both themes. */
export const TONE_BACKDROP: Record<Tone, string> = {
  light: "bg-foreground dark:bg-card",
  dark: "bg-card dark:bg-foreground",
};

