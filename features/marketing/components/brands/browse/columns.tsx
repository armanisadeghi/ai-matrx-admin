"use client";

// features/marketing/components/brands/browse/columns.tsx — the /marketing/brands/all column registry.
// Every column the old portfolio table had: Brand, Websites, Socials, Assets, Facts, Review, Status, Updated.

import Link from "next/link";
import { Globe2, Images, Inbox, MapPin, Share2 } from "lucide-react";
import { Badge } from "@ai-matrx/design-system/controls";
import { DATE_SORT_WORDS, Muted, timeCell, type EntityColumnSpec } from "@/lib/entity-list/columns";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { StatusBadge } from "@/features/marketing/components/shared/MarketingUi";
import { SiteIdentityMark } from "@/features/marketing/components/shared/SiteConnectionChips";
import { cn } from "@/lib/utils";
import type { BrandBrowseRow } from "./service";

function CountPill({ icon: Icon, count, label }: { icon: typeof Images; count: number; label: string }) {
  return (
    <span
      title={`${count.toLocaleString()} ${label}`}
      className={cn("inline-flex items-center gap-1 font-mono text-xs tabular-nums", count ? "text-foreground" : "text-disabled-foreground")}
    >
      <Icon className="h-3.5 w-3.5" />
      {count.toLocaleString()}
    </span>
  );
}

export const BRAND_COLUMNS: EntityColumnSpec<BrandBrowseRow>[] = [
  {
    id: "name",
    label: "Brand",
    locked: true,
    column: {
      id: "name",
      accessorKey: "name",
      header: "Brand",
      filter: "text",
      // THE DOOR LAW: the name is a real link (keyboard, new tab).
      href: (row) => marketingRoutes.brand(row.id),
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <SiteIdentityMark site={row} size={30} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
            {row.industry && <p className="truncate text-xs text-muted-foreground">{row.industry}</p>}
          </div>
        </div>
      ),
    },
  },
  {
    id: "websites",
    label: "Websites",
    column: {
      id: "websites",
      accessorKey: "id",
      header: "Websites",
      filter: false,
      sortable: false,
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-1">
          {row.sites.length === 0 ? (
            <span className="text-xs text-disabled-foreground">No website</span>
          ) : (
            row.sites.map((site) => (
              <Link
                key={site.id}
                href={marketingRoutes.site(row.id, site.id)}
                title={`Open ${site.domain}`}
                onClick={(event) => event.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-1.5 py-0.5 text-xs font-medium text-foreground hover:border-primary/50 hover:bg-muted"
              >
                <Globe2 className="h-3 w-3 text-muted-foreground" />
                {site.domain}
              </Link>
            ))
          )}
        </div>
      ),
    },
    phone: "rest",
  },
  {
    id: "social_count",
    label: "Socials",
    sortWords: { asc: "fewest first", desc: "most first" },
    column: {
      id: "social_count",
      accessorKey: "social_count",
      header: "Socials",
      filter: false,
      align: "right",
      cell: (row) => <CountPill icon={Share2} count={row.social_count} label={`social profiles · ${row.social_tracked_count} tracked`} />,
    },
  },
  {
    id: "asset_count",
    label: "Assets",
    sortWords: { asc: "fewest first", desc: "most first" },
    column: {
      id: "asset_count",
      accessorKey: "asset_count",
      header: "Assets",
      filter: false,
      align: "right",
      cell: (row) => <CountPill icon={Images} count={row.asset_count} label="brand assets" />,
    },
  },
  {
    id: "fact_count",
    label: "Facts",
    sortWords: { asc: "fewest first", desc: "most first" },
    column: {
      id: "fact_count",
      accessorKey: "fact_count",
      header: "Facts",
      filter: false,
      align: "right",
      cell: (row) => <CountPill icon={MapPin} count={row.fact_count} label="business facts" />,
    },
  },
  {
    id: "pending_discovered",
    label: "Review",
    sortWords: { asc: "fewest first", desc: "most first" },
    column: {
      id: "pending_discovered",
      accessorKey: "pending_discovered",
      header: "Review",
      filter: false,
      cell: (row) =>
        row.pending_discovered ? (
          <Link
            href={marketingRoutes.brandDiscovery(row.id)}
            aria-label={`${row.pending_discovered.toLocaleString()} to review for ${row.name}`}
            title={`${row.pending_discovered.toLocaleString()} to review`}
            onClick={(event) => event.stopPropagation()}
          >
            <Badge tone="warning" icon={<Inbox className="h-3 w-3" />}>
              {row.pending_discovered.toLocaleString()}
            </Badge>
          </Link>
        ) : (
          <Muted>None</Muted>
        ),
    },
  },
  {
    id: "status",
    label: "Status",
    facet: "status",
    column: {
      id: "status",
      accessorKey: "status",
      header: "Status",
      filter: "select",
      filterOptions: [
        { value: "active", label: "Active" },
        { value: "paused", label: "Paused" },
        { value: "archived", label: "Archived" },
      ],
      cell: (row) => <StatusBadge value={row.status} />,
    },
  },
  {
    id: "industry",
    label: "Industry",
    facet: "industry",
    defaultHidden: true,
    column: { id: "industry", accessorKey: "industry", header: "Industry", filter: "select", cell: (row) => (row.industry ? row.industry : <Muted>None</Muted>) },
  },
  {
    id: "updated_at",
    label: "Updated",
    sortWords: DATE_SORT_WORDS,
    column: {
      id: "updated_at",
      accessorKey: "updated_at",
      header: "Updated",
      filter: "date",
      cell: (row) => timeCell(row.updated_at),
    },
  },
];
