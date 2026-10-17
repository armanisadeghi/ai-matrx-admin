"use client";

/**
 * The brand home's Overview tab: one bounded card per area, each a SUMMARY that opens its own
 * tab or page (never the full list on the home). Reads only what BrandWorkspace already loaded.
 */
import Link from "next/link";
import { ArrowRight, AtSign, Globe2, Images, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Chip, EmptyState, PropertyRow } from "@ai-matrx/design-system/controls";
import type { ChipTone } from "@ai-matrx/design-system/controls";

import { contactFactValue } from "@/features/marketing/lib/ContactFactValue";
import { businessFactValueText } from "@/features/marketing/lib/business-fact-value";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import { SiteIdentityMark } from "@/features/marketing/components/shared/SiteConnectionChips";
import { PropertyKindMark } from "@/features/marketing/components/shared/PropertyKindMark";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { BUSINESS_FACT_KIND_LABELS } from "@/features/marketing/types";
import type { BrandProperty, BusinessFact, BusinessFactKind, MarketingSite } from "@/features/marketing/types";

/** Contact kinds the Overview's Contact card shows, one row each, in this order. */
const CONTACT_KINDS: ReadonlyArray<{ kind: BusinessFactKind; label: string }> = [
  { kind: "phone", label: "Phone" },
  { kind: "email", label: "Email" },
  { kind: "address", label: "Address" },
  { kind: "website", label: "Website" },
];

const PREVIEW_SITES = 4;
const PREVIEW_MARKS = 14;
const PREVIEW_ASSETS = 8;

export interface OverviewFactGroup {
  kind: BusinessFactKind;
  count: number;
  icon: LucideIcon;
  tone: ChipTone;
}

export interface OverviewAsset {
  id: string;
  preview: string | null;
  color: string | null;
  label: string;
}

/** A card-header link to the area's own tab or page. */
function OpenLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="matrx-tap-area inline-flex shrink-0 items-center gap-1 whitespace-nowrap type-secondary font-medium text-primary"
    >
      {label}
      <ArrowRight className="h-3 w-3" />
    </button>
  );
}

function firstOfKind(facts: BusinessFact[], kind: BusinessFactKind): BusinessFact | undefined {
  return facts.find((fact) => fact.kind === kind);
}

export function BrandOverviewAbout({
  facts,
  description,
  industry,
  websiteUrl,
}: {
  facts: BusinessFact[];
  description: string | null;
  industry: string | null;
  websiteUrl: string | null;
}) {
  const tagline = firstOfKind(facts, "tagline");
  const founded = firstOfKind(facts, "founded");
  const legal = firstOfKind(facts, "legal_name");
  return (
    <SectionCard title="About" anchor="about">
      <div className="grid gap-3 p-3">
        <PropertyRow label="Tagline" value={tagline ? businessFactValueText(tagline.value) : null} missing />
        <PropertyRow label="Description" missing>
          {description ? (
            <span className="line-clamp-4" title={description}>
              {description}
            </span>
          ) : null}
        </PropertyRow>
        <div className="grid gap-3 sm:grid-cols-2">
          <PropertyRow label="Industry" value={industry} missing />
          <PropertyRow label="Founded" value={founded ? businessFactValueText(founded.value) : null} missing />
          <PropertyRow label="Legal name" value={legal ? businessFactValueText(legal.value) : null} missing />
          <PropertyRow label="Website" missing>
            {websiteUrl ? contactFactValue({ kind: "website", value: websiteUrl }) : null}
          </PropertyRow>
        </div>
      </div>
    </SectionCard>
  );
}

export function BrandOverviewContact({ facts, onOpen }: { facts: BusinessFact[]; onOpen: () => void }) {
  return (
    <SectionCard title="Contact" anchor="contact" headerExtra={<OpenLink label="All facts" onClick={onOpen} />}>
      <div className="grid gap-3 p-3">
        {CONTACT_KINDS.map(({ kind, label }) => {
          const matches = facts.filter((fact) => fact.kind === kind);
          const first = matches[0];
          const value = first ? businessFactValueText(first.value) : "";
          return (
            <PropertyRow
              key={kind}
              label={label}
              missing
              meta={matches.length > 1 ? `+${matches.length - 1}` : undefined}
            >
              {value ? contactFactValue({ kind, value }) ?? value : null}
            </PropertyRow>
          );
        })}
      </div>
    </SectionCard>
  );
}

