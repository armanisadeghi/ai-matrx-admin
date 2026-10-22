"use client";

/**
 * The Accounts overview: the state of the brand's social presence over a chosen window, above the
 * accounts table. Six KPIs with their history and a like-for-like delta, the audience by platform,
 * the brand against every tracked competitor, and the brand's best posts of the window. Every
 * number is computed in `accounts-overview.ts` from what is stored; nothing here is estimated.
 */

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { KpiGrid, KpiTile, type KpiTone, Button, SegmentedControl } from "@ai-matrx/design-system/controls";
import { Plus } from "lucide-react";
import { useMarketingBrand } from "@/features/marketing/lib/brand-context";
import { cn } from "@/lib/utils";

import { useBrandSocialData } from "../hooks";
import { accountHref } from "../account-href";
import { brandAccountHref } from "../property-account-href";
import { accountName, formatGrowth } from "../mappers";
import { formatCompact } from "../outlier";
import { useOpenPost } from "../useOpenPost";
import type { AccountRow } from "../types";
import {
  OVERVIEW_WINDOWS,
  buildOverview,
  relativeChange,
  type LeaderRow,
  type OverviewWindow,
  type PostFigures,
} from "../accounts-overview";
import { PlatformMark, platformLabel } from "./PlatformMark";
import { SocialPostCard } from "./SocialPostCard";
import { useSocials } from "./SocialsContext";

const WINDOW_OPTIONS = OVERVIEW_WINDOWS.map((d) => ({ value: String(d), label: `${d}d` }));

function pct(fraction: number | null): string | null {
  if (fraction === null) return null;
  const v = Math.round(fraction * 1000) / 10;
  return `${v.toFixed(v < 10 ? 1 : 0)}%`;
}

/** "+12% vs prior 30d", coloured by direction; nothing when there is no prior to compare with. */
function Change({ value, days }: { value: number | null; days: number }) {
  if (value === null) return null;
  const flat = Math.abs(value) < 0.005;
  return (
    <span className={flat ? "text-muted-foreground" : value > 0 ? "text-success-ink" : "text-destructive-ink"}>
      {flat ? "Flat" : value >= 9 ? `${Math.round(1 + value)}x` : formatGrowth(value)}
      <span className="text-muted-foreground"> vs prior {days}d</span>
    </span>
  );
}

function toneOf(change: number | null): KpiTone {
  if (change === null || Math.abs(change) < 0.005) return "neutral";
  return change > 0 ? "good" : "bad";
}

