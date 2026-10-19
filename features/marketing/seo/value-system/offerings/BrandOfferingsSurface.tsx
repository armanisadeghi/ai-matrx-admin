"use client";

/**
 * The live half of `matrx-user/marketing-brand-offerings`: mounts the room's
 * surface over the brand scope it inherits (`BrandIdentitySurface`) and
 * registers the offering-form write handler.
 *
 * The page has two bodies (brand-only editor, site workbench) that each own
 * their own queries and form state. They publish what they hold through
 * `usePublishOfferingsFeed`; the scope is assembled from the latest publish at
 * trigger time, so it is always the page as it is.
 */

import { createContext, useContext, useEffect, useRef, type ReactNode, type RefObject } from "react";
import { SurfaceRuntimeProvider, useSurfaceWriteHandlers } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";

import { useBrandIdentityBaseScope } from "@/features/marketing/components/brand/BrandIdentitySurface";
import { createMarketingBrandOfferingsScope } from "@/features/surfaces/manifests/marketing-brand-offerings.manifest";
import type { TopicPlacementStatus } from "../topics/types";
import type { CatalogOffering, OfferingPrice, OfferingStatRow } from "./data";
import type { OfferingEditDraft } from "./OfferingEditDialog";
import { PRICE_UNITS, formatOfferingPrice, priceProblems } from "./vocabulary";

export const MARKETING_BRAND_OFFERINGS_SURFACE_NAME =
  "matrx-user/marketing-brand-offerings" as const;

/** What the page body holds right now. `site` is set only in the site view. */
export interface OfferingsFeed {
  /** Null while the catalog loads. */
  catalog: CatalogOffering[] | null;
  prices: Record<string, OfferingPrice>;
  site: { id: string; domain: string; name: string | null } | null;
  stats: OfferingStatRow[] | null;
  placement: TopicPlacementStatus | null;
  draft: OfferingEditDraft | null;
  openDraft: (draft: OfferingEditDraft) => void;
}

const FeedContext = createContext<RefObject<OfferingsFeed | null> | null>(null);

/** Called by the page body every render; the scope reads the latest at trigger time. */
export function usePublishOfferingsFeed(feed: OfferingsFeed): void {
  const ref = useContext(FeedContext);
  useEffect(() => {
    if (!ref) return;
    ref.current = feed;
    return () => {
      if (ref.current === feed) ref.current = null;
    };
  });
}

function outlineOf(catalog: CatalogOffering[], prices: Record<string, OfferingPrice>): string {
  const children = new Map<string | null, CatalogOffering[]>();
  const ids = new Set(catalog.map((offering) => offering.id));
  for (const offering of catalog) {
    const key = offering.parentId && ids.has(offering.parentId) ? offering.parentId : null;
    const list = children.get(key) ?? [];
    list.push(offering);
    children.set(key, list);
  }
  const lines: string[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const offering of children.get(parent) ?? []) {
      const price = formatOfferingPrice(prices[offering.id]);
      lines.push(
        `${"  ".repeat(depth)}${offering.name} (${offering.kind})${price ? ` — ${price}` : ""}`,
      );
      walk(offering.id, depth + 1);
    }
  };
  walk(null, 0);
  return lines.join("\n");
}

function buildScope(base: Record<string, unknown> & { brand_id: string }, feed: OfferingsFeed | null) {
  if (!feed || !feed.catalog) return createMarketingBrandOfferingsScope(base);
  const { catalog, prices, site } = feed;
  return createMarketingBrandOfferingsScope({
    ...base,
    offerings_catalog: catalog.map((offering) => {
      const price = prices[offering.id];
      return {
        id: offering.id,
        parent_id: offering.parentId,
        name: offering.name,
        kind: offering.kind,
        description: offering.description,
        sort: offering.sort,
        price:
          price && price.amount !== null
            ? { amount: price.amount, currency: price.currency, unit: price.unit, note: price.note }
            : null,
        from_template: offering.templateName,
        ...(site
          ? {
              offered_here: offering.available,
              offered_reason: offering.availabilityReason,
              other_site_count: offering.otherSiteCount,
              worth_points: offering.worthPoints,
              lead_quality: offering.leadQuality,
              offering_match: offering.offeringMatch,
              worth_notes: offering.worthNotes,
            }
          : {}),
      };
    }),
    offerings_outline: outlineOf(catalog, prices),
    offerings_count: catalog.length,
    ...(site ? { offerings_site: { site_id: site.id, domain: site.domain, name: site.name } } : {}),
    ...(feed.stats
      ? {
          offerings_traffic: feed.stats.map((row) => ({
            offering_id: row.offeringId,
            value_band: row.valueBand,
            keywords: row.keywords,
            clicks: row.clicks,
            impressions: row.impressions,
          })),
        }
      : {}),
    ...(feed.placement
      ? {
          offerings_placement: {
            demand_keywords: feed.placement.demand_keywords,
            demand_keywords_placed: feed.placement.demand_keywords_placed,
            demand_clicks: feed.placement.demand_clicks,
            demand_clicks_placed: feed.placement.demand_clicks_placed,
            proposals_pending: feed.placement.proposals_pending,
            queue_pending: feed.placement.queue_pending,
          },
        }
      : {}),
    ...(feed.draft
      ? {
          offering_edit_draft: {
            offering_id: feed.draft.offeringId,
            name: feed.draft.name,
            kind: feed.draft.kind,
            description: feed.draft.description,
            parent_id: feed.draft.parentId,
            price_amount: feed.draft.priceAmount,
            price_currency: feed.draft.priceCurrency,
            price_unit: feed.draft.priceUnit,
            price_note: feed.draft.priceNote,
          },
        }
      : {}),
  });
}

