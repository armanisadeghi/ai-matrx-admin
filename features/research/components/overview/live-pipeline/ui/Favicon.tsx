"use client";

import { SiteIcon } from "@/components/official/site-icon/SiteIcon";

interface Props {
  hostname: string | null | undefined;
  /** The site's own icon when the caller already has one (search result favicon). */
  iconUrl?: string | null;
  size?: number;
  className?: string;
}

/** A site's own icon by hostname; Globe only when the site has none. */
export function Favicon({ hostname, iconUrl, size = 16, className }: Props) {
  return <SiteIcon site={hostname} iconUrl={iconUrl} size={size} className={className} />;
}
