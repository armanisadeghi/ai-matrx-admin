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
import { asProductPrice } from "@/components/cost/ProductPrice";
import type { CatalogOffering, OfferingPrice, OfferingStatRow } from "./data";
import type { OfferingEditDraft } from "./OfferingEditDialog";
import type { OfferingWorthValues } from "./OfferingWorthDialog";
import {
  LEAD_QUALITY_OPTIONS,
  OFFERING_MATCH_OPTIONS,
  PRICE_UNITS,
  formatOfferingPrice,
  priceProblems,
} from "./vocabulary";

export const MARKETING_BRAND_OFFERINGS_SURFACE_NAME =
  "matrx-user/marketing-brand-offerings" as const;

/**
 * What the site view can do that the brand-only editor cannot. Each one runs the
 * page's own mutation (offer, move: they save on click) or opens the page's own
 * dialog (stop offering, worth: the person confirms there).
 */
export interface OfferingsSiteActions {
  /** True while one of the page's mutations is running (the table refuses a move then). */
  busy: boolean;
  offer: (ids: string[]) => Promise<void>;
  openStop: (offerings: { id: string; name: string }[]) => void;
  openWorth: (offeringId: string, values: Partial<OfferingWorthValues>) => void;
  move: (offeringId: string, parentId: string | null, siblingOrder: string[]) => Promise<void>;
}

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
  /** Set only in the site view. */
  siteActions: OfferingsSiteActions | null;
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
      const price = asProductPrice(formatOfferingPrice(prices[offering.id]));
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

function siteView(feed: OfferingsFeed | null): { catalog: CatalogOffering[]; actions: OfferingsSiteActions } {
  if (!feed?.catalog) throw new Error("The offerings have not loaded yet — try again in a moment.");
  if (!feed.siteActions) {
    throw new Error("This brand has no website yet, so there is no site view to change (availability, worth and moves are per website).");
  }
  return { catalog: feed.catalog, actions: feed.siteActions };
}

function onlyKeys(value: unknown, target: string, allowed: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${target} takes an object.`);
  }
  const patch = value as Record<string, unknown>;
  for (const key of Object.keys(patch)) {
    if (!allowed.includes(key)) throw new Error(`${target} has no field "${key}".`);
  }
  return patch;
}

function offeringIn(catalog: CatalogOffering[], id: unknown, field: string): CatalogOffering {
  if (typeof id !== "string") throw new Error(`${field} must be an offering id from offerings_catalog.`);
  const found = catalog.find((offering) => offering.id === id);
  if (!found) throw new Error(`${field} is not an offering in this brand's catalog.`);
  return found;
}

