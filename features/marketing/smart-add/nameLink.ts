import { linkInBioService } from "@/features/marketing/lib/link-in-bio";
import { detectPlatform, parseSocialAccount } from "@/features/marketing/social/link";
import type { SocialPlatform } from "@/features/marketing/social/types";
import { websiteProblem } from "./entryOutcome";

export function looksLikeDomain(text: string): boolean {
  return /^[^\s@]+\.[a-z]{2,}(\/.*)?$/i.test(text.trim().replace(/^https?:\/\//i, ""));
}

export interface NameLinkRoute {
  website: string;
  social: string;
  platform: SocialPlatform | null;
}

/**
 * MKT-146: a link typed in the Company name box is a website, a link-in-bio page or a social account, never a
 * business name. Same recognition as the website and social boxes; null = it is a name.
 */
export function routeNameLink(text: string): NameLinkRoute | null {
  const t = text.trim();
  if (!t || /\s/.test(t) || !looksLikeDomain(t)) return null;
  if (linkInBioService(t)) return { website: "", social: t, platform: null };
  const account = parseSocialAccount(t, null);
  if (account.status === "ok" && account.detected) return { website: "", social: t, platform: account.platform };
  // A post, or a page of a social site that names no account, is not a website either.
  if (account.status === "post" || detectPlatform(t)) return null;
  return websiteProblem(t) ? null : { website: t, social: "", platform: null };
}
