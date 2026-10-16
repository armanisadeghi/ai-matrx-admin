/**
 * What the search box was given — words, a social handle, a profile or post
 * link, a web address, or an image address — so the page can do the one
 * obvious thing with it. Pure; reuses the social module's link parser
 * (`features/marketing/social/link.ts`) so a handle or profile link means the
 * same thing here as everywhere else on the platform. The address and handle
 * rules are the platform's one copy, in `@ai-matrx/chat/mandates/invoke/smart-box`
 * (the one-box form's detector reads the same ones).
 */

import {
  HANDLE_RE,
  IMAGE_EXT_RE,
  parseAddress,
} from "@ai-matrx/chat/mandates/invoke/smart-box";
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

export function understandInput(raw: string): UnderstoodInput {
  const text = raw.trim();
  const handle = HANDLE_RE.exec(text);
  if (handle) return { mode: "handle", handle: handle[1]! };

  const url = parseAddress(text);
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

export { siteOf } from "@ai-matrx/chat/mandates/invoke/smart-box";