export function BrandOverviewWebsites({
  brandId,
  sites,
  onOpen,
}: {
  brandId: string;
  sites: MarketingSite[];
  onOpen: () => void;
}) {
  return (
    <SectionCard
      title="Websites"
      anchor="overview-websites"
      headerExtra={<OpenLink label={sites.length > PREVIEW_SITES ? `All ${sites.length}` : "Open"} onClick={onOpen} />}
    >
      {sites.length === 0 ? (
        <EmptyState icon={<Globe2 />} title="No websites yet" />
      ) : (
        <ul className="divide-y divide-border">
          {sites.slice(0, PREVIEW_SITES).map((site) => (
            <li key={site.id}>
              <Link
                href={marketingRoutes.site(brandId, site.id)}
                className="flex min-h-11 items-center gap-3 px-3 py-1.5 hover:bg-accent/40"
              >
                <SiteIdentityMark site={site} size={24} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate type-title text-foreground">{site.name}</span>
                  <span className="block truncate type-meta text-muted-foreground">{site.domain}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function BrandOverviewSocial({
  properties,
  onOpen,
}: {
  properties: BrandProperty[];
  onOpen: () => void;
}) {
  const platforms = new Map<string, number>();
  for (const property of properties) platforms.set(property.kind, (platforms.get(property.kind) ?? 0) + 1);
  return (
    <SectionCard
      title="Social profiles"
      anchor="overview-social"
      headerExtra={<OpenLink label={properties.length ? `All ${properties.length}` : "Open"} onClick={onOpen} />}
    >
      {properties.length === 0 ? (
        <EmptyState icon={<AtSign />} title="No social profiles yet" />
      ) : (
        <div className="flex flex-wrap items-center gap-2 p-3">
          {[...platforms.entries()].slice(0, PREVIEW_MARKS).map(([kind, count]) => (
            <button
              key={kind}
              type="button"
              onClick={onOpen}
              className="matrx-tap-area inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-accent/40"
              aria-label={`${kind}: ${count}`}
              title={`${kind}: ${count}`}
            >
              <PropertyKindMark kind={kind} size={24} />
              {count > 1 ? <span className="type-meta tabular-nums text-muted-foreground">{count}</span> : null}
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export function BrandOverviewFacts({
  groups,
  total,
  title,
  onOpen,
}: {
  groups: OverviewFactGroup[];
  total: number;
  title: string;
  onOpen: () => void;
}) {
  return (
    <SectionCard
      title={title}
      anchor="overview-facts"
      headerExtra={<OpenLink label={total ? `All ${total}` : "Open"} onClick={onOpen} />}
    >
      {groups.length === 0 ? (
        <EmptyState icon={<ListChecks />} title="No facts yet" />
      ) : (
        <div className="flex flex-wrap gap-1 p-3">
          {groups.map(({ kind, count, icon: Icon, tone }) => (
            <Chip
              key={kind}
              asChild
              tone={tone}
              icon={<Icon />}
              label={`${BUSINESS_FACT_KIND_LABELS[kind]} ${count}`}
            >
              <button type="button" onClick={onOpen} />
            </Chip>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export function BrandOverviewAssets({
  assets,
  total,
  onOpen,
}: {
  assets: OverviewAsset[];
  total: number;
  onOpen: () => void;
}) {
  const shown = assets.filter((asset) => asset.preview || asset.color).slice(0, PREVIEW_ASSETS);
  return (
    <SectionCard
      title="Brand assets"
      anchor="overview-assets"
      headerExtra={<OpenLink label={total ? `All ${total}` : "Open"} onClick={onOpen} />}
    >
      {shown.length === 0 ? (
        <EmptyState icon={<Images />} title="No assets yet" />
      ) : (
        <div className="grid grid-cols-4 gap-2 p-3 sm:grid-cols-8 lg:grid-cols-4">
          {shown.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={onOpen}
              title={asset.label}
              aria-label={asset.label}
              className="relative aspect-square overflow-hidden rounded-md border border-border bg-background"
            >
              {asset.preview ? (
                <img
                  src={asset.preview}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-contain p-1"
                />
              ) : (
                <span className="absolute inset-1 rounded" style={{ background: asset.color ?? undefined }} />
              )}
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
