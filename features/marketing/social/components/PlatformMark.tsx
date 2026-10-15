"use client";

/**
 * The platform mark for social rows and cards. The marketing feature already
 * ships the official glyph-on-brand-color set (`PropertyKindMark`, covering
 * every social platform); this is the social feature's one entry to it, so a
 * platform name from `social.*` (which has no `other`) resolves in one place.
 */

import { PropertyKindMark } from "@/features/marketing/components/shared/PropertyKindMark";

import { Github, Gitlab } from "@/components/icons/brand-icons";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import { profileSite, type ProfileSite } from "../profile-sites";
import { SOCIAL_PLATFORM_LABELS, isSocialPlatform } from "../types";

export function platformLabel(platform: string): string {
  return isSocialPlatform(platform) ? SOCIAL_PLATFORM_LABELS[platform] : (profileSite(platform)?.label ?? platform);
}

/** Profile sites with a glyph in our icon sets; the rest show their initials on the site's own colour. */
const SITE_GLYPHS: Record<string, LucideIcon> = { github: Github, gitlab: Gitlab };

/** A developer / creator profile site's mark (GitHub, Substack, Bluesky…): its own colour, glyph or initials. */
function ProfileSiteMark({ site, size, className }: { site: ProfileSite; size: number; className?: string }) {
  const Glyph = SITE_GLYPHS[site.id];
  const initials = site.label.replace(/[^A-Za-z0-9 ]/g, "").split(" ").map((w) => w[0]).join("").slice(0, 2);
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-md font-semibold leading-none shadow-sm", site.tile, className)}
      style={{ width: size, height: size, fontSize: Math.max(8, Math.round(size * 0.42)) }}
    >
      {Glyph ? <Glyph style={{ width: size * 0.55, height: size * 0.55 }} /> : initials}
    </span>
  );
}

export function PlatformMark({
  platform,
  size = 20,
  className,
}: {
  platform: string;
  size?: number;
  className?: string;
}) {
  const site = isSocialPlatform(platform) ? null : profileSite(platform);
  return (
    <span title={platformLabel(platform)} className="inline-flex shrink-0">
      {site ? (
        <ProfileSiteMark site={site} size={size} className={className} />
      ) : (
        <PropertyKindMark kind={platform} size={size} className={className} />
      )}
    </span>
  );
}
