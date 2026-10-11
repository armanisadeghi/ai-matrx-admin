"use client";

/** Short in-place lines for an account fetch: what was loaded, which limit applied, how fresh. */

import Link from "next/link";

import { relativeAge } from "../mappers";
import { SOCIAL_LIMITS_HREF } from "../post-count";
import type { SocialLimitApplied } from "../types";

const SETTING_LABELS: Record<string, string> = {
  profile_posts_max: "Max posts per account",
  comments_max: "Max comments per post",
  reuse_hours_profile: "Reuse window (hours)",
};

/** "Limited to 500 by Max posts per account · Change" — no hidden limits. */
export function LimitLine({ limit, organizationId }: { limit: SocialLimitApplied | null | undefined; organizationId: string }) {
  if (!limit) return null;
  return (
    <span className="text-xs text-muted-foreground" data-testid="limit-line">
      {`Limited to ${limit.value.toLocaleString("en-US")} (asked ${limit.requested.toLocaleString("en-US")}) by ${SETTING_LABELS[limit.setting] ?? limit.setting} · `}
      <Link href={SOCIAL_LIMITS_HREF(organizationId)} className="underline">
        Change
      </Link>
    </span>
  );
}

/** "Fetched 3h ago" (the Refresh-now button is the caller's, so it can carry its own busy state). */
export function fetchedText(fetchedAt: string | null | undefined, reused?: boolean): string | null {
  if (!fetchedAt) return null;
  const age = relativeAge(fetchedAt);
  return `${reused ? "Up to date · " : ""}Fetched ${age === "now" ? "just now" : `${age} ago`}`;
}
