"use client";

/**
 * Recent activity on the brand home (HubSpot's record timeline, compact): the newest six things that happened to the
 * brand, from what we already store — posts on its own accounts, site crawls, findings waiting in the inbox, and
 * assets added. Every entry is a door. One query (four small reads in parallel, six rows each). A source with no
 * rows adds nothing; with nothing at all the card is absent.
 */

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileSearch, ImagePlus, Inbox, MessageSquareText, type LucideIcon } from "lucide-react";

import { ReadFailure, Skeleton } from "@ai-matrx/design-system";
import { formatCount, formatRelativeTime } from "@ai-matrx/kit/format";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { marketingSeg } from "@/features/marketing/lib/keys";
import { platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { BRAND_ASSET_KIND_LABELS, isBrandAssetKind } from "@/features/marketing/types";
import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb } from "@/utils/supabase/webDb";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

const SHOWN = 6;

export interface ActivityEntry {
  key: string;
  at: string;
  icon: LucideIcon;
  label: string;
  detail: string | null;
  href: string;
  external?: boolean;
}

interface ActivitySite {
  id: string;
  slug?: string | null;
  domain?: string | null;
  name?: string | null;
}

/** Newest first, at most `limit`, entries without a time dropped. Pure; tested. */
export function newestEntries(entries: readonly ActivityEntry[], limit = SHOWN): ActivityEntry[] {
  return entries
    .filter((e) => e.at && !Number.isNaN(Date.parse(e.at)))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, limit);
}

/** Rows (newest first) split into runs saved within an hour of the run's newest row. Pure; tested. */
export function batchByHour<T extends { created_at: string }>(rows: readonly T[]): T[][] {
  const groups: T[][] = [];
  for (const row of rows) {
    const current = groups.at(-1);
    if (current && Date.parse(current[0].created_at) - Date.parse(row.created_at) <= 3_600_000) current.push(row);
    else groups.push([row]);
  }
  return groups;
}

const CRAWL_WORDS: Record<string, string> = {
  completed: "Site crawl finished",
  complete: "Site crawl finished",
  succeeded: "Site crawl finished",
  failed: "Site crawl failed",
  error: "Site crawl failed",
  running: "Site crawl running",
  queued: "Site crawl queued",
  cancelled: "Site crawl stopped",
};