function Panel({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {aside ? <span className="text-xs text-muted-foreground">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Stat({ value, className }: { value: string; className?: string }) {
  return <span className={cn("text-right text-sm tabular-nums text-foreground", className)}>{value}</span>;
}

function figuresCells(f: PostFigures) {
  return {
    avgViews: f.avgViews === null ? "—" : formatCompact(Math.round(f.avgViews)),
    engagement: pct(f.engagement) ?? "—",
  };
}

/** Above 99x the exact multiple stops meaning anything (the table's badge caps the same way). */
function multiple(score: number): string {
  return score >= 99 ? "99x+" : `${score.toFixed(score < 10 ? 1 : 0)}x`;
}

export function AccountsOverview({ rows, rowsLoading }: { rows: readonly AccountRow[]; rowsLoading: boolean }) {
  const brand = useMarketingBrand();
  const [days, setDays] = useState<OverviewWindow>(30);
  const data = useBrandSocialData(brand.organizationId, brand.id);
  const openPost = useOpenPost();
  const { openTrack, canEdit } = useSocials();

  const loading = data.isLoading || rowsLoading;
  // A hint shows only once the reads settle: never "0 accounts" or "No views" while loading.
  const settled = (hint: ReactNode) => (loading ? undefined : hint);
  const read = data.isError ? ({ status: "error", error: data.error } as const) : null;
  const m = buildOverview({ rows, posts: data.data?.posts ?? [], snapshots: data.data?.snapshots ?? [], days });
  const { current, prior } = m;
  const weekly = (n: number) => (n / (days / 7)).toFixed(n / (days / 7) < 10 ? 1 : 0);
  const postsChange = relativeChange(current.posts, prior.posts);
  const viewsChange = relativeChange(current.views, prior.views);
  const engagementChange = relativeChange(current.engagement, prior.engagement);
  const followerFraction = m.followerChange?.fraction ?? null;

  if (!loading && !data.isError && m.brandCount === 0 && m.competitorCount === 0) return null;

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">{brand.name} on social</h2>
        <SegmentedControl
          aria-label="Window"
          value={String(days)}
          onValueChange={(v) => setDays(Number(v) as OverviewWindow)}
          data={WINDOW_OPTIONS}
        />
      </div>

      <KpiGrid>
        <KpiTile
          label="Audience"
          title="Followers across the brand's own accounts on this brand. Personal accounts are not counted."
          loading={loading}
          read={read}
          value={m.followers === null ? null : formatCompact(m.followers)}
          trend={m.followerTrend ? { values: m.followerTrend, period: `${days} days` } : null}
          hint={settled(`${m.brandCount} account${m.brandCount === 1 ? "" : "s"}`)}
        />
        <KpiTile
          label="Follower growth"
          title="Net followers gained over the window, from stored follower readings; a shorter span is named."
          loading={loading}
          read={read}
          tone={toneOf(followerFraction)}
          value={m.followerChange ? `${m.followerChange.net >= 0 ? "+" : ""}${formatCompact(m.followerChange.net)}` : null}
          hint={settled(
            m.followerChange
              ? [followerFraction === null ? null : formatGrowth(followerFraction), `over ${m.followerChange.spanDays}d`]
                  .filter(Boolean)
                  .join(" ")
              : "Needs two follower readings",
          )}
        />
        <KpiTile
          label={`Posts · ${days}d`}
          title="Posts the brand's own accounts published in the window."
          loading={loading}
          read={read}
          value={current.posts.toLocaleString()}
          trend={m.activity.posts ? { values: m.activity.posts, period: `${days} days`, label: m.activity.period } : null}
          hint={settled(
            <span className="block truncate">
              {weekly(current.posts)}/week <Change value={postsChange} days={days} />
            </span>,
          )}
        />
        <KpiTile
          label={`Views · ${days}d`}
          title="Views on posts published in the window, and the average per post."
          loading={loading}
          read={read}
          tone={toneOf(viewsChange)}
          value={current.views === null ? null : formatCompact(current.views)}
          trend={m.activity.views ? { values: m.activity.views, period: `${days} days`, label: m.activity.period } : null}
          hint={settled(
            current.views === null ? (
              "No views reported"
            ) : (
              <span className="block truncate">
                {formatCompact(Math.round(current.avgViews ?? 0))} avg <Change value={viewsChange} days={days} />
              </span>
            ),
          )}
        />
        <KpiTile
          label="Engagement"
          title="Likes, comments and shares divided by views, over posts published in the window."
          loading={loading}
          read={read}
          tone={toneOf(engagementChange)}
          value={pct(current.engagement)}
          hint={settled(current.engagement === null ? "No views reported" : <Change value={engagementChange} days={days} />)}
        />
        <KpiTile
          label={`Outliers · ${days}d`}
          title="Posts that reached at least twice their account's usual views."
          loading={loading}
          read={read}
          tone={current.outliers > 0 ? "good" : "neutral"}
          value={current.posts ? current.outliers.toLocaleString() : null}
          hint={settled(current.bestScore !== null ? `Best ${multiple(current.bestScore)} usual` : undefined)}
        />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel title="By platform" aside={`${days}d posts`}>
          {m.platforms.length === 0 ? (
            <p className="text-sm text-muted-foreground">No own accounts tracked yet</p>
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)_repeat(4,auto)] items-center gap-x-4 gap-y-2">
              <span className="text-xs text-muted-foreground">Platform</span>
              <span className="text-right text-xs text-muted-foreground">Followers</span>
              <span className="text-right text-xs text-muted-foreground">Posts</span>
              <span className="text-right text-xs text-muted-foreground">Avg views</span>
              <span className="text-right text-xs text-muted-foreground">Eng.</span>
              {m.platforms.map((p) => {
                const cells = figuresCells(p.figures);
                return (
                  <PlatformLine key={p.platform} platform={p.platform} share={p.share} accounts={p.accounts}>
                    <Stat value={p.followers === null ? "—" : formatCompact(p.followers)} />
                    <Stat value={p.figures.posts.toLocaleString()} />
                    <Stat value={cells.avgViews} />
                    <Stat value={cells.engagement} />
                  </PlatformLine>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel
          title="Against competitors"
          aside={m.shareOfViews === null ? undefined : `${pct(m.shareOfViews)} share of views`}
        >
          {m.leaders.length === 0 ? (
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">No competitors tracked</p>
              {canEdit ? (
                <Button variant="outline" icon={<Plus />} onClick={openTrack}>
                  Track a competitor
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-[auto_minmax(0,1fr)_repeat(4,auto)] items-center gap-x-4 gap-y-2">
              <span className="text-xs text-muted-foreground">#</span>
              <span className="text-xs text-muted-foreground">Account</span>
              <span className="text-right text-xs text-muted-foreground">Followers</span>
              <span className="text-right text-xs text-muted-foreground">Posts/wk</span>
              <span className="text-right text-xs text-muted-foreground">Avg views</span>
              <span className="text-right text-xs text-muted-foreground">Eng.</span>
              {m.leaders.map((l, i) => (
                <LeaderLine key={l.id} row={l} rank={i + 1} brandName={brand.name} brandSeg={brand.seg} />
              ))}
            </div>
          )}
        </Panel>
      </div>

      {m.topPosts.length ? (
        <Panel title={`Top posts · ${days}d`} aside="By views">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {m.topPosts.map((p) => (
              <SocialPostCard
                key={p.postId}
                post={p}
                compact
                accountHref={accountHref(brand.seg, p)}
                onOpen={() => openPost(p)}
              />
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function PlatformLine({
  platform,
  share,
  accounts,
  children,
}: {
  platform: string;
  share: number | null;
  accounts: number;
  children: ReactNode;
}) {
  return (
    <>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-2">
          <PlatformMark platform={platform} size={16} />
          <span className="truncate text-sm text-foreground">{platformLabel(platform)}</span>
          {accounts > 1 ? <span className="text-xs text-muted-foreground">{accounts}</span> : null}
          {share !== null ? <span className="ml-auto text-xs tabular-nums text-muted-foreground">{pct(share)}</span> : null}
        </span>
        <span className="h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (share ?? 0) * 100)}%` }} />
        </span>
      </span>
      {children}
    </>
  );
}

function LeaderLine({ row, rank, brandName, brandSeg }: { row: LeaderRow; rank: number; brandName: string; brandSeg: string }) {
  const cells = figuresCells(row.figures);
  const href = row.account ? brandAccountHref(brandSeg, row.account) : null;
  const name = row.account ? accountName(row.account) : brandName;
  const label = (
    <span className="flex min-w-0 items-center gap-2">
      {row.account ? <PlatformMark platform={row.account.platform} size={16} /> : null}
      <span className={cn("truncate text-sm", row.isBrand ? "font-semibold text-primary" : "text-foreground")}>{name}</span>
    </span>
  );
  const strong = row.isBrand ? "font-semibold" : undefined;
  return (
    <>
      <span className="text-xs tabular-nums text-muted-foreground">{rank}</span>
      {href ? (
        <Link href={href} className="min-w-0 hover:underline" data-clickable="">
          {label}
        </Link>
      ) : (
        label
      )}
      <Stat className={strong} value={row.followers === null ? "—" : formatCompact(row.followers)} />
      <Stat className={strong} value={row.postsPerWeek.toFixed(row.postsPerWeek < 10 ? 1 : 0)} />
      <Stat className={strong} value={cells.avgViews} />
      <Stat className={strong} value={cells.engagement} />
    </>
  );
}
