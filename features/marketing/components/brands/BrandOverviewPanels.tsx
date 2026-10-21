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
import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
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
import { contactFactValue } from "@/features/marketing/lib/ContactFactValue";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { useGscPortfolioRollup } from "@/features/marketing/search-console/components/ambassador/useGscPortfolioRollup";
import { useBrandChecks } from "@/features/marketing/seo/ai-visibility/brand/hooks";
import { RunCheckButton } from "@/features/marketing/seo/ai-visibility/brand/RunCheckButton";
import { useStrategyBrief } from "@/features/marketing/strategy/hooks";
import { fetchOfferingItems } from "@/features/marketing/offerings/data";
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
    return <span className="text-muted-foreground">No change {suffix === "%" ? "vs prior 28d" : suffix}</span>;
  }
  const tone = value > 0 ? "text-success-ink" : value < 0 ? "text-destructive-ink" : "text-muted-foreground";
  return (
    <span className={tone}>
      {value > 0 ? "+" : ""}
      {suffix === "%" ? `${Math.round(value * 1000) / 10}%` : formatCompact(value)}
      <span className="text-muted-foreground"> {suffix === "%" ? "vs prior 28d" : suffix}</span>
    </span>
  );
}

/** A KPI hint that is a door: the one click that gets the missing number. */
function HintDoor({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link prefetch={false} href={href} className="text-primary hover:underline">
      {children}
    </Link>
  );
}

