"use client";

/**
 * The brand Overview's headline panels (Arman, 2026-10-21: "a beautiful page that really highlights the
 * brand, what we know about them and their KPIs"). Champion: the HubSpot company record + Sprout Social's
 * profile overview — a KPI band whose every number opens its detail, real account rows (exact handle,
 * followers, posts, last post, one action), quick actions up front, a compact "what we know", and the
 * brand's look. Each panel reads only what it shows and mounts only on the Overview tab (load law).
 *
 *  - KPIs: social rows (shared cache with the hero), the GSC portfolio roll-up (28d), the latest AI
 *    check, the brand profile's ONE competitor list, the offerings read. A KPI without data is "—" with
 *    a one-click door to get it, never a made-up number.
 *  - Accounts: `social.brand_social_accounts` (the Social tab's own rows); Track / Fetch through the
 *    canonical `useTrackOwn` flow (the cost is named on the confirm step, never on the button).
 *  - What we know: the brand strategy brief, personas, the brand profile (voice, competitors), offerings.
 *  - Brand look: logo assets raw (never tinted), color swatches (click copies the hex), fonts.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  ExternalLink,
  Compass,
  FolderOpen,
  ImagePlus,
  Inbox,
  ListPlus,
  Plus,
  Mic,
  Package,
  RefreshCw,
  ScanSearch,
  Swords,
  UserPlus,
  Users,
  Workflow,
} from "lucide-react";

import { Button, PropertyRow } from "@ai-matrx/design-system/controls";
import { ReadFailure, Skeleton } from "@ai-matrx/design-system";
import { useClipboard } from "@ai-matrx/kit/clipboard";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import { formatRelativeTime } from "@ai-matrx/kit/format";

import { KpiGrid, KpiTile } from "@/components/official/kpi/KpiTile";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import { AssetTile, type OverviewAsset } from "@/features/marketing/components/brands/BrandOverview";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { useGscPortfolioRollup } from "@/features/marketing/search-console/components/ambassador/useGscPortfolioRollup";
import { useBrandOverviewTrends } from "@/features/marketing/components/brands/useBrandOverviewTrends";
import { useBrandCheckEstimate, useBrandChecks } from "@/features/marketing/seo/ai-visibility/brand/hooks";
import { RunCheckButton } from "@/features/marketing/seo/ai-visibility/brand/RunCheckButton";
import { useStrategyBrief } from "@/features/marketing/strategy/hooks";
import { fetchOfferingItems } from "@/features/marketing/offerings/data";
import { listBrandCompetitors } from "@/features/marketing/competitors/brand-competitors";
import { brandAccountHref } from "@/features/marketing/social/property-account-href";
import { accountLabels, formatGrowth, lastPostLabel } from "@/features/marketing/social/mappers";
import { formatCompact } from "@/features/marketing/social/outlier";
import { profileAvatarDoor } from "@/features/marketing/social/server";
import { PlatformMark, platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { SocialImage } from "@/features/marketing/social/components/SocialImage";
import { trackableOwn, useTrackOwn } from "@/features/marketing/social/components/useTrackOwn";
import { formatSocialHandle } from "@/features/marketing/lib/social-handle";
import type { AccountRow } from "@/features/marketing/social/types";
import type { BrandProfile } from "@/features/marketing/types";
import type { BrandPersona } from "@/features/marketing/lib/persona-model";

/** Accounts the Overview lists before "All N" (the Social tab has every row). */
const ACCOUNT_PREVIEW = 8;

/** The offerings read, shared by the KPI band and "What we know" (one cache entry). */
function useOfferingItems(brandId: string) {
  return useQuery({
    queryKey: ["marketing", "brand", brandId, "offering-items"],
    queryFn: () => fetchOfferingItems(brandId),
    staleTime: 60_000,
  });
}

/** Follower change over each account's judged window, summed (null when no account has a judged window). */
function followerDelta(accounts: readonly AccountRow[]): number | null {
  let delta = 0;
  let judged = false;
  for (const a of accounts) {
    if (a.followers === null || a.growth === null || a.growth <= -1) continue;
    judged = true;
    delta += a.followers - a.followers / (1 + a.growth);
  }
  return judged ? Math.round(delta) : null;
}

function Delta({ value, suffix }: { value: number; suffix: string }) {
  if (Math.abs(value) < (suffix === "%" ? 0.0005 : 0.5)) {
    return <span className="text-muted-foreground">No change {suffix === "%" ? "vs prior" : suffix}</span>;
  }
  const tone = value > 0 ? "text-success-ink" : value < 0 ? "text-destructive-ink" : "text-muted-foreground";
  return (
    <span className={tone}>
      {value > 0 ? "+" : ""}
      {suffix === "%" ? `${Math.round(value * 1000) / 10}%` : formatCompact(value)}
      <span className="text-muted-foreground"> {suffix === "%" ? "vs prior" : suffix}</span>
    </span>
  );
}

