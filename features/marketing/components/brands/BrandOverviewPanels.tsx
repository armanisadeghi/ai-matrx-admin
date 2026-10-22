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

import { useEffect, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  MoreHorizontal,
  Plus,
  Mic,
  Package,
  RefreshCw,
  ScanSearch,
  Search,
  Swords,
  TriangleAlert,
  UserCog,
  UserPlus,
  UserRound,
  Users,
  Workflow,
} from "lucide-react";

import { Badge, Button, PropertyRow, InfoHint, KpiGrid, KpiTile } from "@ai-matrx/design-system/controls";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ReadFailure, Skeleton } from "@ai-matrx/design-system";
import { formatCount, formatRelativeTime } from "@ai-matrx/kit/format";

import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import { AssetTile, type OverviewAsset } from "@/features/marketing/components/brands/BrandOverview";
import { rankLogos } from "@/features/marketing/components/brands/logo-rank";
import { useLogoTones } from "@/features/marketing/components/brands/logo-tones";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { useGscPortfolioRollup } from "@/features/marketing/search-console/components/ambassador/useGscPortfolioRollup";
import { GscPortfolioClassBar } from "@/features/marketing/search-console/components/ambassador/GscPortfolioClassBar";
import { useBrandOverviewTrends, useBrandSearchClicks, useBrandTopQueries } from "@/features/marketing/components/brands/useBrandOverviewTrends";
import { useBrandCheckEstimate, useBrandChecks } from "@/features/marketing/seo/ai-visibility/brand/hooks";
import { RunCheckButton } from "@/features/marketing/seo/ai-visibility/brand/RunCheckButton";
import { useStrategyBrief } from "@/features/marketing/strategy/hooks";
import { fetchOfferingItems } from "@/features/marketing/offerings/data";
import { listBrandCompetitors, type BrandCompetitor } from "@/features/marketing/competitors/brand-competitors";
import { brandAccountHref } from "@/features/marketing/social/property-account-href";
import { accountLabels, accountName, formatGrowth, lastPostLabel } from "@/features/marketing/social/mappers";
import { formatCompact } from "@/features/marketing/social/outlier";
import { profileAvatarDoor } from "@/features/marketing/social/server";
import { PlatformMark, platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { SocialImage } from "@/features/marketing/social/components/SocialImage";
import { trackableOwn, useTrackOwn } from "@/features/marketing/social/components/useTrackOwn";
import { formatSocialHandle } from "@/features/marketing/lib/social-handle";
import type { AccountRow } from "@/features/marketing/social/types";
import { checkAccountOwners, type BrandIdentity } from "@/features/marketing/social/owner-check";
import { AccountOwnerDialog } from "@/features/marketing/components/brands/AccountOwnerDialog";
import { emitAssistTracked } from "@/features/assists/redux/emitTracked";
import { filterUndecidedKeys } from "@/features/assists/service";
import { assistPriority } from "@/features/assists/types";
import { BRAND_ASSIST_SURFACE } from "@/features/marketing/brand-assists/select-offers";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
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
    return <span className="text-muted-foreground">{suffix === "%" ? "No change vs prior" : "No change"}</span>;
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

/** The newest last post across these accounts. */
function latestPost(accounts: readonly AccountRow[]): string | null {
  return accounts.map((a) => a.lastPostAt).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
}

/** "Oct 17" for a Search Console day (a UTC date). */
function shortDay(day: string): string {
  return new Date(`${day.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Below this many prior clicks a percentage shouts (5 vs 3 = +66.7%): the change shows as a count instead. */
const SMALL_CLICK_BASE = 20;

function SearchDelta({ total, prior, pct }: { total: number; prior: number | null; pct: number | null }) {
  if (prior === null) return <span className="text-muted-foreground">No earlier period</span>;
  if (prior < SMALL_CLICK_BASE || pct === null) return <Delta value={total - prior} suffix="vs prior" />;
  return <Delta value={pct} suffix="%" />;
}

/**
 * Rivals with the most evidence first: tracked social accounts and a tracked website outrank a bare
 * name (a stray "britannica.com" or a person's name never heads the list). Nothing is removed.
 */
/** Content platforms where an account is a channel (a creator), not a business. */
const CHANNEL_PLATFORMS = new Set(["youtube", "tiktok", "twitch", "podcast"]);

/**
 * Competitors with the most evidence of being a rival business first: a website (tracked or not), presence on
 * several platforms, then reach. A rival known only as a YouTube/TikTok channel with no website (a creator the
 * discovery picked up, "minutephysics" on ai-matrx) comes after every business. Nothing is removed.
 */
function rankedNames(rivals: readonly BrandCompetitor[]): string[] {
  const evidence = (c: BrandCompetitor) => {
    const platforms = new Set(c.accounts.map((a) => a.platform.toLowerCase()));
    const channelOnly = !c.domain && platforms.size > 0 && [...platforms].every((p) => CHANNEL_PLATFORMS.has(p));
    return (
      (c.domain ? 4 : 0) +
      (c.websiteTracking === "tracked" ? 2 : 0) +
      platforms.size * 2 +
      Math.log10(1 + c.accounts.reduce((sum, a) => sum + (a.followers ?? 0), 0)) -
      (channelOnly ? 20 : 0)
    );
  };
  return [...rivals].sort((a, b) => evidence(b) - evidence(a)).map((c) => c.name).filter(Boolean);
}

/** A phrase lifted from a list rather than a name: lower-case and short, or opening with a conjunction ("and community"). */
function isFragment(name: string): boolean {
  const text = name.trim();
  return /^(and|or|&|with|for|of)\b/i.test(text) || (/^[a-z]/.test(text) && text.split(/\s+/).length <= 2);
}

const CERTAINTY_RANK: Record<string, number> = { confirmed: 3, likely: 2, possible: 1 };

/**
 * Products and services with the most evidence first: confirmed, then certainty, then how many sources
 * name them. Ties go to what the brand mostly sells (its majority kind) and to proper names over a
 * lower-case phrase lifted from page text ("aesthetic results" on a swimwear brand); an unconfirmed fragment
 * ("and community", a LinkedIn specialty list) comes after every named item. Nothing is removed.
 */
function rankedOfferings<T extends { name: string; kind: string; status: string; certainty: string; quotes: readonly unknown[]; families: readonly unknown[] }>(items: readonly T[]): T[] {
  const live = items.filter((i) => i.status !== "dismissed");
  const kinds = new Map<string, number>();
  for (const i of live) kinds.set(i.kind, (kinds.get(i.kind) ?? 0) + 1);
  const score = (i: T) =>
    (i.status === "confirmed" ? 1000 : 0) +
    (CERTAINTY_RANK[i.certainty] ?? 0) * 100 -
    // An unconfirmed fragment never leads a named, better-evidenced item.
    (i.status !== "confirmed" && isFragment(i.name) ? 250 : 0) +
    (i.quotes.length + i.families.length) * 10 +
    ((kinds.get(i.kind) ?? 0) * 2 > live.length ? 2 : 0) +
    (/^[A-Z0-9]/.test(i.name) ? 1 : 0);
  return live.sort((a, b) => score(b) - score(a));
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
  const checks = useBrandChecks(brandId);
  const offerings = useOfferingItems(brandId);
  const competitors = useBrandCompetitorList(brandId, siteIds);

  // Every KPI counts the brand's own accounts; people's accounts are named apart, the same way on each tile.
  const audience = splitAudience(accounts);
  const brandDelta = followerDelta(audience.brand);
  const trends = useBrandOverviewTrends({
    profileIds: audience.brand.map((a) => a.profileId).filter((id): id is string => Boolean(id)),
    siteIds,
  });
  const posts = audience.brand.reduce((sum, a) => sum + a.postsTracked, 0);
  const peoplePosts = audience.people.reduce((sum, a) => sum + a.postsTracked, 0);
  const lastPost = latestPost(audience.brand);
  const latestCheck = checks.data?.[0] ?? null;
  const items = offerings.data ?? null;
  const confirmed = (items ?? []).filter((i) => i.status === "confirmed").length;
  const rivals = competitors.data ?? null;
  const clicks = trends.clicks;
  const followerNet = trends.followers ? { value: trends.followers.net, period: trends.followers.period } : null;
  const social = tabHref("social");
  // A hint shows only once its read has settled: never a false "connect" or "none" while loading.
  const settled = (loading: boolean, hint: ReactNode) => (loading ? undefined : hint);
  // People's accounts, named apart on every tile the same way: "People 8.9K" with a person glyph. A total, never a
  // signed number: + and − are reserved for change.
  const personal = (n: number | null, what: string) =>
    n ? (
      <span className="text-muted-foreground" aria-label={`${n.toLocaleString()} ${what} on people's personal accounts`}>
        {" · "}
        <UserRound className="inline size-3 align-[-1px]" aria-hidden="true" /> People {formatCompact(n)}
      </span>
    ) : null;

  return (
    <KpiGrid>
      <KpiTile
        className="min-h-[76px]"
        label="Audience"
        title="Followers of the brand's own accounts. People counts personal accounts apart; they are not in the total."
        loading={accountsLoading}
        value={audience.brandFollowers === null ? null : formatCompact(audience.brandFollowers)}
        trend={trends.followers}
        href={social}
        hint={settled(
          accountsLoading,
          audience.brandFollowers === null ? (
            <HintDoor href={social}>{accounts.length ? "Fetch accounts" : "Add an account"}</HintDoor>
          ) : (
            <span className="block truncate">
              {followerNet ? (
                <Delta value={followerNet.value} suffix={`in ${followerNet.period.replace(/ days?$/, "d")}`} />
              ) : brandDelta !== null ? (
                <Delta value={brandDelta} suffix="in 30d" />
              ) : (
                `${audience.brand.length} account${audience.brand.length === 1 ? "" : "s"}`
              )}
              {personal(audience.peopleFollowers, "followers")}
            </span>
          ),
        )}
      />
      <KpiTile
        className="min-h-[76px]"
        label="Posts"
        title="Posts we hold on the brand's own accounts and its last post. People counts personal accounts' posts apart."
        loading={accountsLoading}
        value={posts ? posts.toLocaleString() : null}
        trend={trends.posts}
        href={social}
        hint={settled(
          accountsLoading,
          !accounts.length ? (
            <HintDoor href={social}>Add an account</HintDoor>
          ) : (
            <span className="block truncate">
              {lastPost ? (
                <span className={isStale(lastPost) ? "text-warning-ink" : undefined}>{lastPostLabel(lastPost, posts)}</span>
              ) : (
                <HintDoor href={social}>Fetch posts</HintDoor>
              )}
              {personal(peoplePosts, "posts")}
            </span>
          ),
        )}
      />
      <KpiTile
        className="min-h-[76px]"
        label="Search clicks · 28d"
        title="Every Google Search click to the brand's websites over 28 days, as Search Console counts it. Google reports 2-3 days late."
        loading={trends.clicksLoading}
        read={trends.clicksError ? { status: "error", error: trends.clicksError } : null}
        value={clicks?.hasData ? formatCount(clicks.total) : null}
        trend={clicks?.trend}
        href={tabHref("web")}
        hint={settled(
          trends.clicksLoading || Boolean(trends.clicksError),
          siteIds.length === 0 ? (
            <HintDoor href={tabHref("web")}>Add a website</HintDoor>
          ) : !clicks?.hasData ? (
            <HintDoor href={marketingRoutes.connectionsGoogle()}>Connect Search Console</HintDoor>
          ) : (
            <span className="block truncate">
              <SearchDelta total={clicks.total} prior={clicks.compareTotal} pct={clicks.deltaPct} />
              {clicks.dataEnd ? <span className="text-muted-foreground"> · to {shortDay(clicks.dataEnd)}</span> : null}
            </span>
          ),
        )}
      />
      <KpiTile
        className="min-h-[76px]"
        label="AI share of voice"
        title="How often AI answers name this brand next to its competitors."
        loading={checks.isLoading}
        read={checks.isError ? { status: "error", error: checks.error } : null}
        value={latestCheck?.score == null ? null : `${latestCheck.score}%`}
        href={marketingRoutes.brandAiVisibility(brandSeg)}
        hint={settled(
          checks.isLoading,
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
        loading={competitors.isLoading}
        read={competitors.isError ? { status: "error", error: competitors.error } : null}
        value={rivals && rivals.length ? formatCount(rivals.length) : null}
        href={marketingRoutes.brandCompetitors(brandSeg)}
        hint={settled(
          competitors.isLoading,
          rivals && rivals.length ? (
            <span title={rankedNames(rivals).join(", ")}>{rankedNames(rivals).slice(0, 2).join(" · ")}</span>
          ) : (
            <HintDoor href={marketingRoutes.brandCompetitors(brandSeg)}>Add competitors</HintDoor>
          ),
        )}
      />
      <KpiTile
        className="min-h-[76px]"
        label="Products & services"
        title="Products and services found for this brand."
        loading={offerings.isLoading}
        read={offerings.isError ? { status: "error", error: offerings.error } : null}
        value={items && items.length ? formatCount(items.length) : null}
        href={marketingRoutes.brandOfferings(brandSeg)}
        hint={settled(
          offerings.isLoading,
          items && items.length ? (
            `${formatCount(confirmed)} confirmed`
          ) : (
            <HintDoor href={marketingRoutes.brandOfferings(brandSeg)}>Find them</HintDoor>
          ),
        )}
      />
    </KpiGrid>
  );
}

/* ------------------------------------------------------------------------------------------------ */

/** A click that landed on a link, button or menu item inside a clickable row (portaled menus bubble too). */
function insideControl(target: EventTarget): boolean {
  return target instanceof Element && Boolean(target.closest("a, button, input, [role='menuitem'], [role='menu'], [role='dialog']"));
}

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

/** The account table's column template (name, followers, 30d, posts, last post, actions); 30d only when any account has it. */
const ACCOUNT_GRID = "sm:grid sm:grid-cols-[minmax(0,1fr)_4.5rem_4rem_4rem_5.5rem_4rem] sm:items-center sm:gap-3";
const ACCOUNT_GRID_NO_GROWTH = "sm:grid sm:grid-cols-[minmax(0,1fr)_4.5rem_4rem_5.5rem_4rem] sm:items-center sm:gap-3";

/**
 * Raise "whose account is this?" for brand-owned accounts whose name shares no word with the brand
 * (imports attach every account as the brand's). Through the ONE assist door, once per account: a
 * decided assist is never re-raised, a pending one is refreshed in place. Nothing is changed for the person.
 */
function useAccountOwnerAssists({
  brandId,
  brandName,
  accounts,
  enabled,
  allHref,
}: {
  brandId: string;
  brandName: string;
  accounts: readonly AccountRow[];
  enabled: boolean;
  allHref: string;
}) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  // A plain-text identity of what to raise, so a refetch with the same rows never re-runs the producer.
  const facts = JSON.stringify(
    accounts
      .filter((a) => a.propertyId)
      .map((a) => ({ id: a.propertyId as string, name: accountName(a), platform: platformLabel(a.platform), profile: a.profileName ?? a.displayName, url: a.profileUrl ?? a.externalUrl ?? null }))
      .sort((x, y) => x.id.localeCompare(y.id)),
  );
  useEffect(() => {
    const rows = JSON.parse(facts) as { id: string; name: string; platform: string; profile: string; url: string | null }[];
    if (!enabled || !userId || !rows.length) return;
    let cancelled = false;
    const byKey = new Map<string, (typeof rows)[number]>(rows.map((r) => [`brand.account-owner.${r.id}`, r]));
    void (async () => {
      const open = await filterUndecidedKeys([...byKey.keys()]);
      for (const dedupeKey of open) {
        const r = byKey.get(dedupeKey);
        if (!r || cancelled) break;
        await emitAssistTracked(
          userId,
          {
            sourceKey: "brand.account-owner",
            sourceKind: "deterministic",
            title: `Is ${r.name} ${brandName}'s account?`,
            body: `Its name shares no word with ${brandName}. If it is a person's own account, mark it personal so it stops counting toward the brand's audience and posts.`,
            action: { kind: "navigate", href: allHref, label: "Set owner" },
            surfaceName: BRAND_ASSIST_SURFACE,
            entityType: "web_brand",
            entityId: brandId,
            dedupeKey,
            priority: assistPriority("normal", 6),
            evidence: { kind: `${r.platform} account`, label: r.name, snippet: r.profile, ...(r.url ? { href: r.url } : {}), ref: r.id },
            confidence: 0.7,
          },
          dispatch,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, userId, facts, brandId, brandName, allHref, dispatch]);
}

/** One totals line: the brand's own accounts, or the people's accounts named apart. */
function AccountTotals({ label, list, grid, hasGrowth, muted }: { label: string; list: readonly AccountRow[]; grid: string; hasGrowth: boolean; muted?: boolean }) {
  const followers = list.reduce((sum, a) => sum + (a.followers ?? 0), 0);
  const posts = list.reduce((sum, a) => sum + a.postsTracked, 0);
  const last = latestPost(list);
  const ink = muted ? "text-muted-foreground" : "text-foreground";
  return (
    <div className={`flex flex-wrap gap-x-4 border-t border-border bg-muted/40 px-3 py-1.5 type-meta tabular-nums text-muted-foreground ${grid}`}>
      <span className={`font-medium ${ink}`}>
        {label} · {list.length} account{list.length === 1 ? "" : "s"}
      </span>
      <span className={`font-medium sm:text-right ${ink}`}>
        {formatCompact(followers)}
        <span className="font-normal text-muted-foreground sm:hidden"> followers</span>
      </span>
      {hasGrowth ? <span className="max-sm:hidden" /> : null}
      <span className="sm:text-right">{posts.toLocaleString()} posts</span>
      <span className="whitespace-nowrap sm:text-right">{last ? lastPostLabel(last, posts) : "—"}</span>
      <span className="max-sm:hidden" />
    </div>
  );
}

export function BrandOverviewAccounts({
  brandId,
  brandSeg,
  brandName,
  identity,
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
  /** Compared with each brand-owned account's name: one that shares no word with it is raised for review. */
  brandName: string;
  /** Legal names and websites: an account any of the brand's names describes is not raised. */
  identity: Omit<BrandIdentity, "name">;
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
  const router = useRouter();
  const [ownerRow, setOwnerRow] = useState<AccountRow | null>(null);
  const { brand, people } = splitAudience(accounts);
  // Tracking and refreshing spend points on the brand's own accounts only; a person's account is theirs.
  const tracked = brand.filter((a) => a.trackedAccountId && a.profileId);
  const refreshedAt = accounts.map((a) => a.lastRefreshedAt).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  const untracked = brand.filter(trackableOwn);
  const byFollowers = (a: AccountRow, b: AccountRow) => (b.followers ?? -1) - (a.followers ?? -1);
  const sorted = [...[...brand].sort(byFollowers), ...[...people].sort(byFollowers)];
  const shown = sorted.slice(0, ACCOUNT_PREVIEW);
  const holdRows = Math.min(ACCOUNT_PREVIEW, Math.max(1, expectedRows));
  const hasGrowth = accounts.some((a) => a.growth !== null);
  const grid = hasGrowth ? ACCOUNT_GRID : ACCOUNT_GRID_NO_GROWTH;
  const ownerCheck = checkAccountOwners(brand, { ...identity, name: brandName });
  const suspect = new Set(brand.filter((a, i) => a.propertyId && ownerCheck.suspects.has(i)).map((a) => a.rowId));
  useAccountOwnerAssists({ brandId, brandName, accounts: brand.filter((a) => suspect.has(a.rowId)), enabled: canEdit && !loading, allHref });

  return (
    <SectionCard
      title="Social accounts"
      anchor="overview-accounts"
      count={accounts.length || undefined}
      about="The brand's accounts and people's personal accounts, with their latest numbers. Only the brand's own count toward its KPIs."
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
              title="Track the brand's accounts not tracked yet and fetch their posts"
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
              title="Fetch new posts for every tracked brand account"
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
              const isPerson = a.ownerKind === "person";
              const canTrack = canEdit && !isPerson && trackableOwn(a);
              const canRefresh = canEdit && Boolean(a.trackedAccountId && a.profileId);
              return (
                <li
                  key={a.rowId}
                  // The whole row opens the account; links, buttons and the row menu inside keep their own job.
                  {...(href
                    ? {
                        tabIndex: 0,
                        "data-clickable": "",
                        "aria-label": `Open ${labels.primary}`,
                        onClick: (event: MouseEvent<HTMLLIElement>) => {
                          if (insideControl(event.target)) return;
                          router.push(href);
                        },
                        onKeyDown: (event: KeyboardEvent<HTMLLIElement>) => {
                          if (event.key !== "Enter" || event.target !== event.currentTarget) return;
                          router.push(href);
                        },
                      }
                    : {})}
                  className={`flex min-h-[52px] flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 outline-none focus-visible:bg-accent/50 ${href ? "hover:bg-accent/40" : ""} ${grid}`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    {href ? (
                      <Link prefetch={false} href={href} className="shrink-0" data-clickable="" aria-label={labels.primary}>
                        <AccountAvatar account={a} />
                      </Link>
                    ) : (
                      <AccountAvatar account={a} />
                    )}
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="flex min-w-0 items-center gap-1.5">
                        {href ? (
                          <Link prefetch={false} href={href} className="truncate type-title text-foreground hover:underline" data-clickable="">
                            {labels.primary}
                          </Link>
                        ) : (
                          <span className="truncate type-title text-foreground">{labels.primary}</span>
                        )}
                        {isPerson ? (
                          <span className="shrink-0" title={a.ownerName ? `${a.ownerName}'s account` : "A person's account"}>
                            <Badge>Personal</Badge>
                          </span>
                        ) : suspect.has(a.rowId) ? (
                          <span className="flex shrink-0 items-center gap-1">
                            <Badge tone="warning">Check owner</Badge>
                            <InfoHint text="Its name shares no word with the brand's. Set the owner from the row menu." label="Why check the owner" />
                          </span>
                        ) : null}
                      </span>
                      <span className="flex min-w-0 items-center gap-1 type-meta text-muted-foreground">
                        {busy && progress ? (
                          <span className="truncate text-primary">{progress}</span>
                        ) : externalUrl && handleText ? (
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
                  <span className="flex shrink-0 items-center justify-end gap-0.5">
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
                    {canEdit && a.propertyId ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="quiet" icon={<MoreHorizontal />} aria-label={`More for ${labels.primary}`} title="More" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setOwnerRow(a)}>
                            <UserCog className="size-4" aria-hidden="true" />
                            {isPerson ? `Owner: ${a.ownerName || "a person"}` : "Owner: the brand"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
          <AccountTotals label="Brand" list={brand} grid={grid} hasGrowth={hasGrowth} />
          {people.length ? <AccountTotals label="Personal" list={people} grid={grid} hasGrowth={hasGrowth} muted /> : null}
          {ownerCheck.nameMostAccountsUse ? (
            <p className="flex min-h-7 items-center gap-2 border-t border-border px-3 type-meta text-warning-ink">
              <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate" title={`Brand name "${brandName}"; most accounts say "${ownerCheck.nameMostAccountsUse}"`}>
                Most accounts say {ownerCheck.nameMostAccountsUse}
              </span>
            </p>
          ) : null}
        </div>
      )}
      <AccountOwnerDialog account={ownerRow} organizationId={organizationId} onClose={() => setOwnerRow(null)} />
    </SectionCard>
  );
}

/* ------------------------------------------------------------------------------------------------ */

/** Icon and label start on one left edge in every quick action (centered text under a left icon read as sloppy). */
const QUICK_ACTION = "w-full justify-start";

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
    <Button asChild variant="outline" icon={icon} meta={meta} className={QUICK_ACTION}>
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
        {canEdit ? (
          aiEstimate.data && !aiEstimate.data.can_compare ? (
            // The AI check compares the brand with the rivals named for it; with none, the door is naming them.
            <Button asChild variant="outline" icon={<Swords />} className={QUICK_ACTION} title="Name the rivals to compare with, then run the check">
              <Link prefetch={false} href={marketingRoutes.brandAiVisibility(brandSeg)}>
                Set up AI check
              </Link>
            </Button>
          ) : (
            <RunCheckButton brandId={brandId} organizationId={organizationId} className={QUICK_ACTION} />
          )
        ) : null}
        {link(`${identity}/voice`, <Mic />, "Measure voice")}
        {link(marketingRoutes.brandCompetitors(brandSeg), <Swords />, "Add competitor")}
        {link(marketingRoutes.brandAssets(brandSeg, "generate"), <ImagePlus />, "Generate image")}
        {link(marketingRoutes.brandAssets(brandSeg), <FolderOpen />, "Asset desk")}
        {canEdit ? (
          <Button variant="outline" icon={<ListPlus />} className={QUICK_ACTION} onClick={onAddFact}>
            Add fact
          </Button>
        ) : null}
        {canEdit ? (
          <Button variant="outline" icon={<UserPlus />} className={QUICK_ACTION} onClick={onAddAccount}>
            Add account
          </Button>
        ) : null}
        <Button variant="outline" icon={<Workflow />} className={QUICK_ACTION} onClick={onOpenActivity}>
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

/**
 * The voice in a few words: a short tone line as written, else the opening clause of a measured voice
 * report ("Professional voice; mixed sentence lengths of about 31 words…" -> "Professional"). A report
 * with no words to lift reads as not measured, never as a made-up trait.
 */
export function toneWords(toneLine: string | null | undefined): string | null {
  const line = toneLine?.trim() ?? "";
  if (!line) return null;
  if (line.length <= 60 && !/\d/.test(line)) return line;
  const first = line.split(/[;.]/)[0]?.trim().replace(/\s+(voice|tone)$/i, "") ?? "";
  return first && first.length <= 40 && !/\d/.test(first) ? first : null;
}

export function BrandOverviewKnown({
  brandId,
  brandSeg,
  organizationId,
  siteIds,
  profile,
  personas,
  tabHref,
}: {
  brandId: string;
  brandSeg: string;
  organizationId: string;
  siteIds: readonly string[];
  profile: BrandProfile;
  personas: readonly BrandPersona[];
  /** The brand home with another tab open (`?tab=`). */
  tabHref: (tab: string) => string;
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
  const voice = join(profile.personality ?? [], 4) || toneWords(profile.voice_tone);
  // Most evidence first, so a stray name ("britannica.com", "aesthetic results") is never top-billed.
  const competitors = rankedNames(rivals.data ?? []);
  const items = rankedOfferings(offerings.data ?? []);
  const search = useBrandSearchClicks(siteIds);
  const topQueries = useBrandTopQueries(siteIds, search.periods, Boolean(search.clicks?.hasData));
  const queries = (topQueries.data ?? []).map((q) => q.query);
  const position = search.clicks?.avgPosition ?? null;

  const rows: KnownRow[] = [
    {
      key: "strategy",
      icon: Compass,
      label: "Strategy",
      value: strategyValue,
      meta: brief.data ? STRATEGY_STATUS[brief.data.status] : undefined,
      href: `${identity}/strategy`,
      emptyLabel: brief.isLoading ? "" : "Write the brief",
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
      value: voice,
      href: `${identity}/voice`,
      emptyLabel: "Not measured",
    },
    ...(siteIds.length
      ? [
          {
            key: "search",
            icon: Search,
            label: "Top searches",
            value: join(queries),
            meta: position === null ? undefined : `Avg position ${position.toFixed(1)}`,
            href: tabHref("web"),
            emptyLabel: search.error || topQueries.isError ? "Unavailable" : search.loading || topQueries.isLoading ? "" : search.clicks?.hasData ? "No named queries" : "Connect Search Console",
          },
        ]
      : []),
    {
      key: "competitors",
      icon: Swords,
      label: "Competitors",
      value: join(competitors),
      meta: competitors.length ? String(competitors.length) : undefined,
      href: marketingRoutes.brandCompetitors(brandSeg),
      emptyLabel: rivals.isLoading ? "" : "Add competitors",
    },
    {
      key: "offerings",
      icon: Package,
      label: "Products & services",
      value: join(items.map((i) => i.name)),
      meta: items.length ? String(items.length) : undefined,
      href: marketingRoutes.brandOfferings(brandSeg),
      emptyLabel: offerings.isLoading ? "" : "Find them",
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
              {/* Meta and chevron are one cluster on the row's center line, never up on the label line. */}
              <span className="flex shrink-0 items-center gap-2 self-center">
                {meta ? <span className="whitespace-nowrap type-meta tabular-nums text-muted-foreground">{meta}</span> : null}
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------------------------------------ */

/** Best mark first, one per picture (sizes, CDN mirrors, a site's favicon family and saved copies collapse). */
function rankedLogos(logos: readonly OverviewAsset[]): (OverviewAsset & { url: string })[] {
  return rankLogos(logos.flatMap((asset) => (asset.preview ? [{ ...asset, url: asset.preview, kind: asset.kind ?? "logo" }] : [])));
}

/** The brand's marks (logos, wordmark, favicon). Colors and fonts live in the Brand palette. */
export function BrandOverviewLook({
  logos,
  total,
  onOpen,
}: {
  logos: OverviewAsset[];
  total: number;
  onOpen: () => void;
}) {
  const shownLogos = rankedLogos(logos).slice(0, 4);
  const tones = useLogoTones(shownLogos.map((asset) => asset.url));
  // An expired provider link is not a logo the brand has.
  const hasLogo = shownLogos.some((asset) => !asset.expired);
  return (
    <SectionCard
      title="Logos"
      anchor="overview-look"
      about="The brand's logos and marks, best first."
      action={{ label: total ? `All ${total}` : "Open", onClick: onOpen }}
    >
      <div className="grid gap-3 p-3">
        {shownLogos.length ? (
          <div className="grid grid-cols-4 gap-2">
            {shownLogos.map((asset) => (
              <AssetTile key={asset.id} asset={asset} tone={tones.get(asset.url)} onOpen={onOpen} />
            ))}
          </div>
        ) : null}
        {hasLogo ? null : (
          <div className="flex min-h-7 items-center gap-2">
            <span className="type-label">Missing</span>
            <span className="min-w-0 flex-1 truncate type-secondary text-muted-foreground">Logo</span>
            <Button variant="quiet" icon={<Plus />} onClick={onOpen}>
              Add
            </Button>
          </div>
        )}
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
  const settling = accountsLoading || pending === null || rivals.isLoading || gsc.isLoading;
  const { brand } = splitAudience(accounts);
  const untracked = brand.filter(trackableOwn);
  const quiet = brand.filter((a) => a.trackedAccountId && a.lastPostAt && isStale(a.lastPostAt));
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

/* ------------------------------------------------------------------------------------------------ */

/**
 * The Web & search tab's class bar with the same headline as the Overview's Search clicks tile: the
 * Search Console total, with the classified part labelled as the part it is (one shared read).
 */
export function BrandSearchClassBar({ siteIds, totalSites, title }: { siteIds: readonly string[]; totalSites: number; title: string }) {
  const search = useBrandSearchClicks(siteIds);
  return <GscPortfolioClassBar siteIds={siteIds} totalSites={totalSites} title={title} totalClicks={search.clicks?.total ?? null} />;
}
