"use client";

/**
 * The Marketing home (`/marketing`). Arman, 2026-10-21: "Each page should
 * show the things that it includes … the marketing page should provide some
 * of the most important kpis, a glimse of brands and then access to all of the
 * things that are part of marketing, especially the big things that tend to
 * get lost."
 *
 * So the full card/table portfolio lives on `/marketing/brands`, and this page
 * is three bands: headline numbers across every brand, the most recently
 * updated brands, and a map of everything in Marketing — what lives inside a
 * brand (opened for the brand picked here) and what spans all brands. Both
 * halves of the map are DERIVED from the same declarations the sidebar reads
 * (`lib/brand-sections.ts`, `lib/marketing-nav.ts`), so a page can never be on
 * the menu and missing here.
 */

import { useState } from "react";
import { ArrowRight, Globe2, Inbox, Plus, Share2 } from "lucide-react";

import Link from "@/components/navigation/AppLink";
import { KpiTile } from "@/components/official/kpi/KpiTile";
import { readOf } from "@ai-matrx/design-system";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@ai-matrx/design-system/controls";
import { IconResolver } from "@ai-matrx/icons";
import type { MatrxDataTableQueryState } from "@ai-matrx/design-system/data-table/types";
import { useBrands } from "@/features/marketing/data/hooks";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { listMarketingBrandModeGroups } from "@/features/marketing/lib/brand-sections";
import type { MarketingNavPillar } from "@/features/marketing/lib/marketing-nav";
import { SiteIdentityMark } from "@/features/marketing/components/shared/SiteConnectionChips";
import { QueryError } from "@/features/marketing/components/shared/MarketingUi";
import type { BrandListRow } from "@/features/marketing/types";
import {
  useMarketingHomeBrandCount,
  useMarketingHomePendingReview,
  useMarketingHomeSiteCount,
  useMarketingHomeSocial,
} from "@/features/marketing/home/home-totals";

const GLIMPSE_SIZE = 6;

const GLIMPSE_STATE: MatrxDataTableQueryState = {
  page: 1,
  pageSize: GLIMPSE_SIZE,
  search: "",
  anyOf: "",
  columnFilters: {},
  sort: { id: "updated_at", direction: "desc" },
};

function SectionTitle({ children, action }: { children: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-2">
      <h2 className="type-title text-foreground">{children}</h2>
      {action}
    </div>
  );
}

function Totals() {
  const brands = useMarketingHomeBrandCount();
  const sites = useMarketingHomeSiteCount();
  const social = useMarketingHomeSocial();
  const review = useMarketingHomePendingReview();
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <KpiTile
        label="Brands"
        value={brands.data?.toLocaleString() ?? null}
        read={readOf(brands)}
        href={marketingRoutes.brands()}
        title="Every brand you can open, not counting archived ones."
      />
      <KpiTile
        label="Websites"
        value={sites.data?.toLocaleString() ?? null}
        read={readOf(sites)}
        title="Every website across all your brands."
      />
      <KpiTile
        label="Social accounts"
        value={social.data?.accounts.toLocaleString() ?? null}
        hint={social.data ? `${social.data.tracked.toLocaleString()} tracked` : undefined}
        read={readOf(social)}
        title="Social accounts on your brands; tracked ones are refreshed on a schedule."
      />
      <KpiTile
        label="To review"
        value={review.data?.toLocaleString() ?? null}
        tone={review.data ? "warn" : "neutral"}
        hint={review.data ? "In each brand's inbox" : undefined}
        read={readOf(review)}
        title="Things found for your brands that wait for a yes or no."
      />
    </div>
  );
}

function BrandGlimpseCard({ row }: { row: BrandListRow }) {
  return (
    <Card className="flex min-w-0 flex-col gap-2 p-3">
      <div className="flex min-w-0 items-center gap-2">
        <SiteIdentityMark site={row} size={28} />
        <Link
          href={marketingRoutes.brand(row.id)}
          className="type-title min-w-0 flex-1 truncate text-foreground hover:underline"
        >
          {row.name}
        </Link>
        {row.pending_discovered ? (
          <Link
            href={marketingRoutes.brandDiscovery(row.id)}
            aria-label={`${row.pending_discovered.toLocaleString()} to review for ${row.name}`}
          >
            <Badge variant="warning" className="gap-1">
              <Inbox className="h-3 w-3" />
              {row.pending_discovered.toLocaleString()}
            </Badge>
          </Link>
        ) : null}
      </div>
      <div className="flex items-center gap-3 type-meta text-muted-foreground">
        <Link
          href={`${marketingRoutes.brand(row.id)}/websites`}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <Globe2 className="h-3 w-3" />
          {row.sites.length.toLocaleString()} {row.sites.length === 1 ? "website" : "websites"}
        </Link>
        <Link
          href={`${marketingRoutes.brand(row.id)}/socials/accounts`}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <Share2 className="h-3 w-3" />
          {row.social_count.toLocaleString()} social
        </Link>
      </div>
    </Card>
  );
}