/** A last post older than this reads as a warning: the account has gone quiet. */
const STALE_POST_DAYS = 90;
function isStale(iso: string | null): boolean {
  return Boolean(iso) && Date.now() - Date.parse(iso as string) > STALE_POST_DAYS * 86_400_000;
}

/** A KPI hint that is a door: the one click that gets the missing number. */
function HintDoor({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link prefetch={false} href={href} className="text-primary hover:underline">
      {children}
    </Link>
  );
}

/** The brand's ONE competitor list (seo + social + profile + CRM, merged): the competitors page's own query. */
export function useBrandCompetitorList(brandId: string, siteIds: readonly string[]) {
  const ids = [...siteIds];
  return useQuery({
    queryKey: ["marketing", "brand", brandId, "competitor-directory", ids],
    queryFn: ({ signal }) => listBrandCompetitors(brandId, ids, signal),
  });
}

/** Brand-owned vs person-owned accounts (a person's own following is never the brand's audience). */
function splitAudience(accounts: readonly AccountRow[]) {
  const sum = (list: readonly AccountRow[]) =>
    list.some((a) => a.followers !== null) ? list.reduce((s, a) => s + (a.followers ?? 0), 0) : null;
  const brand = accounts.filter((a) => a.ownerKind !== "person");
  const people = accounts.filter((a) => a.ownerKind === "person");
  return { brand, people, brandFollowers: sum(brand), peopleFollowers: sum(people) };
}

