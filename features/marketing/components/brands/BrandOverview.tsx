"use client";

/**
 * The brand home's Overview tab: one bounded card per area, each a SUMMARY that opens its own
 * tab or page (never the full list on the home). Reads only what BrandWorkspace already loaded.
 */
import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, AtSign, Globe2, ImageOff, Images, ListChecks, Plus } from "lucide-react";
import { proxiedExternalImageUrl } from "@/lib/media/external-image";
import type { LucideIcon } from "lucide-react";

import { Button, Chip, EmptyState, PropertyRow } from "@ai-matrx/design-system/controls";
import { Skeleton } from "@ai-matrx/design-system";
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
  canEdit,
  onAdd,
}: {
  facts: BusinessFact[];
  description: string | null;
  industry: string | null;
  websiteUrl: string | null;
  canEdit: boolean;
  /** Opens the fact editor for a missing field. */
  onAdd: () => void;
}) {
  const textOf = (kind: BusinessFactKind) => {
    const fact = firstOfKind(facts, kind);
    return fact ? businessFactValueText(fact.value) : "";
  };
  const fields: ReadonlyArray<{ label: string; value: ReactNode | null; wide?: boolean }> = [
    { label: "Tagline", value: textOf("tagline") || null, wide: true },
    {
      label: "Description",
      wide: true,
      value: description ? (
        <span className="line-clamp-4" title={description}>
          {description}
        </span>
      ) : null,
    },
    { label: "Industry", value: industry || null },
    { label: "Founded", value: textOf("founded") || null },
    { label: "Legal name", value: textOf("legal_name") || null },
    { label: "Website", value: websiteUrl ? contactFactValue({ kind: "website", value: websiteUrl }) : null },
  ];
  const present = fields.filter((field) => field.value);
  const missing = fields.filter((field) => !field.value);
  return (
    <SectionCard title="About" anchor="about">
      <div className="grid gap-3 p-3 sm:grid-cols-2">
        {present.map((field) => (
          <div key={field.label} className={field.wide ? "sm:col-span-2" : undefined}>
            <PropertyRow label={field.label} value={field.value} />
          </div>
        ))}
        {missing.length ? (
          // Missing fields share ONE line, never a "Not provided" tag per row.
          <div className="flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1 sm:col-span-2">
            <span className="type-label">Missing</span>
            <span className="min-w-0 flex-1 type-secondary text-muted-foreground">
              {missing.map((field) => field.label).join(" · ")}
            </span>
            <Button variant="quiet" icon={<Plus />} disabled={!canEdit} onClick={onAdd}>
              Add
            </Button>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

export function BrandOverviewContact({
  facts,
  websiteUrl,
  onOpen,
}: {
  facts: BusinessFact[];
  /** The brand's own website when no website fact was kept. */
  websiteUrl: string | null;
  onOpen: () => void;
}) {
  const rows = CONTACT_KINDS.map(({ kind, label }) => {
    const matches = facts.filter((fact) => fact.kind === kind);
    const first = matches[0];
    const value = first
      ? businessFactValueText(first.value)
      : kind === "website" && websiteUrl
        ? websiteUrl
        : "";
    return { kind, label, value, more: Math.max(0, matches.length - 1) };
  });
  const present = rows.filter((row) => row.value);
  const missing = rows.filter((row) => !row.value);
  return (
    <SectionCard title="Contact" anchor="contact" headerExtra={<OpenLink label="All facts" onClick={onOpen} />}>
      <div className="grid gap-3 p-3">
        {present.map(({ kind, label, value, more }) => (
          <PropertyRow
            key={kind}
            label={label}
            meta={more ? `+${more}` : undefined}
            value={contactFactValue({ kind, value }) ?? value}
          />
        ))}
        {missing.length ? (
          <div className="flex min-h-7 flex-wrap items-center gap-x-2">
            <span className="type-label">Missing</span>
            <span className="min-w-0 flex-1 type-secondary text-muted-foreground">
              {missing.map((row) => row.label).join(" · ")}
            </span>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

export function BrandOverviewWebsites({
  brandId,
  sites,
  publicWebsiteUrl,
  onOpen,
}: {
  brandId: string;
  sites: MarketingSite[];
  /** A viewer who cannot read the managed site still sees the brand's public website. */
  publicWebsiteUrl: string | null;
  onOpen: () => void;
}) {
  return (
    <SectionCard
      title="Websites"
      anchor="overview-websites"
      headerExtra={<OpenLink label={sites.length > PREVIEW_SITES ? `All ${sites.length}` : "Open"} onClick={onOpen} />}
    >
      {sites.length === 0 && publicWebsiteUrl ? (
        <div className="flex min-h-11 items-center px-3">
          {contactFactValue({ kind: "website", value: publicWebsiteUrl })}
        </div>
      ) : sites.length === 0 ? (
        <EmptyState icon={<Globe2 />} title="No websites yet" />
      ) : (
        <ul className="divide-y divide-border">
          {sites.slice(0, PREVIEW_SITES).map((site) => (
            <li key={site.id}>
              <Link
                prefetch={false}
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

/** The host an outside image comes from, for the failed tile. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * One asset tile: shimmer while the picture loads; a source the browser refuses (hotlink / CORP) is retried
 * once through our image proxy; a source that truly fails shows an image glyph and its domain, never a broken image.
 */
function AssetTile({ asset, onOpen }: { asset: OverviewAsset; onOpen: () => void }) {
  const [state, setState] = useState<"direct" | "proxy" | "ready" | "failed">(asset.preview ? "direct" : "ready");
  const [loaded, setLoaded] = useState(false);
  const src = asset.preview ? (state === "proxy" ? proxiedExternalImageUrl(asset.preview) : asset.preview) : null;
  const fail = () => setState((prev) => (prev === "direct" && /^https?:\/\//i.test(asset.preview ?? "") ? "proxy" : "failed"));
  return (
    <button
      type="button"
      onClick={onOpen}
      title={asset.label}
      aria-label={asset.label}
      className="relative aspect-square overflow-hidden rounded-md border border-border bg-background"
    >
      {src && state !== "failed" ? (
        <img
          key={src}
          src={src}
          alt=""
          decoding="async"
          // A picture that failed before hydration never fires onError: read its state on mount.
          ref={(img) => {
            if (img?.complete) {
              if (img.naturalWidth > 0) setLoaded(true);
              else fail();
            }
          }}
          onLoad={() => setLoaded(true)}
          onError={fail}
          className={loaded ? "absolute inset-0 h-full w-full object-contain p-1" : "absolute inset-0 h-full w-full object-contain p-1 opacity-0"}
        />
      ) : null}
      {src && state !== "failed" && !loaded ? <Skeleton motion="shimmer" className="absolute inset-0" /> : null}
      {asset.preview && state === "failed" ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-1 text-muted-foreground">
          <ImageOff className="h-4 w-4" aria-hidden="true" />
          <span className="max-w-full truncate type-meta">{hostOf(asset.preview)}</span>
        </span>
      ) : null}
      {!asset.preview && asset.color ? (
        <span className="absolute inset-1 rounded" style={{ background: asset.color }} />
      ) : null}
    </button>
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
            <AssetTile key={asset.id} asset={asset} onOpen={onOpen} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/** The brand home while it loads: the same frame (header card, tab bar, two-column grid), so nothing moves when it arrives. */
export function BrandHomeSkeleton() {
  return (
    <main className="h-full overflow-y-auto bg-textured p-3 pt-[calc(var(--shell-header-h)+0.5rem)] sm:p-4 sm:pt-[calc(var(--shell-header-h)+0.75rem)]">
      <div className="grid w-full gap-3" aria-busy="true" aria-label="Loading brand">
        <div className="flex h-[196px] items-start gap-3 rounded-lg border border-border bg-card p-4 sm:gap-4">
          <Skeleton className="h-[72px] w-[72px] shrink-0 rounded-lg" />
          <div className="grid min-w-0 flex-1 gap-2">
            <Skeleton className="h-6 w-56 max-w-full" />
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-5 w-64 max-w-full" />
          </div>
        </div>
        <div className="h-[34px] rounded-lg border border-border bg-card" />
        <div className="grid items-start gap-3 lg:grid-cols-3">
          <div className="grid min-w-0 gap-3 lg:col-span-2">
            <div className="h-64 rounded-lg border border-border bg-card" />
            <div className="h-32 rounded-lg border border-border bg-card" />
          </div>
          <div className="grid min-w-0 gap-3">
            <div className="h-48 rounded-lg border border-border bg-card" />
            <div className="h-24 rounded-lg border border-border bg-card" />
          </div>
        </div>
      </div>
    </main>
  );
}
