"use client";

/**
 * "From your browser" — ONE line saying what this organization's own browser captured about an account
 * ("281 posts from your browser · Oct 9") with the saved page one click away. The captured posts
 * themselves are cards in the account's post grid and table (SCHEMA.md A7, `capturedPosts.ts`), never a
 * list here. Absent when there is nothing (never an empty box).
 */

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@ai-matrx/design-system/controls";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

import { capturePollInterval, fetchBrowserCaptures, type CaptureEntity } from "./browserCaptures";
import { FROM_BROWSER_LABEL, capturedSummary } from "./capturedPosts";
import { guidedResultHref } from "./guidedJob";

export function browserCapturesKey(targets: { type: CaptureEntity; id: string | null | undefined }[]) {
  return ["social", "browser-captures", ...targets.map((t) => `${t.type}:${t.id ?? ""}`)] as const;
}

export function CapturedFromBrowser({
  targets,
  capturedPostCount,
}: {
  targets: { type: CaptureEntity; id: string | null | undefined }[];
  /** Captured posts now shown on the page (the organization's `captured_post` rows for the account). */
  capturedPostCount: number;
}) {
  const q = useQuery({ queryKey: browserCapturesKey(targets), queryFn: () => fetchBrowserCaptures(targets), refetchInterval: (q) => capturePollInterval(q.state.data) });
  if (q.isError) {
    return (
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        Couldn't read your browser captures
        <ErrorAlchemyMenu error={q.error} operation="load browser captures" />
      </p>
    );
  }
  const captures = q.data ?? [];
  if (captures.length === 0) return null;
  const latest = captures[0];
  const count = capturedPostCount > 0 ? capturedPostCount : latest.posts.length;
  const status =
    latest.status === "needs_agent" ? "Saved, not read yet" : latest.imagesPending ? "Saving images…" : null;

  return (
    <div aria-label={FROM_BROWSER_LABEL} className="flex min-h-7 min-w-0 flex-wrap items-center gap-2 text-sm">
      <Badge>{FROM_BROWSER_LABEL}</Badge>
      <span className="truncate text-muted-foreground">
        {count > 0 ? capturedSummary(count, latest.capturedAt) : "Saved page"}
      </span>
      {status ? <span className="text-xs text-muted-foreground">{status}</span> : null}
      <Link className="ml-auto text-xs underline-offset-2 hover:underline" href={guidedResultHref(latest.sourceId)}>
        Saved page
      </Link>
    </div>
  );
}