export function BrandOverviewKpis({
  brandId,
  brandSeg,
  siteIds,
  accounts,
  accountsLoading,
  tabHref,
}: {
  brandId: string;
  brandSeg: string;
  siteIds: readonly string[];
  accounts: readonly AccountRow[];
  accountsLoading: boolean;
  /** The brand home with another tab open (`?tab=`). */
  tabHref: (tab: string) => string;
}) {
  const gsc = useGscPortfolioRollup(siteIds, "28d");
  const checks = useBrandChecks(brandId);
  const offerings = useOfferingItems(brandId);
  const competitors = useBrandCompetitorList(brandId, siteIds);

  const audience = splitAudience(accounts);
  const brandDelta = followerDelta(audience.brand);
  const trends = useBrandOverviewTrends({
    profileIds: audience.brand.map((a) => a.profileId).filter((id): id is string => Boolean(id)),
    postProfileIds: accounts.map((a) => a.profileId).filter((id): id is string => Boolean(id)),
    siteIds,
    gscPeriods: gsc.periods,
    gscReady: !gsc.isLoading && Boolean(gsc.rollup?.hasData),
  });
  const posts = accounts.reduce((sum, a) => sum + a.postsTracked, 0);
  const lastPost = accounts.map((a) => a.lastPostAt).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  const latestCheck = checks.data?.[0] ?? null;
  const items = offerings.data ?? null;
  const confirmed = (items ?? []).filter((i) => i.status === "confirmed").length;
  const rivals = competitors.data ?? null;
  const rollup = gsc.rollup;
  const social = tabHref("social");
  // A hint shows only once its read has settled: never a false "connect" or "none" while loading.
  const settled = (loading: boolean, hint: ReactNode) => (loading ? undefined : hint);

  return (
    <KpiGrid>
      <KpiTile
        className="min-h-[76px]"
        label="Audience"
        title="Followers of the brand's own accounts; people's personal accounts are counted apart."
        loading={accountsLoading}
        value={audience.brandFollowers === null ? null : formatCompact(audience.brandFollowers)}
        trend={trends.followers}
        href={social}
        hint={settled(
          accountsLoading,
          audience.brandFollowers === null ? (
            <HintDoor href={social}>{accounts.length ? "Fetch accounts" : "Add an account"}</HintDoor>
          ) : audience.peopleFollowers ? (
            `+ ${formatCompact(audience.peopleFollowers)} on people's accounts`
          ) : brandDelta !== null ? (
            <Delta value={brandDelta} suffix="in 30d" />
          ) : (
            `${audience.brand.length} account${audience.brand.length === 1 ? "" : "s"}`
          ),
        )}
      />
      <KpiTile
        className="min-h-[76px]"
        label="Posts"
        title="Posts we hold across the brand's social accounts."
        loading={accountsLoading}
        value={posts ? posts.toLocaleString() : null}
        trend={trends.posts}
        href={social}
        hint={settled(
          accountsLoading,
          !accounts.length ? (
            <HintDoor href={social}>Add an account</HintDoor>
          ) : lastPost ? (
            <span className={isStale(lastPost) ? "text-warning-ink" : undefined}>Last post {lastPostLabel(lastPost, posts)}</span>
          ) : (
            <HintDoor href={social}>Fetch posts</HintDoor>
          ),
        )}
      />
      <KpiTile
        className="min-h-[76px]"
        label="Search clicks · 28d"
        title="Google Search clicks to the brand's websites in the last 28 days."
        loading={gsc.isLoading}
        value={rollup?.hasData ? rollup.totalClicks.toLocaleString() : null}
        trend={trends.clicks}
        href={tabHref("web")}
        hint={settled(
          gsc.isLoading,
          siteIds.length === 0 ? (
            <HintDoor href={tabHref("web")}>Add a website</HintDoor>
          ) : !rollup?.hasData ? (
            <HintDoor href={marketingRoutes.connectionsGoogle()}>Connect Search Console</HintDoor>
          ) : rollup.totalDeltaPct !== null ? (
            <Delta value={rollup.totalDeltaPct} suffix="%" />
          ) : (
            "No earlier period"
          ),
        )}
      />
      <KpiTile
        className="min-h-[76px]"
        label="AI share of voice"
        title="How often AI answers name this brand next to its competitors."
        loading={checks.isPending}
        read={checks.isError ? { status: "error", error: checks.error } : null}
        value={latestCheck?.score == null ? null : `${latestCheck.score}%`}
        href={marketingRoutes.brandAiVisibility(brandSeg)}
        hint={settled(
          checks.isPending,
          latestCheck ? (
            `Checked ${formatRelativeTime(latestCheck.checked_at)}`
          ) : (
            <HintDoor href={marketingRoutes.brandAiVisibility(brandSeg)}>Run a check</HintDoor>
          ),
        )}
      />
      <KpiTile
        className="min-h-[76px]"
        label="Competitors"
        title="Rivals tracked for this brand: websites, social accounts and the brand's own list."
        loading={competitors.isPending}
        read={competitors.isError ? { status: "error", error: competitors.error } : null}
        value={rivals && rivals.length ? rivals.length.toLocaleString() : null}
        href={marketingRoutes.brandCompetitors(brandSeg)}
        hint={settled(
          competitors.isPending,
          rivals && rivals.length ? (
            <span title={rivals.map((r) => r.name).join(", ")}>{rivals.slice(0, 2).map((r) => r.name).join(" · ")}</span>
          ) : (
            <HintDoor href={marketingRoutes.brandCompetitors(brandSeg)}>Add competitors</HintDoor>
          ),
        )}
      />
      <KpiTile
        className="min-h-[76px]"
        label="Products & services"
        title="Products and services found for this brand."
        loading={offerings.isPending}
        read={offerings.isError ? { status: "error", error: offerings.error } : null}
        value={items && items.length ? items.length.toLocaleString() : null}
        href={marketingRoutes.brandOfferings(brandSeg)}
        hint={settled(
          offerings.isPending,
          items && items.length ? (
            `${confirmed.toLocaleString()} confirmed`
          ) : (
            <HintDoor href={marketingRoutes.brandOfferings(brandSeg)}>Find them</HintDoor>
          ),
        )}
      />
    </KpiGrid>
  );
}

/* ------------------------------------------------------------------------------------------------ */

function AccountAvatar({ account }: { account: AccountRow }) {
  if (account.profileId && account.avatarHint) {
    return (
      <span className="relative h-8 w-8 shrink-0">
        <span className="relative block h-8 w-8 overflow-hidden rounded-full bg-muted">
          <SocialImage
            door={account.avatarFileId ? profileAvatarDoor(account.profileId) : null}
            url={account.avatarHint}
            fallback={<PlatformMark platform={account.platform} size={32} />}
          />
        </span>
        <span className="absolute -bottom-1 -right-1">
          <PlatformMark platform={account.platform} size={14} />
        </span>
      </span>
    );
  }
  return <PlatformMark platform={account.platform} size={32} />;
}

/** The account table's column template (name, followers, 30d, posts, last post, action); 30d only when any account has it. */
const ACCOUNT_GRID = "sm:grid sm:grid-cols-[minmax(0,1fr)_4.5rem_4rem_4rem_5.5rem_2rem] sm:items-center sm:gap-3";
const ACCOUNT_GRID_NO_GROWTH = "sm:grid sm:grid-cols-[minmax(0,1fr)_4.5rem_4rem_5.5rem_2rem] sm:items-center sm:gap-3";