function idList(value: unknown, field: string, catalog: CatalogOffering[]): CatalogOffering[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${field} must be a non-empty list of offering ids.`);
  const seen = new Set<string>();
  return value.map((id) => {
    const offering = offeringIn(catalog, id, field);
    if (seen.has(offering.id)) throw new Error(`${field} lists "${offering.name}" twice.`);
    seen.add(offering.id);
    return offering;
  });
}

/** Offerings to start offering here. Throws when every one is already offered. */
export function checkOfferHere(value: unknown, feed: OfferingsFeed | null) {
  const { catalog, actions } = siteView(feed);
  const patch = onlyKeys(value, "offering_offer_here", ["offering_ids"]);
  const chosen = idList(patch.offering_ids, "offering_ids", catalog);
  const toOffer = chosen.filter((offering) => !offering.available);
  if (toOffer.length === 0) throw new Error("This site already offers every one of those offerings.");
  return { actions, ids: toOffer.map((offering) => offering.id) };
}

/** Offerings to stop offering here (opens the page's confirm dialog). */
export function checkStopHere(value: unknown, feed: OfferingsFeed | null) {
  const { catalog, actions } = siteView(feed);
  const patch = onlyKeys(value, "offering_stop_draft", ["offering_ids"]);
  const chosen = idList(patch.offering_ids, "offering_ids", catalog);
  const toStop = chosen.filter((offering) => offering.available);
  if (toStop.length === 0) throw new Error("None of those offerings is offered on this site.");
  return { actions, offerings: toStop.map((offering) => ({ id: offering.id, name: offering.name })) };
}

const LEAD_VALUES: readonly string[] = LEAD_QUALITY_OPTIONS.map((option) => option.value);
const MATCH_VALUES: readonly string[] = OFFERING_MATCH_OPTIONS.map((option) => option.value);

/** A worth ruling to stage into the page's worth dialog. */
export function checkWorthDraft(value: unknown, feed: OfferingsFeed | null) {
  const { catalog, actions } = siteView(feed);
  const patch = onlyKeys(value, "offering_worth_draft", [
    "offering_id", "worth_points", "lead_quality", "offering_match", "notes",
  ]);
  const offering = offeringIn(catalog, patch.offering_id, "offering_id");
  if (!offering.available) {
    throw new Error(`Offer "${offering.name}" on this site first — a site values only what it offers.`);
  }
  const points = patch.worth_points;
  if (typeof points !== "number" || !Number.isFinite(points)) {
    throw new Error("worth_points must be a number (negative counts it down).");
  }
  const values: Partial<OfferingWorthValues> = { worthPoints: points };
  if ("lead_quality" in patch) {
    const lead = patch.lead_quality;
    if (lead !== null && (typeof lead !== "string" || !LEAD_VALUES.includes(lead))) {
      throw new Error(`lead_quality must be null or one of: ${LEAD_VALUES.join(", ")}.`);
    }
    values.leadQuality = lead;
  }
  if ("offering_match" in patch) {
    const match = patch.offering_match;
    if (match !== null && (typeof match !== "string" || !MATCH_VALUES.includes(match))) {
      throw new Error(`offering_match must be null or one of: ${MATCH_VALUES.join(", ")}.`);
    }
    values.offeringMatch = match;
  }
  if ("notes" in patch) values.notes = text(patch.notes, "notes");
  return { actions, offeringId: offering.id, values };
}

/** Re-parent / reorder one offering. Mirrors the table's drag-and-drop rules. */
export function checkMove(value: unknown, feed: OfferingsFeed | null) {
  const { catalog, actions } = siteView(feed);
  const patch = onlyKeys(value, "offering_move", ["offering_id", "parent_id", "position"]);
  const moved = offeringIn(catalog, patch.offering_id, "offering_id");
  if (!("parent_id" in patch)) throw new Error("parent_id is required (an offering id, or null for the top level).");
  const parentId = patch.parent_id;
  if (parentId !== null) {
    const parent = offeringIn(catalog, parentId, "parent_id");
    // A branch cannot move under itself: walk the target's ancestry looking for the moved offering.
    const byId = new Map(catalog.map((offering) => [offering.id, offering]));
    for (let cursor: CatalogOffering | undefined = parent; cursor; cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined) {
      if (cursor.id === moved.id) throw new Error("An offering cannot move under itself or one of its own children.");
    }
  }
  if (actions.busy) throw new Error("The page is saving another change — try again in a moment.");
  const siblings = catalog
    .filter((offering) => offering.id !== moved.id && (offering.parentId ?? null) === (parentId as string | null))
    .sort((left, right) => left.sort - right.sort || left.name.localeCompare(right.name))
    .map((offering) => offering.id);
  let index = siblings.length;
  if ("position" in patch) {
    const position = patch.position;
    if (typeof position !== "number" || !Number.isInteger(position) || position < 0 || position > siblings.length) {
      throw new Error(`position must be a whole number from 0 to ${siblings.length} (0 = first among its new siblings).`);
    }
    index = position;
  }
  siblings.splice(index, 0, moved.id);
  return { actions, offeringId: moved.id, parentId: parentId as string | null, siblingOrder: siblings };
}

function OfferingsWriteTargets({ feedRef }: { feedRef: RefObject<OfferingsFeed | null> }) {
  useSurfaceWriteHandlers(MARKETING_BRAND_OFFERINGS_SURFACE_NAME, {
    offering_draft: async (value: unknown) => {
      const feed = feedRef.current;
      const draft = stageOfferingDraft(value, feed);
      feed?.openDraft(draft);
    },
    offering_offer_here: {
      validate: async (value: unknown) => {
        checkOfferHere(value, feedRef.current);
      },
      apply: async (value: unknown) => {
        const { actions, ids } = checkOfferHere(value, feedRef.current);
        await actions.offer(ids);
      },
    },
    offering_stop_draft: async (value: unknown) => {
      const { actions, offerings } = checkStopHere(value, feedRef.current);
      actions.openStop(offerings);
    },
    offering_worth_draft: async (value: unknown) => {
      const { actions, offeringId, values } = checkWorthDraft(value, feedRef.current);
      actions.openWorth(offeringId, values);
    },
    offering_move: {
      validate: async (value: unknown) => {
        checkMove(value, feedRef.current);
      },
      apply: async (value: unknown) => {
        const { actions, offeringId, parentId, siblingOrder } = checkMove(value, feedRef.current);
        await actions.move(offeringId, parentId, siblingOrder);
      },
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