export function BrandOverviewKpis({
  brandId,
  brandSeg,
  siteIds,
  accounts,
  accountsLoading,
  competitors,
  tabHref,
}: {
  brandId: string;
  brandSeg: string;
  siteIds: readonly string[];
  accounts: readonly AccountRow[];
  accountsLoading: boolean;
  competitors: number;
  /** The brand home with another tab open (`?tab=`). */
  tabHref: (tab: string) => string;
}) {
  const gsc = useGscPortfolioRollup(siteIds, "28d");
  const checks = useBrandChecks(brandId);
  const offerings = useOfferingItems(brandId);

  const read = accounts.filter((a) => a.followers !== null);
  const followers = read.length ? read.reduce((sum, a) => sum + (a.followers ?? 0), 0) : null;
  const delta = followerDelta(accounts);
  const posts = accounts.reduce((sum, a) => sum + a.postsTracked, 0);
  const lastPost = accounts.map((a) => a.lastPostAt).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  const latestCheck = checks.data?.[0] ?? null;
  const items = offerings.data ?? null;
  const confirmed = (items ?? []).filter((i) => i.status === "confirmed").length;
  const rollup = gsc.rollup;

  return (
    <KpiGrid>
      <KpiTile
        className="min-h-[76px]"
        label="Audience"
        title="Followers across the brand's social accounts we have read."
        loading={accountsLoading}
        value={followers === null ? null : formatCompact(followers)}
        href={tabHref("social")}
        hint={
          followers === null ? (
            <HintDoor href={tabHref("social")}>{accounts.length ? "Fetch accounts" : "Add an account"}</HintDoor>
          ) : delta !== null ? (
            <Delta value={delta} suffix="in 30d" />
          ) : (
            `${read.length} account${read.length === 1 ? "" : "s"}`
          )
        }
      />
      <KpiTile
        className="min-h-[76px]"
        label="Posts"
        title="Posts we hold across the brand's social accounts."
        loading={accountsLoading}
        value={accounts.length ? posts.toLocaleString() : null}
        href={marketingRoutes.brandSocials(brandSeg)}
        hint={
          !accounts.length ? (
            <HintDoor href={tabHref("social")}>Add an account</HintDoor>
          ) : lastPost ? (
            `Last post ${lastPostLabel(lastPost, posts)}`
          ) : (
            "No posts fetched yet"
          )
        }
      />
      <KpiTile
        className="min-h-[76px]"
        label="Search clicks"
        title="Google Search clicks to the brand's websites in the last 28 days."
        loading={gsc.isLoading}
        value={rollup?.hasData ? rollup.totalClicks.toLocaleString() : null}
        href={tabHref("web")}
        hint={
          siteIds.length === 0 ? (
            <HintDoor href={tabHref("web")}>Add a website</HintDoor>
          ) : !rollup?.hasData ? (
            <HintDoor href={marketingRoutes.connectionsGoogle()}>Connect Search Console</HintDoor>
          ) : rollup.totalDeltaPct !== null ? (
            <Delta value={rollup.totalDeltaPct} suffix="%" />
          ) : (
            "Last 28 days"
          )
        }
      />
      <KpiTile
        className="min-h-[76px]"
        label="AI share of voice"
        title="How often AI answers name this brand next to its competitors."
        loading={checks.isPending}
        read={checks.isError ? { status: "error", error: checks.error } : null}
        value={latestCheck?.score == null ? null : `${latestCheck.score}%`}
        href={marketingRoutes.brandAiVisibility(brandSeg)}
        hint={
          latestCheck ? (
            `Checked ${formatRelativeTime(latestCheck.checked_at)}`
          ) : (
            <HintDoor href={marketingRoutes.brandAiVisibility(brandSeg)}>Run a check</HintDoor>
          )
        }
      />
      <KpiTile
        className="min-h-[76px]"
        label="Competitors"
        title="Rivals on the brand's competitor list."
        value={competitors.toLocaleString()}
        href={marketingRoutes.brandCompetitors(brandSeg)}
        hint={
          competitors ? "On the list" : "None added yet"
        }
      />
      <KpiTile
        className="min-h-[76px]"
        label="Products & services"
        title="Products and services found for this brand."
        loading={offerings.isPending}
        read={offerings.isError ? { status: "error", error: offerings.error } : null}
        value={items ? items.length.toLocaleString() : null}
        href={marketingRoutes.brandOfferings(brandSeg)}
        hint={
          items && items.length ? `${confirmed.toLocaleString()} confirmed` : "None found yet"
        }
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
  const { busyRow, progress, trackOwn, trackAllOwn, refreshOwn } = useTrackOwn(organizationId, brandId);
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
        canEdit && untracked.length ? (
          <Button
            variant="outline"
            icon={<RefreshCw />}
            disabled={busyRow !== null}
            title="Track every account not tracked yet and fetch its posts"
            onClick={() => void trackAllOwn(untracked)}
          >
            {busyRow === "bulk" ? "Fetching…" : `Fetch all posts (${untracked.length})`}
          </Button>
        ) : null
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
              const profileValue = a.profileUrl || a.externalUrl || a.handle;
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
                            <span className="shrink-0">{platformLabel(a.platform)} ·</span>
                            {profileValue && handleText
                              ? contactFactValue({ kind: "social_profile", value: profileValue, platform: a.platform, className: "inline-flex min-w-0 text-xs" })
                              : <span className="truncate">{handleText ?? "No handle"}</span>}
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
                    <span className="whitespace-nowrap sm:text-right" title={a.lastPostAt ?? undefined}>
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
      <div className="grid grid-cols-2 gap-2 p-3">
        {canEdit ? link(marketingRoutes.smartAddEnrich(brandId), <ScanSearch />, "Enrich brand") : null}
        {link(marketingRoutes.brandDiscovery(brandSeg), <Inbox />, "Review inbox", pending === null ? "…" : pending.toLocaleString())}
        {canEdit ? <RunCheckButton brandId={brandId} organizationId={organizationId} /> : null}
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
  profile,
  personas,
}: {
  brandId: string;
  brandSeg: string;
  organizationId: string;
  profile: BrandProfile;
  personas: readonly BrandPersona[];
}) {
  const brief = useStrategyBrief("brand", brandId, organizationId);
  const offerings = useOfferingItems(brandId);
  const identity = marketingRoutes.brandIdentity(brandSeg);
  const join = (list: readonly string[], limit = 3) =>
    list.length ? list.slice(0, limit).join(" · ") + (list.length > limit ? ` +${list.length - limit}` : "") : null;

  const lines = brief.data?.serviceLines.map((line) => line.name).filter(Boolean) ?? [];
  const strategyValue = profile.positioning?.trim() || join(lines) || null;
  const sortedPersonas = [...personas].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  const voice = profile.voice_tone?.trim() || join(profile.personality ?? [], 4);
  const competitors = (profile.competitors ?? []).map((c) => c.name).filter(Boolean);
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
      emptyLabel: "Add competitors",
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
            {logos.slice(0, 4).map((asset) => (
              <AssetTile key={asset.id} asset={asset} onOpen={onOpen} />
            ))}
          </div>
        ) : null}
        {colors.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
            {colors.slice(0, 8).map((swatch) => (
              <div key={swatch.id} className="flex min-w-0 flex-col items-stretch gap-1">
                <span
                  className="h-11 rounded-md border border-border shadow-sm"
                  style={{ background: swatch.value }}
                  title={swatch.name && swatch.name !== swatch.value ? `${swatch.name} · ${swatch.value}` : swatch.value}
                />
                <Button
                  variant="quiet"
                  aria-label={`Copy color ${swatch.value}`}
                  title={`Copy ${swatch.value}`}
                  onClick={() => void copyText(swatch.value, `${swatch.value} copied`)}
                >
                  {swatch.value.toUpperCase()}
                </Button>
              </div>
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

