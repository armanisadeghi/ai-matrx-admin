"use client";

/**
 * "Showing 12 of ~2,400 posts · Load more": what is stored against what the profile reports.
 */

import { Button } from "@/components/ui/button";

import { morePostsAvailable } from "../post-count";

export function PostsShownLine({
  loaded,
  reportedTotal,
  moreFlag,
  canLoadMore,
  busy,
  onLoadMore,
}: {
  loaded: number;
  /** The post count the profile itself reports (null when it reports none). */
  reportedTotal: number | null | undefined;
  /** The last fetch said the provider has more. */
  moreFlag: boolean;
  canLoadMore: boolean;
  busy: boolean;
  onLoadMore: () => void;
}) {
  const remaining = morePostsAvailable(reportedTotal, loaded);
  const hasMore = remaining !== null || moreFlag;
  const total = remaining !== null && reportedTotal != null ? ` of ~${reportedTotal.toLocaleString("en-US")}` : "";
  return (
    <>
      <span data-testid="posts-shown">
        {hasMore ? `Showing ${loaded.toLocaleString("en-US")}${total} posts` : `${loaded.toLocaleString("en-US")} posts loaded`}
      </span>
      {hasMore && canLoadMore ? (
        <Button variant="quiet" onClick={onLoadMore} disabled={busy}>
          Load more
        </Button>
      ) : null}
    </>
  );
}