const PRICE_UNIT_VALUES = new Set<string>(PRICE_UNITS.map((unit) => unit.value));

function text(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`${field} must be a string.`);
  return value;
}

/** Validate an agent's partial form and merge it over the offering it edits. Throws on bad input. */
export function stageOfferingDraft(value: unknown, feed: OfferingsFeed | null): OfferingEditDraft {
  if (!feed?.catalog) throw new Error("The offerings have not loaded yet — try again in a moment.");
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("offering_draft takes an object of form fields.");
  }
  const patch = value as Record<string, unknown>;
  const known = new Set([
    "offering_id", "name", "kind", "description", "parent_id",
    "price_amount", "price_currency", "price_unit", "price_note",
  ]);
  for (const key of Object.keys(patch)) {
    if (!known.has(key)) throw new Error(`offering_draft has no field "${key}".`);
  }

  const targetId = patch.offering_id ?? null;
  if (targetId !== null && typeof targetId !== "string") throw new Error("offering_id must be an offering id or null.");
  const existing = targetId ? feed.catalog.find((offering) => offering.id === targetId) : null;
  if (targetId && !existing) throw new Error("That offering is not in this brand's catalog.");

  const price = existing ? feed.prices[existing.id] : undefined;
  const draft: OfferingEditDraft = {
    offeringId: existing?.id ?? null,
    name: existing?.name ?? "",
    kind: existing?.kind ?? "service",
    description: existing?.description ?? "",
    parentId: existing?.parentId ?? null,
    priceAmount: price?.amount == null ? "" : String(price.amount),
    priceCurrency: price?.currency ?? "USD",
    priceUnit: price?.unit ?? "",
    priceNote: price?.note ?? "",
  };

  if ("name" in patch) {
    const name = text(patch.name, "name").trim();
    if (!name) throw new Error("An offering needs a name.");
    draft.name = name;
  }
  if ("kind" in patch) {
    if (patch.kind !== "product" && patch.kind !== "service") {
      throw new Error('kind must be "product" or "service".');
    }
    draft.kind = patch.kind;
  }
  if ("description" in patch) draft.description = text(patch.description, "description");
  if ("parent_id" in patch) {
    const parent = patch.parent_id;
    if (parent !== null && typeof parent !== "string") throw new Error("parent_id must be an offering id or null.");
    if (parent !== null) {
      if (!feed.catalog.some((offering) => offering.id === parent)) {
        throw new Error("parent_id is not an offering in this brand's catalog.");
      }
      if (parent === draft.offeringId) throw new Error("An offering cannot be its own parent.");
    }
    draft.parentId = parent;
  }
  if ("price_amount" in patch) {
    const amount = patch.price_amount;
    if (typeof amount === "number") draft.priceAmount = String(amount);
    else draft.priceAmount = text(amount, "price_amount").trim();
  }
  if ("price_currency" in patch) draft.priceCurrency = text(patch.price_currency, "price_currency").trim().toUpperCase();
  if ("price_unit" in patch) {
    const unit = text(patch.price_unit, "price_unit");
    if (!PRICE_UNIT_VALUES.has(unit)) {
      throw new Error(`price_unit must be one of: ${[...PRICE_UNIT_VALUES].filter(Boolean).join(", ")}, or "".`);
    }
    draft.priceUnit = unit;
  }
  if ("price_note" in patch) draft.priceNote = text(patch.price_note, "price_note");

  const problems = priceProblems(draft.priceAmount, draft.priceCurrency);
  if (problems.amount) throw new Error("price_amount must be a number of zero or more.");
  if (problems.currency) throw new Error("price_currency must be a 3-letter currency code.");
  if (!existing && !draft.name) throw new Error("A new offering needs a name.");
  return draft;
}

function OfferingsWriteTargets({ feedRef }: { feedRef: RefObject<OfferingsFeed | null> }) {
  useSurfaceWriteHandlers(MARKETING_BRAND_OFFERINGS_SURFACE_NAME, {
    offering_draft: async (value: unknown) => {
      const feed = feedRef.current;
      const draft = stageOfferingDraft(value, feed);
      feed?.openDraft(draft);
    },
  });
  return null;
}

export function BrandOfferingsSurface({ children }: { children: ReactNode }) {
  const getBase = useBrandIdentityBaseScope();
  const feedRef = useRef<OfferingsFeed | null>(null);
  const getScope = (): SurfaceScopePayload =>
    buildScope(getBase() as { brand_id: string } & Record<string, unknown>, feedRef.current);
  return (
    <SurfaceRuntimeProvider surfaceName={MARKETING_BRAND_OFFERINGS_SURFACE_NAME} getScope={getScope}>
      <OfferingsWriteTargets feedRef={feedRef} />
      <FeedContext.Provider value={feedRef}>{children}</FeedContext.Provider>
    </SurfaceRuntimeProvider>
  );
}
