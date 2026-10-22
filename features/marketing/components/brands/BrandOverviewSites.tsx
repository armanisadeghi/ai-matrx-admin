"use client";

/**
 * The brand home's Websites section: one rich row per site from what the crawl and Search Console already
 * stored — homepage picture, pages, issues, clicks (28 days), last crawl, sitemaps, TLS, robots.txt and the
 * pages people land on most. Every number opens its page. Reads reuse the site page's own cached queries
 * (`useSiteHeroScreenshot`, `useBrandSearchClicks`) plus two small reads (`useSiteGlance`, `useSiteTopPages`).
 */
import Link from "next/link";
import { ChevronRight, Globe2, Lock, LockOpen, FileText } from "lucide-react";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { formatCount, formatRelativeTime } from "@ai-matrx/kit/format";
import { Badge, EmptyState } from "@ai-matrx/design-system/controls";
import { ReadFailure, Skeleton } from "@ai-matrx/design-system";
import { InlineMediaRef } from "@ai-matrx/media/react";
import { fileIdToMediaRef } from "@/features/files/redux/converters";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import { SiteIdentityMark } from "@/features/marketing/components/shared/SiteConnectionChips";
import { useSiteGlance, useSiteHeroScreenshot, useSiteTopPages } from "@/features/marketing/data/hooks";
import { useBrandSearchClicks } from "@/features/marketing/components/brands/useBrandOverviewTrends";
import { formatCompact } from "@/features/marketing/social/outlier";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { marketingSeg } from "@/features/marketing/lib/keys";
import { isJsonRecord, type MarketingSite } from "@/features/marketing/types";

const PREVIEW_SITES = 3;

/** TLS and robots.txt as the site probe stored them (`web.site.metadata.site_probe`). */
function probeFacts(site: MarketingSite): { secure: boolean | null; tlsUntil: string | null; robots: boolean | null } {
  const probe = isJsonRecord(site.metadata) && isJsonRecord(site.metadata.site_probe) ? site.metadata.site_probe : null;
  if (!probe) return { secure: null, tlsUntil: null, robots: null };
  const tls = isJsonRecord(probe.tls) ? probe.tls : null;
  const robots = isJsonRecord(probe.robots) ? probe.robots : null;
  return {
    secure: tls ? tls.trusted === true && tls.expired !== true && tls.hostname_match !== false : null,
    tlsUntil: tls && typeof tls.not_after === "string" ? tls.not_after : null,
    robots: robots ? typeof robots.content === "string" && robots.content.trim().length > 0 : null,
  };
}

function Stat({ label, value, href, loading }: { label: string; value: string | null; href: string; loading: boolean }) {
  return (
    <Link
      prefetch={false}
      href={href}
      data-clickable=""
      className="flex min-w-0 flex-col justify-center rounded-md px-2 py-1.5 hover:bg-accent/50"
    >
      <span className="truncate type-label">{label}</span>
      {loading ? (
        <Skeleton motion="shimmer" className="mt-0.5 h-5 w-12" />
      ) : (
        <span className="truncate type-title tabular-nums text-foreground">{value ?? "—"}</span>
      )}
    </Link>
  );
}

