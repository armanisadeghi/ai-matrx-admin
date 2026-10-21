"use client";

/**
 * The brand home's Overview tab: one bounded card per area, each a SUMMARY that opens its own
 * tab or page (never the full list on the home). Reads only what BrandWorkspace already loaded.
 */
import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, Globe2, ImageOff, ListChecks, Plus, RefreshCw } from "lucide-react";
import { toast } from "@/lib/toast";
import { rehostBrandAsset } from "@/features/marketing/lib/asset-rehost";
import { marketingKeys } from "@/features/marketing/data/hooks";
import { useOutsideImage } from "@/features/marketing/lib/useOutsideImage";
import { TONE_BACKDROP, type Tone } from "@/features/marketing/components/brands/logo-tones";
import type { LucideIcon } from "lucide-react";

import { Button, Chip, EmptyState, PropertyRow } from "@ai-matrx/design-system/controls";
import { Skeleton } from "@ai-matrx/design-system";
import type { ChipTone } from "@ai-matrx/design-system/controls";

import { contactFactValue } from "@/features/marketing/lib/ContactFactValue";
import { businessFactValueText } from "@/features/marketing/lib/business-fact-value";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import { SiteIdentityMark } from "@/features/marketing/components/shared/SiteConnectionChips";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { marketingSeg } from "@/features/marketing/lib/keys";
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

export interface OverviewFactGroup {
  kind: BusinessFactKind;
  count: number;
  icon: LucideIcon;
  tone: ChipTone;
}

export interface OverviewAsset {
  id: string;
  preview: string | null;
  /** The asset kind (logo, favicon…), for ranking which mark leads. */
  kind?: string;
  /** A saved copy's file id: two rows over one stored file are one picture. */
  fileId?: string | null;
  /** A provider link (Facebook / Instagram CDN) past its expiry: the tile says so and offers Refresh. */
  expired?: boolean;
  /** The asset's organization, for Refresh. */
  organizationId?: string;
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
  industry,
  websiteUrl,
  canEdit,
  onAdd,
}: {
  facts: BusinessFact[];
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
    // One row per distinct value (the same fact kept from two sources counts once, as on the Facts tab).
    const matches = [...new Map(facts.filter((fact) => fact.kind === kind).map((fact) => [businessFactValueText(fact.value).trim().toLowerCase().replace(/\s+/g, " "), fact])).values()];
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
  /** The brand's address segment (its slug when it has one): doors read as names, never ids. */
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
                href={marketingRoutes.site(brandId, marketingSeg(site))}
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

/**
 * One asset tile: shimmer while the picture loads; outside pictures fall back through useOutsideImage; a source
 * that truly fails shows an image glyph and its site's domain, never a broken image.
 */
/** A logo whose provider link expired: says so, with Refresh (files the picture in our file service when it still loads). */
function ExpiredAssetTile({ asset }: { asset: OverviewAsset }) {
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const refresh = async () => {
    if (!asset.organizationId) return;
    setBusy(true);
    const result = await rehostBrandAsset(asset.id, asset.organizationId);
    setBusy(false);
    void queryClient.invalidateQueries({ queryKey: marketingKeys.root });
    if (result.status === "expired") toast.error("The link has expired. Run Enrich to fetch a fresh picture.");
    else if (result.status === "failed") toast.error(result.reason ?? "The picture could not be saved.");
  };
  return (
    <div
      title={asset.label}
      className="flex aspect-square flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md border border-dashed border-border p-1 text-muted-foreground"
    >
      <ImageOff className="h-4 w-4" aria-hidden="true" />
      <span className="max-w-full truncate type-meta">Image expired</span>
      {asset.organizationId ? (
        <Button
          variant="quiet"
          aria-label="Refresh image"
          title="Refresh"
          disabled={busy}
          icon={<RefreshCw className={busy ? "animate-spin" : undefined} />}
          onClick={() => void refresh()}
        />
      ) : null}
    </div>
  );
}

export function AssetTile({ asset, onOpen, tone }: { asset: OverviewAsset; onOpen: () => void; tone?: Tone }) {
  if (asset.expired) return <ExpiredAssetTile asset={asset} />;
  return <LiveAssetTile asset={asset} onOpen={onOpen} tone={tone} />;
}

function LiveAssetTile({ asset, onOpen, tone }: { asset: OverviewAsset; onOpen: () => void; tone?: Tone }) {
  const image = useOutsideImage(asset.preview);
  return (
    <button
      type="button"
      onClick={onOpen}
      title={asset.label}
      aria-label={asset.label}
      className={`relative aspect-square overflow-hidden rounded-md border border-border${tone ? ` ${TONE_BACKDROP[tone]}` : ""}`}
      /* ui-exception: a logo of unknown tone sits on a neutral checkerboard, so a white mark and a dark outline both show in either theme */
      style={tone ? undefined : { background: "repeating-conic-gradient(rgb(128 128 128 / 0.18) 0 25%, rgb(128 128 128 / 0.06) 0 50%) 0 0 / 12px 12px" }}
    >
      {image.src ? (
        // Natural size, scaled down only: a 32 px favicon stays crisp at 32 px, never blown up and blurred.
        <img
          key={image.imgKey}
          {...image.imgProps}
          alt=""
          decoding="async"
          className={`absolute inset-0 m-auto h-auto max-h-[calc(100%-0.5rem)] w-auto max-w-[calc(100%-0.5rem)] object-contain${image.loaded ? "" : " opacity-0"}`}
        />
      ) : null}
      {image.src && !image.loaded ? <Skeleton motion="shimmer" className="absolute inset-0" /> : null}
      {image.failed ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-1 text-muted-foreground">
          <ImageOff className="h-4 w-4" aria-hidden="true" />
          <span className="max-w-full truncate type-meta">{image.host}</span>
        </span>
      ) : null}
      {!asset.preview && asset.color ? (
        <span className="absolute inset-1 rounded" style={{ background: asset.color }} />
      ) : null}
    </button>
  );
}

/** The brand hero's one height at every width — the hero and its loading placeholder share it, so nothing moves. */
export const BRAND_HERO_FRAME = "h-[156px]";

/** The brand home while it loads: the same frame (hero, tab bar, KPI band, two columns), so nothing moves when it arrives. */
export function BrandHomeSkeleton() {
  return (
    <main className="h-full overflow-y-auto bg-textured p-3 pt-[calc(var(--shell-header-h)+0.5rem)] sm:p-4 sm:pt-[calc(var(--shell-header-h)+0.75rem)]">
      <div className="grid w-full gap-3" aria-busy="true" aria-label="Loading brand">
        <div className={`${BRAND_HERO_FRAME} flex items-start gap-3 rounded-lg border border-border bg-card p-4 sm:gap-4`}>
          <Skeleton className="size-12 shrink-0 rounded-lg sm:size-[72px]" />
          <div className="grid min-w-0 flex-1 gap-2">
            <Skeleton className="h-6 w-56 max-w-full" />
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-5 w-64 max-w-full" />
          </div>
        </div>
        <div className="h-[33px] rounded-lg border border-border bg-card" />
        <div className="h-11 rounded-lg border border-border bg-card" />
        {/* The Overview's KPI band (KpiGrid: 2 / 3 / 6 across), each tile its loaded height. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-[76px] rounded-md border border-border bg-card" />
          ))}
        </div>
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
