"use client";

/**
 * "Showing 12 of ~2,400 posts · Load more (≈ 38 points)": what is stored against what the profile
 * reports, with the price of the next step in points before the click.
 */

import { Button } from "@/components/ui/button";

import { useSocialSpend } from "../cost";
import { LOAD_MORE_STEP, morePostsAvailable } from "../post-count";

export function PostsShownLine({
  organizationId,
  platform,
  loaded,
  reportedTotal,
  moreFlag,
  canLoadMore,
  busy,
  onLoadMore,
}: {
  organizationId: string;
  platform: string;
  loaded: number;
  /** The post count the profile itself reports (null when it reports none). */
  reportedTotal: number | null | undefined;
  /** The last fetch said the provider has more. */
  moreFlag: boolean;
  canLoadMore: boolean;
  busy: boolean;
  onLoadMore: () => void;
}) {
  const { postsText } = useSocialSpend(organizationId);
  const remaining = morePostsAvailable(reportedTotal, loaded);
  const hasMore = remaining !== null || moreFlag;
  const points = hasMore ? postsText(platform, Math.min(LOAD_MORE_STEP, remaining ?? LOAD_MORE_STEP)) : null;
  const total = remaining !== null && reportedTotal != null ? ` of ~${reportedTotal.toLocaleString("en-US")}` : "";
  return (
    <>
      <span data-testid="posts-shown">
        {hasMore ? `Showing ${loaded.toLocaleString("en-US")}${total} posts` : `${loaded.toLocaleString("en-US")} posts loaded`}
      </span>
      {hasMore && canLoadMore ? (
        <Button variant="quiet" onClick={onLoadMore} disabled={busy}>
          {points ? `Load more (${points})` : "Load more"}
        </Button>
      ) : null}
    </>
  );
}
