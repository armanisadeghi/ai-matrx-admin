"use client";

import { cn } from "@/lib/utils";
import { SiteIcon } from "@ai-matrx/design-system/site-icon";

interface SourceFaviconProps {
  hostname: string | null;
  /** The site's own icon when the source carries one (search result favicon). */
  iconUrl?: string | null;
  /** Icon size inside the tile. */
  size?: number;
  className?: string;
}

/** Source avatar tile: the site's own icon, Globe only when the site has none. */
export function SourceFavicon({ hostname, iconUrl, size = 20, className }: SourceFaviconProps) {
  return (
    <span className={cn("flex items-center justify-center rounded-md bg-background/60", className)}>
      <SiteIcon site={hostname} iconUrl={iconUrl} size={size} />
    </span>
  );
}