export function BrandOverviewAccounts({
  brandId,
  brandSeg,
  organizationId,
  accounts,
  loading,
  expectedRows,
  error,
  onRetry,
  canEdit,
  allHref,
  onAdd,
}: {
  brandId: string;
  brandSeg: string;
  organizationId: string;
  accounts: readonly AccountRow[];
  loading: boolean;
  /** Rows to hold while loading (the brand's social properties), so the card never resizes. */
  expectedRows: number;
  /** The accounts read failed: say so, never "no accounts". */
  error?: unknown;
  onRetry?: () => void;
  canEdit: boolean;
  /** The Social tab (every row, edit and delete). */
  allHref: string;
  onAdd: () => void;
}) {
  const { busyRow, progress, trackOwn, trackAllOwn, refreshOwn, refreshAllOwn } = useTrackOwn(organizationId, brandId);
  const tracked = accounts.filter((a) => a.trackedAccountId && a.profileId);
  const refreshedAt = accounts.map((a) => a.lastRefreshedAt).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  const untracked = accounts.filter(trackableOwn);
  const sorted = [...accounts].sort((a, b) => (b.followers ?? -1) - (a.followers ?? -1));
  const shown = sorted.slice(0, ACCOUNT_PREVIEW);
  const followers = accounts.reduce((sum, a) => sum + (a.followers ?? 0), 0);
  const posts = accounts.reduce((sum, a) => sum + a.postsTracked, 0);
  const lastPost = accounts.map((a) => a.lastPostAt).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  const holdRows = Math.min(ACCOUNT_PREVIEW, Math.max(1, expectedRows));
  const hasGrowth = accounts.some((a) => a.growth !== null);
  const grid = hasGrowth ? ACCOUNT_GRID : ACCOUNT_GRID_NO_GROWTH;

  return (
    <SectionCard
      title="Social accounts"
      anchor="overview-accounts"
      count={accounts.length || undefined}
      about="The brand's own accounts with their latest numbers. Track an account to keep its numbers and posts current."
      headerExtra={
        <>
          {refreshedAt ? (
            <span className="hidden whitespace-nowrap type-meta text-muted-foreground md:inline" title={refreshedAt}>
              Updated {formatRelativeTime(refreshedAt)}
            </span>
          ) : null}
          {canEdit && untracked.length ? (
            <Button
              variant="outline"
              icon={<UserPlus />}
              disabled={busyRow !== null}
              title="Track the accounts not tracked yet and fetch their posts"
              onClick={() => void trackAllOwn(untracked)}
            >
              {busyRow === "bulk" ? "Tracking…" : `Track ${untracked.length}`}
            </Button>
          ) : null}
          {canEdit && tracked.length ? (
            <Button
              variant="outline"
              icon={<RefreshCw />}
              disabled={busyRow !== null}
              title="Fetch new posts for every tracked account"
              onClick={() => void refreshAllOwn(tracked)}
            >
              {busyRow === "bulk-refresh" ? "Refreshing…" : "Refresh all"}
            </Button>
          ) : null}
        </>
      }
      action={{ label: accounts.length > ACCOUNT_PREVIEW ? `All ${accounts.length}` : "Open", href: allHref }}
    >
      {loading ? (
        <div aria-busy="true" aria-label="Loading accounts" className="divide-y divide-border">
          {Array.from({ length: holdRows }, (_, i) => (
            <div key={i} className="flex h-[52px] items-center gap-3 px-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-48 max-w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ReadFailure error={error} what="the social accounts" onRetry={onRetry} size="compact" />
      ) : accounts.length === 0 ? (
        <div className="flex min-h-[52px] items-center gap-3 px-3">
          <span className="flex-1 type-secondary text-muted-foreground">No social accounts yet</span>
          {canEdit ? (
            <Button variant="outline" icon={<UserPlus />} onClick={onAdd}>
              Add account
            </Button>
          ) : null}
        </div>
      ) : (
        <div>
          <div className={`hidden border-b border-border px-3 py-1.5 type-label ${grid}`} aria-hidden="true">
            <span>Account</span>
            <span className="text-right">Followers</span>
            {hasGrowth ? <span className="text-right">30d</span> : null}
            <span className="text-right">Posts</span>
            <span className="text-right">Last post</span>
            <span />
          </div>
          <ul className="divide-y divide-border">
            {shown.map((a) => {
              const labels = accountLabels(a.displayName, a.handle, a.platform);
              const href = brandAccountHref(brandSeg, a);
              const externalUrl = a.profileUrl || a.externalUrl || null;
              const handleText = a.handle
                ? formatSocialHandle({ platform: a.platform, handle: a.handle, url: a.profileUrl })
                : null;
              const busy = busyRow === a.rowId;
              const canTrack = canEdit && trackableOwn(a);
              const canRefresh = canEdit && Boolean(a.trackedAccountId && a.profileId);
              return (
                <li key={a.rowId} className={`flex min-h-[52px] flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 ${grid}`}>
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    {href ? (
                      <Link prefetch={false} href={href} className="shrink-0" data-clickable="" aria-label={labels.primary}>
                        <AccountAvatar account={a} />
                      </Link>
                    ) : (
                      <AccountAvatar account={a} />
                    )}
                    <span className="flex min-w-0 flex-col leading-tight">
                      {href ? (
                        <Link prefetch={false} href={href} className="truncate type-title text-foreground hover:underline" data-clickable="">
                          {labels.primary}
                        </Link>
                      ) : (
                        <span className="truncate type-title text-foreground">{labels.primary}</span>
                      )}
                      <span className="flex min-w-0 items-center gap-1 type-meta text-muted-foreground">
                        {busy && progress ? (
                          <span className="truncate text-primary">{progress}</span>
                        ) : (
                          <>
                            {externalUrl && handleText ? (
                              <OutboundLink
                                href={externalUrl}
                                className="inline-flex min-w-0 items-center gap-1 hover:text-foreground"
                                title={`Open on ${platformLabel(a.platform)}`}
                              >
                                <span className="truncate">{handleText}</span>
                                <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                              </OutboundLink>
                            ) : (
                              <span className="truncate">{handleText ?? platformLabel(a.platform)}</span>
                            )}
                          </>
                        )}
                      </span>
                    </span>
                  </div>
                  {/* Phone: the numbers sit on one line under the name. Wider: their own columns. */}
                  <span className="order-last flex w-full flex-wrap gap-x-4 pl-[42px] type-meta tabular-nums text-muted-foreground sm:contents">
                    <span className="sm:text-right sm:type-body sm:text-foreground">
                      <span className="sm:hidden">Followers </span>
                      {formatCompact(a.followers)}
                    </span>
                    {hasGrowth ? (
                      <span className="sm:text-right" title={a.growthNote || undefined}>
                        <span className="sm:hidden">30d </span>
                        {formatGrowth(a.growth)}
                      </span>
                    ) : null}
                    <span className="sm:text-right">
                      <span className="sm:hidden">Posts </span>
                      {a.postsTracked.toLocaleString()}
                    </span>
                    <span className={`whitespace-nowrap sm:text-right${isStale(a.lastPostAt) ? " text-warning-ink" : ""}`} title={a.lastPostAt ?? undefined}>
                      {a.lastPostAt ? <span className="sm:hidden">Last </span> : null}
                      {lastPostLabel(a.lastPostAt, a.postsTracked)}
                    </span>
                  </span>
                  <span className="flex shrink-0 justify-end">
                    {canTrack ? (
                      <Button
                        variant="quiet"
                        icon={<UserPlus />}
                        aria-label={`Track ${labels.primary}`}
                        title="Track and fetch posts"
                        disabled={busyRow !== null}
                        onClick={() => void trackOwn(a)}
                      />
                    ) : canRefresh ? (
                      <Button
                        variant="quiet"
                        icon={<RefreshCw />}
                        aria-label={`Fetch new posts for ${labels.primary}`}
                        title="Fetch new posts"
                        disabled={busyRow !== null}
                        onClick={() => void refreshOwn(a)}
                      />
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className={`flex flex-wrap gap-x-4 border-t border-border bg-muted/40 px-3 py-1.5 type-meta tabular-nums text-muted-foreground ${grid}`}>
            <span className="font-medium text-foreground">
              Total · {accounts.length} account{accounts.length === 1 ? "" : "s"}
            </span>
            <span className="font-medium text-foreground sm:text-right">
              {formatCompact(followers)}
              <span className="font-normal text-muted-foreground sm:hidden"> followers</span>
            </span>
            {hasGrowth ? <span className="max-sm:hidden" /> : null}
            <span className="sm:text-right">{posts.toLocaleString()} posts</span>
            <span className="whitespace-nowrap sm:text-right">{lastPost ? lastPostLabel(lastPost, posts) : "—"}</span>
            <span className="max-sm:hidden" />
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/* ------------------------------------------------------------------------------------------------ */

export function BrandOverviewActions({
  brandId,
  brandSeg,
  organizationId,
  canEdit,
  pending,
  onAddFact,
  onAddAccount,
  onOpenActivity,
}: {
  brandId: string;
  brandSeg: string;
  organizationId: string;
  canEdit: boolean;
  /** Discoveries waiting in the review inbox (null while loading). */
  pending: number | null;
  onAddFact: () => void;
  onAddAccount: () => void;
  onOpenActivity: () => void;
}) {
  const aiEstimate = useBrandCheckEstimate(brandId, organizationId, canEdit);
  const identity = marketingRoutes.brandIdentity(brandSeg);
  const link = (href: string, icon: ReactNode, label: string, meta?: ReactNode) => (
    <Button asChild variant="outline" icon={icon} meta={meta} className="w-full">
      <Link prefetch={false} href={href}>
        {label}
      </Link>
    </Button>
  );
  return (
    <SectionCard
      title="Quick actions"
      anchor="overview-actions"
      about="The jobs people run most on a brand. Anything that spends points names its cost before it starts."
    >
      <div className="grid grid-cols-2 gap-2 p-3 lg:grid-cols-1 xl:grid-cols-2">
        {canEdit ? link(marketingRoutes.smartAddEnrich(brandId), <ScanSearch />, "Enrich brand") : null}
        {link(marketingRoutes.brandDiscovery(brandSeg), <Inbox />, "Review inbox", pending === null ? "…" : pending.toLocaleString())}
        {canEdit ? (
          aiEstimate.data && !aiEstimate.data.can_compare ? (
            // The AI check compares the brand with the rivals named for it; with none, the door is naming them.
            <Button asChild variant="outline" icon={<Swords />} className="w-full" title="Name the rivals to compare with, then run the check">
              <Link prefetch={false} href={marketingRoutes.brandAiVisibility(brandSeg)}>
                Set up AI check
              </Link>
            </Button>
          ) : (
            <RunCheckButton brandId={brandId} organizationId={organizationId} />
          )
        ) : null}
        {link(`${identity}/voice`, <Mic />, "Measure voice")}
        {link(marketingRoutes.brandCompetitors(brandSeg), <Swords />, "Add competitor")}
        {link(marketingRoutes.brandAssets(brandSeg, "generate"), <ImagePlus />, "Generate image")}
        {link(marketingRoutes.brandAssets(brandSeg), <FolderOpen />, "Asset desk")}
        {canEdit ? (
          <Button variant="outline" icon={<ListPlus />} className="w-full" onClick={onAddFact}>
            Add fact
          </Button>
        ) : null}
        {canEdit ? (
          <Button variant="outline" icon={<UserPlus />} className="w-full" onClick={onAddAccount}>
            Add account
          </Button>
        ) : null}
        <Button variant="outline" icon={<Workflow />} className="w-full" onClick={onOpenActivity}>
          Background work
        </Button>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------------------------------------ */

interface KnownRow {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string | null;
  meta?: string;
  href: string;
  /** What the door does when there is nothing yet ("Write", "Add"…). */
  emptyLabel: string;
}

const STRATEGY_STATUS: Record<string, string> = {
  confirmed: "Confirmed",
  auto_accepted: "Accepted",
  awaiting_review: "To review",
  draft: "Draft",
  superseded: "Old",
};

export function BrandOverviewKnown({
  brandId,
  brandSeg,
  organizationId,
  siteIds,
  profile,
  personas,
}: {
  brandId: string;
  brandSeg: string;
  organizationId: string;
  siteIds: readonly string[];
  profile: BrandProfile;
  personas: readonly BrandPersona[];
}) {
  const rivals = useBrandCompetitorList(brandId, siteIds);
  const brief = useStrategyBrief("brand", brandId, organizationId);
  const offerings = useOfferingItems(brandId);
  const identity = marketingRoutes.brandIdentity(brandSeg);
  const join = (list: readonly string[], limit = 3) =>
    list.length ? list.slice(0, limit).join(" · ") + (list.length > limit ? ` +${list.length - limit}` : "") : null;

  const lines = brief.data?.serviceLines.map((line) => line.name).filter(Boolean) ?? [];
  const strategyValue = profile.positioning?.trim() || join(lines) || null;
  const sortedPersonas = [...personas].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  // Tone words only: a measured voice line ("mixed sentence lengths of about 31 words…") is a report, not a trait.
  const toneLine = profile.voice_tone?.trim() ?? "";
  const voice = join(profile.personality ?? [], 4) || (toneLine && toneLine.length <= 60 && !/\d/.test(toneLine) ? toneLine : toneLine ? "Measured" : null);
  const competitors = (rivals.data ?? []).map((c) => c.name).filter(Boolean);
  const items = [...(offerings.data ?? [])]
    .filter((i) => i.status !== "dismissed")
    .sort((a, b) => Number(b.status === "confirmed") - Number(a.status === "confirmed"));

  const rows: KnownRow[] = [
    {
      key: "strategy",
      icon: Compass,
      label: "Strategy",
      value: strategyValue,
      meta: brief.data ? STRATEGY_STATUS[brief.data.status] : undefined,
      href: `${identity}/strategy`,
      emptyLabel: brief.isPending ? "" : "Write the brief",
    },
    {
      key: "audience",
      icon: Users,
      label: "Audience",
      value: join(sortedPersonas.map((p) => p.name)) ?? (profile.audience?.trim() || null),
      meta: personas.length ? `${personas.length} persona${personas.length === 1 ? "" : "s"}` : undefined,
      href: `${identity}/audience`,
      emptyLabel: "Add personas",
    },
    {
      key: "voice",
      icon: Mic,
      label: "Voice",
      value: voice || null,
      href: `${identity}/voice`,
      emptyLabel: "Measure voice",
    },
    {
      key: "competitors",
      icon: Swords,
      label: "Competitors",
      value: join(competitors),
      meta: competitors.length ? String(competitors.length) : undefined,
      href: marketingRoutes.brandCompetitors(brandSeg),
      emptyLabel: rivals.isPending ? "" : "Add competitors",
    },
    {
      key: "offerings",
      icon: Package,
      label: "Products & services",
      value: join(items.map((i) => i.name)),
      meta: items.length ? String(items.length) : undefined,
      href: marketingRoutes.brandOfferings(brandSeg),
      emptyLabel: offerings.isPending ? "" : "Find them",
    },
  ];

  return (
    <SectionCard
      title="What we know"
      anchor="overview-known"
      about="The brand's identity at a glance: strategy, audience, voice, rivals and offerings. Each line opens its room."
      action={{ label: "Identity", href: identity }}
    >
      <ul className="divide-y divide-border">
        {rows.map(({ key, icon: Icon, label, value, meta, href, emptyLabel }) => (
          <li key={key}>
            <Link
              prefetch={false}
              href={href}
              data-clickable=""
              className="group flex min-h-[52px] items-center gap-3 px-3 py-1.5 hover:bg-accent/40"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Icon className="size-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <PropertyRow
                  label={label}
                  meta={meta}
                  value={
                    value ? (
                      <span className="block truncate" title={value}>
                        {value}
                      </span>
                    ) : (
                      <span className="text-primary">{emptyLabel || "…"}</span>
                    )
                  }
                />
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------------------------------------ */

/** The same picture at several sizes (logo-150x150.png, logo.png) shows once. */
function dedupeLogos(logos: OverviewAsset[]): OverviewAsset[] {
  const seen = new Set<string>();
  return logos.filter((asset) => {
    const file = (asset.preview ?? asset.id).split("?")[0].split("/").pop() ?? asset.id;
    const key = file.toLowerCase().replace(/[-_@]?\d+x\d+(?=\.)/, "").replace(/[-_]?(scaled|small|large|thumb)(?=\.)/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface OverviewSwatch {
  id: string;
  value: string;
  name: string | null;
}

export interface OverviewFont {
  id: string;
  name: string;
}

export function BrandOverviewLook({
  logos,
  colors,
  fonts,
  total,
  onOpen,
}: {
  logos: OverviewAsset[];
  colors: OverviewSwatch[];
  fonts: OverviewFont[];
  total: number;
  onOpen: () => void;
}) {
  const { copyText } = useClipboard({ notify: copyNotify });
  const missing = [logos.length ? null : "Logo", colors.length ? null : "Colors", fonts.length ? null : "Fonts"].filter(
    (x): x is string => Boolean(x),
  );
  return (
    <SectionCard
      title="Brand look"
      anchor="overview-look"
      about="The brand's logos, colors and fonts. Click a color to copy its value."
      action={{ label: total ? `All ${total}` : "Open", onClick: onOpen }}
    >
      <div className="grid gap-3 p-3">
        {logos.length ? (
          <div className="grid grid-cols-4 gap-2">
            {dedupeLogos(logos).slice(0, 4).map((asset) => (
              <AssetTile key={asset.id} asset={asset} onOpen={onOpen} />
            ))}
          </div>
        ) : null}
        {colors.length ? (
          <div className="flex flex-wrap items-center gap-1">
            {colors.slice(0, 10).map((swatch) => (
              <Button
                key={swatch.id}
                variant="quiet"
                aria-label={`Copy color ${swatch.value}`}
                title={`${swatch.name && swatch.name !== swatch.value ? `${swatch.name} · ` : ""}${swatch.value.toUpperCase()} · click to copy`}
                onClick={() => void copyText(swatch.value, `${swatch.value} copied`)}
                icon={<span className="block size-5 rounded-full border border-border" style={{ background: swatch.value }} />}
              />
            ))}
          </div>
        ) : null}
        {fonts.length ? (
          <div className="flex flex-wrap gap-2">
            {fonts.slice(0, 4).map((font) => (
              <span key={font.id} className="flex min-w-0 items-baseline gap-2 rounded-md border border-border px-2.5 py-1.5">
                <span className="text-lg leading-none text-foreground" style={{ fontFamily: `"${font.name}", inherit` }}>
                  Aa
                </span>
                <span className="truncate type-secondary text-foreground">{font.name}</span>
              </span>
            ))}
          </div>
        ) : null}
        {missing.length ? (
          <div className="flex min-h-7 items-center gap-2">
            <span className="type-label">Missing</span>
            <span className="min-w-0 flex-1 truncate type-secondary text-muted-foreground">{missing.join(" · ")}</span>
            <Button variant="quiet" icon={<Plus />} onClick={onOpen}>
              Add
            </Button>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}


/* ------------------------------------------------------------------------------------------------ */

interface NextStep {
  key: string;
  icon: ReactNode;
  label: string;
  href: string;
  primary?: boolean;
}

/**
 * "What to do next": the top three moves the brand's real state calls for (findings waiting, accounts
 * not tracked or gone quiet, no rivals, Search Console not connected, sparse facts). One fixed-height
 * line from first paint — a shimmer until every read it judges has settled — so nothing below moves.
 */
export function BrandOverviewNext({
  brandId,
  brandSeg,
  siteIds,
  accounts,
  accountsLoading,
  pending,
  factCount,
  canEdit,
  tabHref,
}: {
  brandId: string;
  brandSeg: string;
  siteIds: readonly string[];
  accounts: readonly AccountRow[];
  accountsLoading: boolean;
  pending: number | null;
  factCount: number;
  canEdit: boolean;
  tabHref: (tab: string) => string;
}) {
  const rivals = useBrandCompetitorList(brandId, siteIds);
  const gsc = useGscPortfolioRollup(siteIds, "28d");
  const settling = accountsLoading || pending === null || rivals.isPending || gsc.isLoading;
  const untracked = accounts.filter(trackableOwn);
  const quiet = accounts.filter((a) => a.trackedAccountId && a.lastPostAt && isStale(a.lastPostAt));
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const steps: NextStep[] = [];
  if (pending) steps.push({ key: "inbox", icon: <Inbox />, label: `Review ${plural(pending, "finding")}`, href: marketingRoutes.brandDiscovery(brandSeg), primary: true });
  if (canEdit && factCount < 5) steps.push({ key: "enrich", icon: <ScanSearch />, label: "Enrich the brand", href: marketingRoutes.smartAddEnrich(brandId), primary: !pending });
  if (!accounts.length) steps.push({ key: "accounts", icon: <UserPlus />, label: "Add social accounts", href: tabHref("social") });
  if (canEdit && untracked.length) steps.push({ key: "track", icon: <UserPlus />, label: `Track ${plural(untracked.length, "account")}`, href: tabHref("social") });
  if (rivals.isSuccess && !rivals.data.length) steps.push({ key: "rivals", icon: <Swords />, label: "Add competitors", href: marketingRoutes.brandCompetitors(brandSeg) });
  if (siteIds.length && gsc.rollup && !gsc.rollup.hasData) steps.push({ key: "gsc", icon: <ScanSearch />, label: "Connect Search Console", href: marketingRoutes.connectionsGoogle() });
  if (quiet.length) steps.push({ key: "quiet", icon: <RefreshCw />, label: `${plural(quiet.length, "account")} quiet 90+ days`, href: tabHref("social") });

  return (
    <div className="flex h-11 min-w-0 items-center gap-2 overflow-x-auto rounded-lg border border-border bg-card px-3" data-surface-value="overview-next">
      <span className="shrink-0 type-label">Next</span>
      {settling ? (
        <Skeleton motion="shimmer" className="h-6 w-80 max-w-full" />
      ) : steps.length ? (
        steps.slice(0, 3).map((step) => (
          <Button key={step.key} asChild variant={step.primary ? "primary" : "outline"} icon={step.icon} className="shrink-0">
            <Link prefetch={false} href={step.href}>
              {step.label}
            </Link>
          </Button>
        ))
      ) : (
        <span className="type-secondary text-muted-foreground">Nothing waiting</span>
      )}
    </div>
  );
}
