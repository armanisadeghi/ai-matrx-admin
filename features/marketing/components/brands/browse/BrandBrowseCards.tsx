"use client";

// features/marketing/components/brands/browse/BrandBrowseCards.tsx — the cards view of /marketing/brands/all
// (the old portfolio's card, now with the list's one row menu instead of its own Edit/Archive buttons).

import Link from "next/link";
import { Globe2, Images, Inbox, MapPin, MoreVertical, Share2 } from "lucide-react";
import { ItemMenu } from "@ai-matrx/design-system/item";
import { Badge } from "@ai-matrx/design-system/controls";
import { Card } from "@/components/ui/card";
import { formatCompactDate, StatusBadge } from "@/features/marketing/components/shared/MarketingUi";
import { SiteIdentityMark } from "@/features/marketing/components/shared/SiteConnectionChips";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import type { EntityAltViewProps } from "@/lib/entity-list/config";
import type { BrandBrowseRow } from "./service";

function CardDimension({ icon: Icon, value, label }: { icon: typeof Images; value: number; label: string }) {
  return (
    <div className="flex min-w-0 items-center justify-center gap-1 px-1 text-xs text-muted-foreground">
      <Icon className="h-3 w-3 shrink-0" />
      <span className="font-semibold tabular-nums text-foreground">{value.toLocaleString()}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

export function BrandBrowseCards({ rows, actions }: EntityAltViewProps<BrandBrowseRow>) {
  return (
    <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <Card
          key={row.id}
          data-row-id={row.id}
          className="group relative overflow-hidden border-border bg-card transition-colors hover:border-primary/45 hover:bg-accent/25"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-primary/65" />
          <div className="space-y-4 p-4 pt-5">
            <div className="flex items-start gap-3">
              <SiteIdentityMark site={row} size={38} />
              <div className="min-w-0 flex-1">
                <Link href={marketingRoutes.brand(row.id)} className="block truncate text-sm font-semibold text-foreground hover:underline">
                  {row.name}
                </Link>
                {row.industry && <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.industry}</p>}
              </div>
              <StatusBadge value={row.status} />
            </div>

            <div className="flex min-h-9 flex-wrap gap-1.5">
              {row.sites.length ? (
                row.sites.map((site) => (
                  <Link
                    key={site.id}
                    href={marketingRoutes.site(row.id, site.id)}
                    className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-xs font-medium text-foreground hover:border-primary/50 hover:bg-muted"
                  >
                    <Globe2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{site.domain}</span>
                  </Link>
                ))
              ) : (
                // read-gate-exempt: a field of one loaded brand row (it has no sites), not the answer of a read
                <span className="text-xs text-muted-foreground">No website connected</span>
              )}
            </div>

            <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-muted/25 py-2">
              <CardDimension icon={Share2} value={row.social_count} label="socials" />
              <CardDimension icon={Images} value={row.asset_count} label="assets" />
              <CardDimension icon={MapPin} value={row.fact_count} label="facts" />
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-3">
              <span className="text-xs text-muted-foreground">Updated {formatCompactDate(row.updated_at)}</span>
              <div className="flex items-center gap-1">
                {row.pending_discovered ? (
                  <Link
                    href={marketingRoutes.brandDiscovery(row.id)}
                    aria-label={`${row.pending_discovered.toLocaleString()} to review for ${row.name}`}
                    title={`${row.pending_discovered.toLocaleString()} to review`}
                  >
                    <Badge tone="warning" icon={<Inbox className="h-3 w-3" />}>
                      {row.pending_discovered.toLocaleString()}
                    </Badge>
                  </Link>
                ) : null}
                <ItemMenu config={actions.menuFor(row)} align="end">
                  <button
                    type="button"
                    aria-label={`Actions for ${row.name}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </ItemMenu>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
