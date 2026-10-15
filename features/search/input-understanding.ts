/**
 * What the search box was given — words, a social handle, a profile or post
 * link, a web address, or an image address — so the page can do the one
 * obvious thing with it. Pure; reuses the social module's link parser
 * (`features/marketing/social/link.ts`) so a handle or profile link means the
 * same thing here as everywhere else on the platform.
 */

import { classifySocialLink } from "@/features/marketing/social/link";
import type { SocialPlatform } from "@/features/marketing/social/types";
import type { SearchInputMode } from "./types";

export type UnderstoodInput =
  | { mode: "words"; text: string }
  | { mode: "handle"; handle: string }
  | { mode: "profile"; platform: SocialPlatform; handle: string; url: string }
  | { mode: "post"; platform: SocialPlatform; url: string }
  | { mode: "link"; url: string }
  | { mode: "image"; url: string };

/** Platforms offered as one-click chips for a bare `@handle`, in Google-ish order of reach. */
export const HANDLE_LOOKUP_PLATFORMS: readonly SocialPlatform[] = [
  "tiktok",
  "instagram",
  "youtube",
  "x",
  "linkedin",
  "facebook",
  "threads",
  "pinterest",
  "reddit",
];

const HANDLE_RE = /^@([A-Za-z0-9][A-Za-z0-9._-]{0,59})$/;
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|avif|bmp)(\?.*)?$/i;
/** Bare domains count as addresses only on a familiar ending ("node.js" stays words). */
const COMMON_TLD_RE =
  /\.(com|org|net|io|co|ai|app|dev|edu|gov|us|uk|ca|de|fr|es|it|nl|au|in|jp|me|info|biz|shop|store|news|tv|ly|so)$/i;

function asUrl(text: string): URL | null {
  if (/\s/.test(text)) return null;
  const hasScheme = /^https?:\/\//i.test(text);
  const looksLikeAddress =
    hasScheme ||
    /^www\./i.test(text) ||
    /^[a-z0-9-]+(\.[a-z0-9-]+)+\/\S*$/i.test(text) ||
    (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(text) && COMMON_TLD_RE.test(text));
  if (!looksLikeAddress) return null;
  try {
    const url = new URL(hasScheme ? text : `https://${text}`);
    return url.hostname.includes(".") ? url : null;
  } catch {
    return null;
  }
}

export function understandInput(raw: string): UnderstoodInput {
  const text = raw.trim();
  const handle = HANDLE_RE.exec(text);
  if (handle) return { mode: "handle", handle: handle[1]! };

  const url = asUrl(text);
  if (!url) return { mode: "words", text };

  const href = url.href;
  if (IMAGE_EXT_RE.test(url.pathname)) return { mode: "image", url: href };

  const social = classifySocialLink(href);
  if (social?.kind === "post") {
    return { mode: "post", platform: social.platform, url: social.url };
  }
  if (social?.kind === "profile" && social.handle) {
    return {
      mode: "profile",
      platform: social.platform,
      handle: social.handle,
      url: social.url,
    };
  }
  // A platform address that is neither a post nor an account (a hashtag page,
  // a search page) is still a page: read it.
  return { mode: "link", url: href };
}

export function inputModeOf(raw: string): SearchInputMode {
  return raw.trim() ? understandInput(raw).mode : "words";
}

/** "https://www.example.com/a/b?x" → "example.com". */
export function siteOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
