"use client";

/**
 * Canonical components for three search kinds (universal search, 2026-10-14):
 *
 *  - `place_review` + `place_reviews` — what people say about one place
 *    (loaded on demand by a place card's Reviews button, or standalone).
 *  - `trend_report` — interest over time + rising and top related searches.
 *    The chart is THE social `MetricChart` (one chart component, reused).
 *  - `social_search_results` — a social search, trending list or profile
 *    lookup: profiles first, then posts, each through its registered kind
 *    component (`social_profile` / `social_post`) via `SearchKindNested`.
 *
 * Values are read defensively until the generated types carry these kinds.
 */

import React, { useState } from "react";
import { ExternalLink, MessageSquareReply, ThumbsUp, TrendingUp, UserRound } from "lucide-react";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { Avatar, AvatarFallback, AvatarImage } from "@ai-matrx/design-system";
import { cn } from "@/lib/utils";
import { MetricChart } from "@/features/marketing/social/components/MetricChart";
import type { SeriesPoint } from "@/features/marketing/social/mappers";
import { SearchKindNested } from "./SearchKindNested";
import { RatingStars } from "./search-kind-shared";
import { isRecord, num, records, text } from "./search-kind-data";
import { kindValue } from "./vertical-blocks";

interface BlockProps {
  serverData?: unknown;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// place_review
// ─────────────────────────────────────────────────────────────────────────────

function ReviewerAvatar({ src, name }: { src: string | null; name: string }) {
  return (
    <Avatar size="sm">
      {src ? <AvatarImage src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="bg-muted object-cover" /> : null}
      <AvatarFallback className="text-sm">
        {name ? name.charAt(0).toUpperCase() : <UserRound className="h-4 w-4" />}
      </AvatarFallback>
    </Avatar>
  );
}

export function PlaceReviewBlock({ serverData, className }: BlockProps) {
  const value = kindValue(serverData);
  const [open, setOpen] = useState(false);
  const author = text(value.author) ?? "";
  const body = text(value.text);
  const rating = num(value.rating);
  const date = text(value.date_text);
  const likes = num(value.likes);
  const response = text(value.response_text);
  if (!body && rating === null) return null;
  const long = (body?.length ?? 0) > 280;

  return (
    <div className={cn("flex min-w-0 gap-3", className)}>
      <ReviewerAvatar src={text(value.author_photo)} name={author} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="truncate text-sm font-medium text-foreground">
          {author || "A visitor"}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {rating !== null && <RatingStars value={rating} />}
          {date && <span>{date}</span>}
        </div>
        {body && (
          <div>
            <p className={cn("whitespace-pre-line text-sm text-foreground", !open && "line-clamp-4")}>
              {body}
            </p>
            {long && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="text-xs font-medium text-primary hover:underline"
              >
                {open ? "Less" : "More"}
              </button>
            )}
          </div>
        )}
        {likes !== null && likes > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ThumbsUp className="h-3 w-3" />
            {likes}
          </div>
        )}
        {response && (
          <div className="mt-1 rounded-lg bg-muted px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <MessageSquareReply className="h-3.5 w-3.5" />
              Response from the owner
            </div>
            <p className="mt-0.5 line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">
              {response}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** `place_reviews` — the summary line and the reviews, newest as the server sent them. */
export function PlaceReviewsBlock({
  serverData,
  className,
  bare,
}: BlockProps & { bare?: boolean }) {
  const value = kindValue(serverData);
  const reviews = records(value.reviews);
  const rating = num(value.rating);
  const count = num(value.review_count) ?? num(value.reviews_count);
  const name = text(value.place_name);
  return (
    <div className={cn("space-y-3", className)}>
      {!bare && (name || rating !== null) && (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {name && <span className="truncate text-base font-medium text-foreground">{name}</span>}
          {rating !== null && <RatingStars value={rating} count={count} />}
        </div>
      )}
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {reviews.map((review, i) => (
            <div key={text(review.review_id) ?? i} className="py-3 first:pt-0 last:pb-0">
              <SearchKindNested value={{ __kind: "place_review", ...review }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// trend_report
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A series point's time. ISO dates parse; Google's week labels
 * ("Oct 12 – 18, 2025") parse from their first day; a `timestamp` (seconds)
 * wins when present. Unreadable points are dropped, never invented.
 */
export function trendPointTime(point: Record<string, unknown>): number | null {
  const ts = num(point.timestamp) ?? (text(point.timestamp) ? Number(point.timestamp) : null);
  if (ts !== null && Number.isFinite(ts)) return ts < 1e12 ? ts * 1000 : ts;
  const raw = text(point.date);
  if (!raw) return null;
  const direct = Date.parse(raw);
  if (Number.isFinite(direct)) return direct;
  // "Oct 12 – 18, 2025" / "Dec 28, 2025 – Jan 3, 2026" → the first day.
  const year = /(\d{4})/.exec(raw)?.[1];
  const head = raw.split(/\s*[–—-]\s*/)[0];
  if (head && year) {
    const withYear = /\d{4}/.test(head) ? head : `${head}, ${year}`;
    const parsed = Date.parse(withYear);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function trendSeries(value: Record<string, unknown>): SeriesPoint[] {
  return records(value.series)
    .map((p) => ({ t: trendPointTime(p), value: num(p.value) }))
    .filter((p): p is SeriesPoint => p.t !== null && p.value !== null)
    .sort((a, b) => a.t - b.t);
}

function QueryList({
  title,
  rows,
  valueOf,
}: {
  title: string;
  rows: Record<string, unknown>[];
  valueOf: (row: Record<string, unknown>) => string | null;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card">
      <div className="border-b border-border px-3.5 py-2.5 text-sm font-medium text-foreground">
        {title}
      </div>
      {rows.length === 0 ? (
        <p className="px-3.5 py-4 text-sm text-muted-foreground">Nothing yet</p>
      ) : (
        <ol className="divide-y divide-border">
          {rows.slice(0, 10).map((row, i) => {
            const query = text(row.query);
            if (!query) return null;
            return (
              <li key={`${query}-${i}`} className="flex min-w-0 items-center gap-3 px-3.5 py-2 text-sm">
                <span className="w-4 shrink-0 text-right tabular-nums text-muted-foreground">{i + 1}</span>
                {/* A related search opens as its own search, in a new tab. */}
                <a
                  href={`/search?q=${encodeURIComponent(query)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-foreground hover:text-primary hover:underline"
                >
                  {query}
                </a>
                <span className="shrink-0 tabular-nums text-muted-foreground">{valueOf(row)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function TrendReportBlock({ serverData, className }: BlockProps) {
  const value = kindValue(serverData);
  const points = trendSeries(value);
  const rising = records(value.rising);
  const top = records(value.top);
  const query = text(value.query);
  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-xl border border-border bg-card p-3.5">
        <div className="mb-2 flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">Interest over time{query ? ` · ${query}` : ""}</span>
        </div>
        <MetricChart points={points} label="Interest" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <QueryList
          title="Rising searches"
          rows={rising}
          valueOf={(r) => text(r.value_text) ?? (num(r.value) !== null ? `+${num(r.value)}%` : null)}
        />
        <QueryList
          title="Top searches"
          rows={top}
          valueOf={(r) => (num(r.value) !== null ? String(num(r.value)) : text(r.value_text))}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// social_search_results
// ─────────────────────────────────────────────────────────────────────────────

export function SocialSearchResultsBlock({ serverData, className }: BlockProps) {
  const value = kindValue(serverData);
  const profiles = records(value.profiles);
  const posts = records(value.posts);
  if (profiles.length === 0 && posts.length === 0) return null;
  return (
    <div className={cn("space-y-4", className)}>
      {profiles.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {profiles.map((profile, i) => (
            <SearchKindNested
              key={text(profile.profile_id) ?? i}
              value={{ __kind: "social_profile", ...profile }}
            />
          ))}
        </div>
      )}
      {posts.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          {posts.map((post, i) => (
            <SearchKindNested
              key={text(post.post_id) ?? i}
              value={{ __kind: "social_post", ...post }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Open-on-platform link for a post or profile URL the page could not load itself. */
export function OpenOnSiteLink({ url, label }: { url: string; label: string }) {
  return (
    <OutboundLink
      href={url}
      className="inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline"
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5" />
    </OutboundLink>
  );
}

/** Narrow helper kept beside its readers (used by the experience's Inspector). */
export function isKindValue(value: unknown, kind: string): boolean {
  return isRecord(value) && value.__kind === kind;
}