function SiteRow({ brandSeg, site }: { brandSeg: string; site: MarketingSite }) {
  const siteSeg = marketingSeg(site);
  const overview = useSiteGlance(site.id);
  // access-errors: ok — decorative homepage picture; a failed read shows the site's mark instead
  const shot = useSiteHeroScreenshot(site.id, site.root_url, site.homepage_screenshot_id);
  // The same Search Console total as the KPI band's Search tile (all clicks, not only the classified part).
  const search = useBrandSearchClicks([site.id]);
  const topPages = useSiteTopPages(site.id, 3);
  const metrics = overview.data;
  const crawledAt = metrics?.lastCrawlAt ?? null;
  const probe = probeFacts(site);
  const siteHref = marketingRoutes.site(brandSeg, siteSeg);
  const fileId = shot.data?.file_id ?? null;

  return (
    <li className="grid gap-3 p-3 sm:grid-cols-[13rem_minmax(0,1fr)]">
      <Link
        prefetch={false}
        href={siteHref}
        aria-label={`Open ${site.name}`}
        // Phone: the stats lead; the homepage picture would take the whole first screen.
        className="relative hidden aspect-[16/10] overflow-hidden rounded-md border border-border bg-muted/40 sm:block"
      >
        {fileId ? (
          <InlineMediaRef
            ref={fileIdToMediaRef(fileId)}
            size="fill"
            fit="cover"
            rounded="none"
            fallback="icon"
            errorFallback="icon"
            alt=""
            className="absolute inset-0 h-full w-full"
          />
        ) : site.og_image_url ? (
          <img src={site.og_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : shot.isLoading ? (
          <Skeleton motion="shimmer" className="absolute inset-0" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <SiteIdentityMark site={site} size={40} />
          </span>
        )}
      </Link>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <SiteIdentityMark site={site} size={20} />
          <Link prefetch={false} href={siteHref} className="min-w-0 truncate type-title text-foreground hover:underline">
            {site.name}
          </Link>
          <OutboundLink href={site.root_url} className="min-w-0 truncate type-meta text-muted-foreground hover:text-foreground">
            {site.domain}
          </OutboundLink>
          {site.status !== "active" ? <Badge tone="warning">{site.status}</Badge> : null}
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {probe.secure !== null ? (
              <Badge
                tone={probe.secure ? "success" : "destructive"}
                title={probe.tlsUntil ? `Certificate valid until ${probe.tlsUntil.slice(0, 10)}` : undefined}
              >
                {probe.secure ? <Lock className="size-3" aria-hidden="true" /> : <LockOpen className="size-3" aria-hidden="true" />}
                {probe.secure ? "Secure" : "Not secure"}
              </Badge>
            ) : null}
            {probe.robots ? <span className="hidden sm:inline-flex"><Badge>robots.txt</Badge></span> : null}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-5">
          <Stat
            label="Pages"
            value={metrics ? formatCompact(metrics.pages) : null}
            href={marketingRoutes.site(brandSeg, siteSeg, "/pages")}
            loading={overview.isLoading}
          />
          <Stat
            label="Issues"
            value={metrics ? formatCount(metrics.openFindings) : null}
            href={marketingRoutes.site(brandSeg, siteSeg, "/findings")}
            loading={overview.isLoading}
          />
          <Stat
            label="Clicks 28d"
            value={search.clicks?.hasData ? formatCompact(search.clicks.total) : null}
            href={marketingRoutes.site(brandSeg, siteSeg, "/performance")}
            loading={search.loading}
          />
          <Stat
            label="Last crawl"
            value={crawledAt ? formatRelativeTime(crawledAt) : metrics ? "Never" : null}
            href={marketingRoutes.site(brandSeg, siteSeg, "/crawls")}
            loading={overview.isLoading}
          />
          <Stat
            label="Sitemaps"
            value={metrics ? metrics.sitemaps.toLocaleString() : null}
            href={marketingRoutes.site(brandSeg, siteSeg, "/sitemaps")}
            loading={overview.isLoading}
          />
        </div>
        {topPages.data?.length ? (
          <ul className="grid gap-0.5">
            {topPages.data.map((page) => (
              <li key={page.pageId}>
                <Link
                  prefetch={false}
                  href={marketingRoutes.sitePage(brandSeg, siteSeg, page.pageId)}
                  data-clickable=""
                  className="group flex h-7 min-w-0 items-center gap-2 rounded-md px-2 hover:bg-accent/50"
                >
                  <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate type-secondary text-foreground">{page.path}</span>
                  <span className="flex shrink-0 items-center gap-1 type-meta tabular-nums text-muted-foreground">
                    {formatCompact(page.clicks)} clicks
                    <ChevronRight className="size-3.5 group-hover:text-foreground" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

export function BrandOverviewSites({
  brandSeg,
  sites,
  loading,
  error,
  onRetry,
  publicWebsiteUrl,
  allHref,
}: {
  /** The brand's address segment (its slug when it has one). */
  brandSeg: string;
  sites: MarketingSite[];
  loading: boolean;
  /** The sites read failed: said so, with Retry — never "No websites yet". */
  error?: unknown;
  onRetry: () => void;
  /** A viewer who cannot read the managed site still sees the brand's public website. */
  publicWebsiteUrl: string | null;
  allHref: string;
}) {
  return (
    <SectionCard
      title="Websites"
      anchor="overview-websites"
      about="Each site we crawl and watch: pages, open issues, Search Console clicks and the pages people land on most. Every number opens its page."
      action={{ label: sites.length > PREVIEW_SITES ? `All ${sites.length}` : "Open", href: allHref }}
    >
      {loading ? (
        <div className="grid gap-3 p-3 sm:grid-cols-[13rem_minmax(0,1fr)]" aria-busy="true">
          <Skeleton className="hidden aspect-[16/10] rounded-md sm:block" />
          <div className="grid content-start gap-2">
            <Skeleton className="h-5 w-56 max-w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ) : error ? (
        <ReadFailure error={error} what="the websites" onRetry={onRetry} size="compact" />
      ) : sites.length === 0 && publicWebsiteUrl ? (
        <div className="flex min-h-11 items-center gap-2 px-3">
          <Globe2 className="size-4 text-muted-foreground" aria-hidden="true" />
          <OutboundLink href={publicWebsiteUrl} className="truncate type-secondary text-foreground hover:underline">
            {publicWebsiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </OutboundLink>
        </div>
      ) : sites.length === 0 ? (
        <EmptyState icon={<Globe2 />} title="No websites yet" />
      ) : (
        <ul className="divide-y divide-border">
          {sites.slice(0, PREVIEW_SITES).map((site) => (
            <SiteRow key={site.id} brandSeg={brandSeg} site={site} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