function useBrandRecentActivity({
  brandId,
  brandSeg,
  sites,
  profileIds,
}: {
  brandId: string;
  brandSeg: string;
  sites: readonly ActivitySite[];
  profileIds: readonly string[];
}) {
  const siteKey = sites.map((s) => s.id).sort().join(",");
  const profileKey = [...profileIds].sort().join(",");
  return useQuery({
    queryKey: ["marketing", "brand-overview", "activity", brandId, siteKey, profileKey],
    queryFn: async ({ signal }): Promise<ActivityEntry[]> => {
      const db = await authenticatedWebDb(supabase);
      const none = Promise.resolve({ data: [] as never[], error: null, count: 0 });
      const [posts, crawls, findings, assets] = await Promise.all([
        profileIds.length
          ? supabase
              .schema("social")
              .from("post")
              .select("id, platform, url, title, caption, posted_at")
              .in("profile_id", [...profileIds])
              .is("deleted_at", null)
              .not("posted_at", "is", null)
              .order("posted_at", { ascending: false })
              .limit(SHOWN)
              .abortSignal(signal)
          : none,
        sites.length
          ? db
              .from("crawl_session")
              .select("id, site_id, status, created_at, finished_at")
              .in("site_id", sites.map((s) => s.id))
              .is("deleted_at", null)
              .order("created_at", { ascending: false })
              // Enough to hold each site's latest crawl (one line per site below).
              .limit(SHOWN * 4)
              .abortSignal(signal)
          : none,
        db
          .from("discovered_item")
          .select("created_at", { count: "exact" })
          .eq("brand_id", brandId)
          .eq("status", "pending")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .abortSignal(signal),
        db
          .from("brand_asset")
          .select("id, kind, title, created_at")
          .eq("brand_id", brandId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(SHOWN * 5)
          .abortSignal(signal),
      ]);
      for (const r of [posts, crawls, findings, assets]) if (r.error) throw r.error;

      const entries: ActivityEntry[] = [];
      for (const p of (posts.data ?? []) as { id: string; platform: string; url: string | null; title: string | null; caption: string | null; posted_at: string }[]) {
        entries.push({
          key: `post:${p.id}`,
          at: p.posted_at,
          icon: MessageSquareText,
          label: `Post on ${platformLabel(p.platform)}`,
          detail: (p.title || p.caption || "").trim().split("\n")[0] || null,
          href: p.url || marketingRoutes.brand(brandSeg) + "?tab=social",
          external: Boolean(p.url),
        });
      }
      const siteById = new Map(sites.map((s) => [s.id, s]));
      // One entry per site, its latest crawl: a re-crawl replaces the earlier line.
      const seenSites = new Set<string>();
      for (const c of (crawls.data ?? []) as { id: string; site_id: string; status: string; created_at: string; finished_at: string | null }[]) {
        if (seenSites.has(c.site_id)) continue;
        seenSites.add(c.site_id);
        const site = siteById.get(c.site_id);
        entries.push({
          key: `crawl:${c.id}`,
          at: c.finished_at ?? c.created_at,
          icon: FileSearch,
          label: CRAWL_WORDS[c.status] ?? "Site crawl",
          detail: site?.domain ?? site?.name ?? null,
          href: marketingRoutes.site(brandSeg, site ? marketingSeg({ id: site.id, slug: site.slug }) : c.site_id, "/crawls"),
        });
      }
      const pendingCount = findings.count ?? 0;
      const newestFinding = ((findings.data ?? []) as { created_at: string }[])[0]?.created_at;
      if (pendingCount > 0 && newestFinding) {
        entries.push({
          key: "findings",
          at: newestFinding,
          icon: Inbox,
          label: `${formatCount(pendingCount)} finding${pendingCount === 1 ? "" : "s"} to review`,
          detail: null,
          href: marketingRoutes.brandDiscovery(brandSeg),
        });
      }
      // Assets saved together (an enrich run files a dozen at once) are one entry, never six lines of "Font added".
      const assetRows = (assets.data ?? []) as { id: string; kind: string; title: string | null; created_at: string }[];
      for (const group of batchByHour(assetRows)) {
        const first = group[0];
        const kindLabel = (k: string) => (isBrandAssetKind(k) ? BRAND_ASSET_KIND_LABELS[k] : "Asset");
        entries.push({
          key: `asset:${first.id}`,
          at: first.created_at,
          icon: ImagePlus,
          label: group.length === 1 ? `${kindLabel(first.kind)} added` : `${group.length} assets added`,
          detail:
            group.length === 1
              ? first.title
              : [...new Set(group.map((a) => kindLabel(a.kind)))].join(" · "),
          href: `${marketingRoutes.brand(brandSeg)}?tab=assets`,
        });
      }
      return newestEntries(entries);
    },
    staleTime: 60_000,
  });
}

export function BrandOverviewActivity({
  brandId,
  brandSeg,
  sites,
  profileIds,
  enabled,
}: {
  brandId: string;
  brandSeg: string;
  sites: readonly ActivitySite[];
  /** The brand's own account profiles: people's accounts are not the brand's activity. */
  profileIds: readonly string[];
  /** Wait until the accounts are read, so the query runs once with the real profile list. */
  enabled: boolean;
}) {
  const activity = useBrandRecentActivity({ brandId, brandSeg, sites, profileIds });
  const rows = activity.data ?? [];
  if (!enabled) return null;
  if (activity.isSuccess && rows.length === 0) return null;
  return (
    <SectionCard title="Recent activity" anchor="overview-activity">
      {activity.isLoading ? (
        <div aria-busy="true" aria-label="Loading activity" className="divide-y divide-border">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex h-11 items-center gap-2 px-3">
              <Skeleton className="size-4 shrink-0 rounded" />
              <Skeleton className="h-4 w-40 max-w-full" />
            </div>
          ))}
        </div>
      ) : activity.isError ? (
        <ReadFailure error={activity.error} what="recent activity" onRetry={() => void activity.refetch()} size="compact" />
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((e) => {
            const Icon = e.icon;
            const body = (
              <>
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="grid min-w-0 flex-1">
                  <span className="truncate type-secondary text-foreground">{e.label}</span>
                  {e.detail ? <span className="truncate type-meta text-muted-foreground">{e.detail}</span> : null}
                </span>
                <span className="shrink-0 type-meta text-muted-foreground" title={e.at}>
                  {formatRelativeTime(e.at, { style: "short" })}
                </span>
              </>
            );
            const cls = "flex min-h-11 items-center gap-2 px-3 py-1.5 hover:bg-accent/50";
            return (
              <li key={e.key}>
                {e.external ? (
                  <OutboundLink href={e.href} className={cls}>
                    {body}
                  </OutboundLink>
                ) : (
                  <Link href={e.href} className={cls}>
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
