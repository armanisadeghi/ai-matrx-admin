"use client";

/** Short in-place lines for an account fetch: what was loaded, which limit applied, how fresh. */

import Link from "next/link";

import { relativeAge } from "../mappers";
import { SOCIAL_LIMITS_HREF } from "../post-count";
import type { SocialLimitApplied } from "../types";

const SETTING_LABELS: Record<string, string> = {
  profile_posts_max: "Most posts per account",
  comments_max: "Most comments per post",
  reuse_hours_profile: "Reuse window (hours)",
};

/** "500 of 1,000 · capped by Most posts per account" with a settings link — no hidden limits. */
export function LimitLine({ limit, organizationId }: { limit: SocialLimitApplied | null | undefined; organizationId: string }) {
  if (!limit) return null;
  const bare = limit.setting.replace(/^social\./, "");
  return (
    <span className="text-xs text-muted-foreground" data-testid="limit-line">
      {`${limit.value.toLocaleString("en-US")} of ${limit.requested.toLocaleString("en-US")} · capped by `}
      <Link href={SOCIAL_LIMITS_HREF(organizationId, bare)} className="underline">
        {SETTING_LABELS[bare] ?? bare}
      </Link>
    </span>
  );
}

/** Why a fetch ended early, in plain words; null when it ended normally. */
export function stoppedText(reason: string | null | undefined): string | null {
  switch (reason) {
    case "points_limit": return "Stopped: points limit reached";
    case "provider_error": return "Stopped early: source unavailable";
    case "cursor_expired": return "Couldn't resume. Use Refresh.";
    case "no_saved_place": return "Use Refresh once to enable Load more";
    case "nothing_more": return "All posts loaded";
    default: return null;
  }
}

/** Toast text for a row refresh: the summary plus any limit and early stop. */
export function fetchOutcomeText(summary: string, r: { limit_applied?: SocialLimitApplied | null; stopped_reason?: string | null }): string {
  const parts = [summary];
  if (r.limit_applied) parts.push(`Capped at ${r.limit_applied.value.toLocaleString("en-US")} (${SETTING_LABELS[r.limit_applied.setting.replace(/^social\./, "")] ?? r.limit_applied.setting})`);
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