function MapGroup({
  label,
  links,
}: {
  label: string;
  links: readonly { href: string; label: string; iconName: string; soon?: boolean }[];
}) {
  if (links.length === 0) return null;
  return (
    <div className="min-w-0">
      <div className="type-label pb-1">{label}</div>
      <ul className="flex flex-col">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex min-h-7 items-center gap-2 rounded-md px-1.5 type-body text-foreground hover:bg-accent"
            >
              <IconResolver
                iconName={link.iconName}
                size={14}
                className="shrink-0 text-muted-foreground"
              />
              <span className="truncate">{link.label}</span>
              {link.soon ? (
                <span className="type-meta text-muted-foreground">Soon</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketingHome({
  pillars,
}: {
  pillars: readonly MarketingNavPillar[];
}) {
  const glimpse = useBrands(GLIMPSE_STATE);
  const rows = glimpse.data?.rows ?? [];
  const [pickedBrandId, setPickedBrandId] = useState<string | null>(null);
  const brandId = pickedBrandId ?? rows[0]?.id ?? null;
  const brandGroups = brandId
    ? listMarketingBrandModeGroups(marketingRoutes.brand(brandId))
    : [];
  // The roster pillar is the Brands band above; the map lists everything else.
  const agencyPillars = pillars.filter(
    (pillar) => !pillar.entries.some((entry) => entry.href === marketingRoutes.brands()),
  );

  return (
    <div className="h-full overflow-y-auto bg-textured">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-3 pb-6 pt-[calc(var(--shell-header-h)+0.75rem)] sm:px-4">
        <Totals />

        <section className="flex flex-col gap-2">
          <SectionTitle
            action={
              <div className="flex items-center gap-3">
                <Link
                  href={marketingRoutes.smartAddBrand()}
                  className="inline-flex items-center gap-1 type-secondary text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add brand
                </Link>
                <Link
                  href={marketingRoutes.brands()}
                  className="inline-flex items-center gap-1 type-secondary text-muted-foreground hover:text-foreground"
                >
                  All brands
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            }
          >
            Recently updated brands
          </SectionTitle>
          {glimpse.isError ? (
            <QueryError error={glimpse.error} onRetry={() => void glimpse.refetch()} />
          ) : glimpse.isLoading ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: GLIMPSE_SIZE }, (_, i) => (
                <div key={i} className="h-[72px] animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <Card className="p-4 type-secondary text-muted-foreground">
              No brands yet.{" "}
              <Link href={marketingRoutes.smartAddBrand()} className="text-foreground underline">
                Add your first brand
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((row) => (
                <BrandGlimpseCard key={row.id} row={row} />
              ))}
            </div>
          )}
        </section>

        {brandId ? (
          <section className="flex flex-col gap-2">
            <SectionTitle
              action={
                <Select
                  aria-label="Brand to open"
                  value={brandId}
                  options={rows.map((row) => ({ value: row.id, label: row.name }))}
                  onValueChange={(value) => setPickedBrandId(value)}
                />
              }
            >
              Inside a brand
            </SectionTitle>
            <Card className="grid grid-cols-2 gap-x-4 gap-y-3 p-3 md:grid-cols-3 xl:grid-cols-4">
              {brandGroups.map((group) => (
                <MapGroup
                  key={group.label}
                  label={group.label === "Start" ? "Brand" : group.label}
                  links={group.modes.map((mode) => ({
                    href: mode.href,
                    label: mode.slug === "" ? "Overview" : mode.name,
                    iconName: mode.iconName,
                    soon: "status" in mode && mode.status === "coming-soon",
                  }))}
                />
              ))}
            </Card>
          </section>
        ) : null}

        <section className="flex flex-col gap-2">
          <SectionTitle>Across all brands</SectionTitle>
          <Card className="grid grid-cols-2 gap-x-4 gap-y-3 p-3 md:grid-cols-3 xl:grid-cols-4">
            {agencyPillars.map((pillar) => (
              <MapGroup
                key={pillar.key}
                label={pillar.label}
                links={pillar.entries
                  .filter((entry) => entry.status !== "coming-soon")
                  .map((entry) => ({
                    href: entry.href,
                    label: entry.label,
                    iconName: entry.iconName,
                  }))}
              />
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}
