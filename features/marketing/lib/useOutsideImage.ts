"use client";

import { useState } from "react";
import { cdnMirrorOriginUrl, proxiedExternalImageUrl } from "@/lib/media/external-image";

/**
 * An outside picture with honest fallbacks: direct → our image proxy (hotlink / CORP refusals) →
 * the original behind an optimizer-CDN mirror (those copies expire) → failed. `imgProps` (and `imgKey`) go on
 * the <img>; `failed` tells the caller to draw its own stand-in.
 */
export function useOutsideImage(url: string | null | undefined) {
  const [step, setStep] = useState<"direct" | "proxy" | "origin" | "failed">("direct");
  const [loaded, setLoaded] = useState(false);
  const origin = url ? cdnMirrorOriginUrl(url) : null;
  const outside = Boolean(url && /^https?:\/\//i.test(url));
  const src = !url
    ? null
    : step === "proxy"
      ? proxiedExternalImageUrl(url)
      : step === "origin" && origin
        ? proxiedExternalImageUrl(origin)
        : url;
  const fail = () =>
    setStep((prev) => (prev === "direct" && outside ? "proxy" : prev === "proxy" && origin ? "origin" : "failed"));
  return {
    src: step === "failed" ? null : src,
    failed: Boolean(url) && step === "failed",
    loaded,
    /** The host to name on a failed stand-in: the site's own when the URL was a CDN mirror. */
    host: hostOf(origin ?? url ?? ""),
    /** Remounts the <img> per try, so the mount check reads the new picture. */
    imgKey: src ?? "none",
    imgProps: {
      src: src ?? undefined,
      // A picture that failed before hydration never fires onError: read its state on mount.
      ref: (img: HTMLImageElement | null) => {
        if (img?.complete) {
          if (img.naturalWidth > 0) setLoaded(true);
          else fail();
        }
      },
      onLoad: () => setLoaded(true),
      onError: fail,
    },
  };
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
