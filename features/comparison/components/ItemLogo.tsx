"use client";

/**
 * An item's own mark, exactly as its source has it: the company's logo or the place's photo when the
 * source sent one, else the website's favicon, else the first letter. Never tinted, never wrapped in
 * a bubble; while the picture loads, the square shimmers so nothing shifts.
 */

import { useState } from "react";
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

function faviconFor(website: string, size: number): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(website)}&sz=${Math.max(64, size * 2)}`;
}

export function ItemLogo({ name, logoUrl, website, size = 40, fill = false, className }: Props) {
  const sources = [logoUrl, website ? faviconFor(website, size) : null].filter((s): s is string => Boolean(s));
  const [failed, setFailed] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = sources[failed] ?? null;
  const letter = (name.trim()[0] ?? "?").toUpperCase();

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden", fill ? "rounded-lg" : "rounded-md", className)}
      style={{ width: size, height: size }}
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
            onLoad={() => setLoaded(true)}
            onError={() => { setLoaded(false); setFailed((n) => n + 1); }}
            className={cn("h-full w-full", fill && src === logoUrl ? "object-cover" : "object-contain")}
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
