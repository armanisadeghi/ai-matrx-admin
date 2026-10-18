"use client";

/**
 * A website's own icon, from its hostname or URL. The type icon (Globe, Play, …) is only the
 * fallback when no real icon exists. The square is reserved at full size from the first paint and
 * shimmers while the picture loads, so nothing shifts.
 *
 * Sources, in order: the caller's own icon URL (e.g. a search result's favicon), Google's favicon
 * service, then DuckDuckGo's. Google answers an unknown site with its 16px default globe (and a
 * few real sites only have a 16px icon), so a 16px Google answer falls through to DuckDuckGo,
 * which serves real 16px icons and answers unknown sites with a 48px default.
 */

import { useState, type ComponentType } from "react";
import Image from "next/image";
import { Globe } from "lucide-react";

import { cn } from "@/lib/utils";

export function siteHostname(hostnameOrUrl: string | null | undefined): string | null {
  const raw = hostnameOrUrl?.trim();
  if (!raw) return null;
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).hostname || null;
  } catch {
    return null;
  }
}

type Source = { src: string; rejectWidth?: (w: number) => boolean };

function sourcesFor(host: string | null, iconUrl: string | null | undefined): Source[] {
  const out: Source[] = [];
  if (iconUrl) out.push({ src: iconUrl });
  if (host) {
    out.push({
      src: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`,
      rejectWidth: (w) => w <= 16,
    });
    out.push({
      src: `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`,
      rejectWidth: (w) => w === 48,
    });
  }
  return out;
}

interface SiteIconProps {
  /** A hostname or a full URL. */
  site: string | null | undefined;
  /** The site's own icon when the caller already has one (search result favicon, logo). */
  iconUrl?: string | null;
  /** Shown only when the site has no real icon. */
  fallback?: ComponentType<{ className?: string; size?: number }>;
  size?: number;
  className?: string;
}

export function SiteIcon(props: SiteIconProps) {
  // Keyed on the site so a recycled table row never keeps the previous site's fallback state.
  const host = siteHostname(props.site);
  return <SiteIconInner key={`${host ?? ""}|${props.iconUrl ?? ""}`} host={host} {...props} />;
}

function SiteIconInner({
  host,
  iconUrl,
  fallback: Fallback = Globe,
  size = 16,
  className,
}: SiteIconProps & { host: string | null }) {
  const sources = sourcesFor(host, iconUrl);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const current = sources[index] ?? null;

  const settle = (img: HTMLImageElement) => {
    if (current?.rejectWidth?.(img.naturalWidth)) {
      setIndex((i) => i + 1);
      return;
    }
    setLoaded(true);
  };
  // A cached picture can finish before React attaches onLoad; settle it on mount.
  const settleIfAlreadyLoaded = (img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) settle(img);
  };

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {current ? (
        <>
          {!loaded ? <span className="absolute inset-0 animate-pulse rounded-[inherit] bg-muted" /> : null}
          <Image
            key={current.src}
            src={current.src}
            alt=""
            width={size}
            height={size}
            unoptimized
            referrerPolicy="no-referrer"
            ref={settleIfAlreadyLoaded}
            onLoad={(e) => settle(e.currentTarget)}
            onError={() => {
              setLoaded(false);
              setIndex((i) => i + 1);
            }}
            className={cn("h-full w-full object-contain", !loaded && "opacity-0")}
          />
        </>
      ) : (
        <Fallback className="h-full w-full text-muted-foreground" size={size} />
      )}
    </span>
  );
}
