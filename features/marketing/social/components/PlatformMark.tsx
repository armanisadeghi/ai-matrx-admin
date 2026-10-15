"use client";

/**
 * The platform mark for social rows and cards. The marketing feature already
 * ships the official glyph-on-brand-color set (`PropertyKindMark`, covering
 * every social platform); this is the social feature's one entry to it, so a
 * platform name from `social.*` (which has no `other`) resolves in one place.
 */

import { PropertyKindMark } from "@/features/marketing/components/shared/PropertyKindMark";

import {
  Bandcamp,
  Behance,
  Bluesky,
  DevTo,
  Dribbble,
  Github,
  Gitlab,
  Hashnode,
  HuggingFace,
  Kaggle,
  Keybase,
  Kofi,
  Mastodon,
  Medium,
  Patreon,
  ProductHunt,
  Soundcloud,
  StackOverflow,
  Substack,
  Twitch,
} from "@ai-matrx/icons/brand";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import { SOCIAL_PLATFORM_LABELS, isSocialPlatform } from "../types";
import { profileSite } from "../profile-sites";

export function platformLabel(platform: string): string {
  return isSocialPlatform(platform) ? SOCIAL_PLATFORM_LABELS[platform] : (profileSite(platform)?.label ?? platform);
}

/**
 * The real mark of each developer / creator site (Simple Icons, CC0), drawn raw: the brand's own colour on nothing
 * (no tile, no tint). `ink` is a black brand mark; it flips to white in the dark theme so it stays readable.
 * Mastodon and Twitch are also social platforms, so they are resolved here before the generic glyph-on-colour mark.
 */
const SITE_MARKS: Record<string, { Glyph: LucideIcon; color: string }> = {
  github: { Glyph: Github, color: "ink" },
  gitlab: { Glyph: Gitlab, color: "#FC6D26" },
  stackoverflow: { Glyph: StackOverflow, color: "#F58025" },
  huggingface: { Glyph: HuggingFace, color: "#FFD21E" },
  kaggle: { Glyph: Kaggle, color: "#20BEFF" },
  devto: { Glyph: DevTo, color: "ink" },
  hashnode: { Glyph: Hashnode, color: "#2962FF" },
  medium: { Glyph: Medium, color: "ink" },
  substack: { Glyph: Substack, color: "#FF6719" },
  behance: { Glyph: Behance, color: "#1769FF" },
  dribbble: { Glyph: Dribbble, color: "#EA4C89" },
  producthunt: { Glyph: ProductHunt, color: "#DA552F" },
  keybase: { Glyph: Keybase, color: "#33A0FF" },
  mastodon: { Glyph: Mastodon, color: "#6364FF" },
  bluesky: { Glyph: Bluesky, color: "#0085FF" },
  twitch: { Glyph: Twitch, color: "#9146FF" },
  soundcloud: { Glyph: Soundcloud, color: "#FF5500" },
  bandcamp: { Glyph: Bandcamp, color: "#408294" },
  patreon: { Glyph: Patreon, color: "ink" },
  kofi: { Glyph: Kofi, color: "#FF5E5B" },
};

export function PlatformMark({
  platform,
  size = 20,
  className,
}: {
  platform: string;
  size?: number;
  className?: string;
}) {
  const mark = SITE_MARKS[platform];
  return (
    <span title={platformLabel(platform)} className="inline-flex shrink-0">
      {mark ? (
        <mark.Glyph
          aria-hidden
          size={size}
          className={cn("shrink-0", mark.color === "ink" && "text-black dark:text-white", className)}
          style={mark.color === "ink" ? undefined : { color: mark.color }}
        />
      ) : (
        <PropertyKindMark kind={platform} size={size} className={className} />
      )}
    </span>
  );
}
