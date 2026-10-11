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
      <Link href={SOCIAL_LIMITS_HREF(organizationId, limit.setting)} className="underline">
        Change
      </Link>
    </span>
  );
}

/** Why a fetch ended early, in plain words; null when it ended normally. */
export function stoppedText(reason: string | null | undefined): string | null {
  switch (reason) {
    case "points_limit": return "Stopped early: points limit reached. Posts already loaded are kept.";
    case "provider_error": return "Stopped early: the provider had a problem. Posts already loaded are kept.";
    case "cursor_expired": return "Couldn't pick up where the last fetch stopped. Use Refresh now.";
    case "no_saved_place": return "Load more isn't available yet for this account. Use Refresh now once.";
    case "nothing_more": return "Everything the provider has is already loaded.";
    default: return null;
  }
}

/** Toast text for a row refresh: the summary plus any limit and early stop. */
export function fetchOutcomeText(summary: string, r: { limit_applied?: SocialLimitApplied | null; stopped_reason?: string | null }): string {
  const parts = [summary];
  if (r.limit_applied) parts.push(`Limited to ${r.limit_applied.value.toLocaleString("en-US")} by ${SETTING_LABELS[r.limit_applied.setting] ?? r.limit_applied.setting}`);
  const stopped = stoppedText(r.stopped_reason);
  if (stopped) parts.push(stopped);
  return parts.join(" · ");
}

/** "Fetched 3h ago" (the Refresh-now button is the caller's, so it can carry its own busy state). */
export function fetchedText(fetchedAt: string | null | undefined, reused?: boolean): string | null {
  if (!fetchedAt) return null;
  const age = relativeAge(fetchedAt);
  return `${reused ? "Up to date · " : ""}Fetched ${age === "now" ? "just now" : `${age} ago`}`;
}
