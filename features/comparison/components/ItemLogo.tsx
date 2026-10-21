"use client";

/**
 * An item's own mark, exactly as its source has it: the company's logo or the place's photo when the
 * source sent one, else the website's favicon, else the first letter. Never tinted or recolored.
 * In dark mode only, a logo sits RAW on a neutral light rounded chip so dark marks stay readable
 * (light mode and place photos are untouched); while the picture loads, the square shimmers so
 * nothing shifts.
 */

import { useCallback, useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

interface Props {
  name: string;
  logoUrl?: string | null;
  website?: string | null;
  size?: number;
  /** Photos (a place) fill the square; logos and favicons keep their own shape. */
  fill?: boolean;
  className?: string;
}

/**
 * Pictures a source serves when it has none of its own (the review site's grey default business image, page
 * screenshots): treated as no picture, so the favicon (then the letter) shows. Same list as aidream
 * `services/comparison/kinds.PLACEHOLDER_PICTURES`; here too so runs saved before the server fix render right.
 */
export const PLACEHOLDER_PICTURES = ["default-business-unit-image", "businessunitprofile-cdn.trustpilot.net/default", "/screenshots/"];

export function realPicture(url: string | null | undefined): string | null {
  if (!url) return null;
  const low = url.toLowerCase();
  return PLACEHOLDER_PICTURES.some((p) => low.includes(p)) ? null : url;
}

/** A picture this much wider (or taller) than a square is a wordmark, not a photo: it is never cropped. */
const WORDMARK_RATIO = 1.6;

function faviconFor(website: string, size: number): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(website)}&sz=${Math.max(64, size * 2)}`;
}

export function ItemLogo({ name, logoUrl: given, website, size = 40, fill = false, className }: Props) {
  const logoUrl = realPicture(given);
  const sources = [logoUrl, website ? faviconFor(website, size) : null].filter((s): s is string => Boolean(s));
  const [failed, setFailed] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // A wordmark (Amazon's wide logo) served as the "picture" must show whole: cover would crop it to "mazo".
  const [wordmark, setWordmark] = useState(false);
  const src = sources[failed] ?? null;
  const photo = fill && src === logoUrl && !wordmark;
  const letter = (name.trim()[0] ?? "?").toUpperCase();

  // A site the favicon service doesn't know comes back as its 16px default globe: that is not the
  // item's mark, so fall through to the next source (or the letter).
  const settle = useCallback((img: HTMLImageElement) => {
    if (!photo && img.naturalWidth > 0 && img.naturalWidth <= 16) {
      setFailed((n) => n + 1);
      return;
    }
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      const ratio = img.naturalWidth / img.naturalHeight;
      setWordmark(ratio > WORDMARK_RATIO || ratio < 1 / WORDMARK_RATIO);
    }
    setLoaded(true);
  }, [photo]);
  // A cached picture can finish loading before React attaches onLoad; settle it on mount so the
  // shimmer never stays over a picture that is already there.
  const settleIfAlreadyLoaded = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) settle(img);
  }, [settle]);

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden", fill ? "rounded-lg" : "rounded-md",
        src && !photo && "dark:rounded-lg dark:bg-neutral-100 dark:p-[var(--logo-pad)]", className)}
      // Fixed pixels, never a percentage: percent padding resolves against the PARENT's width and
      // crushed small chips' logos to 0-3px.
      style={{ width: size, height: size, ["--logo-pad" as string]: `${Math.max(2, Math.round(size * 0.1))}px` }}
      aria-hidden
    >
      {src ? (
        <>
          {!loaded ? <span className="absolute inset-0 animate-pulse rounded-[inherit] bg-muted" /> : null}
          <Image
            key={src}
            src={src}
            alt=""
            width={size}
            height={size}
            unoptimized
            ref={settleIfAlreadyLoaded}
            onLoad={(e) => settle(e.currentTarget)}
            onError={() => { setLoaded(false); setFailed((n) => n + 1); }}
            className={cn("h-full w-full", photo ? "object-cover" : "object-contain")}
          />
        </>
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-[inherit] border border-border font-semibold text-muted-foreground"
          style={{ fontSize: Math.round(size * 0.42) }}
        >
          {letter}
        </span>
      )}
    </span>
  );
}
