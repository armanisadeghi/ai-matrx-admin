/**
 * Surface manifest — Brand offerings room (`matrx-user/marketing-brand-offerings`).
 *
 * Drives `/marketing/[brandId]/identity/offerings` — `BrandOfferingsPage`:
 * what the brand sells and what it charges. The catalog is BRAND-owned
 * (`web.brand_offering`, a parent/child tree). With no website the page is the
 * brand-only editor; once the brand has a website the same route shows the
 * site view, which adds what THAT site offers, its worth rulings, the keyword
 * demand per offering and the keyword placement status.
 *
 * Inherits the brand context from `matrx-user/marketing-brand`; the site-only
 * values are optional here and absent in the brand-only editor.
 *
 * Runtime scope assembly + write handler:
 * `features/marketing/seo/value-system/offerings/BrandOfferingsSurface.tsx`.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

const groups: SurfaceValueGroup[] = [
  {
    key: "offerings_catalog",
    label: "Offerings catalog",
    sortOrder: 100,
    description: "What the brand sells — the offering tree, with each offering's published price.",
  },
  {
    key: "offerings_site",
    label: "This website's view",
    sortOrder: 200,
    description:
      "Only when the brand has a website: which site is open, its keyword demand per offering and how much of that demand is placed.",
  },
  {
    key: "offerings_form",
    label: "Offering form",
    sortOrder: 300,
    description: "The add/edit form when it is open.",
  },
];

const surfaceSpecific: SurfaceValue[] = [
  {
    name: "offerings_catalog",
    label: "Offerings",
    description:
      "Every live offering the brand owns, one row each: { id, parent_id (null = top level), name, kind (product | service), description, sort, price ({ amount, currency, unit, note } or null when unpriced), from_template (the platform suggestion it was copied from, or null) }. When the brand has a website each row also carries the open site's view: { offered_here, offered_reason, other_site_count, worth_points, lead_quality, offering_match, worth_notes }. Empty array when the brand has no offerings yet; absent while the catalog loads.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 3000,
    sortOrder: 100,
    group: "offerings_catalog",
  },
  {
    name: "offerings_outline",
    label: "Offerings outline",
    description:
      "The same catalog as an indented text tree (two spaces per level), each line `name (kind) — price`. Read it for the shape of the catalog; use offerings_catalog for ids. Empty string when there are no offerings; absent while loading.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 800,
    inlineUpTo: 2000,
    sortOrder: 110,
    group: "offerings_catalog",
  },
  {
    name: "offerings_count",
    label: "Offering count",
    description: "How many live offerings the brand has. 0 when none; absent while the catalog loads.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 3,
    sortOrder: 120,
    group: "offerings_catalog",
  },
  {
    name: "offerings_site",
    label: "Open website",
    description:
      "{ site_id, domain, name } — the website whose view is open. Absent when the brand has no website (the brand-only editor).",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 120,
    sortOrder: 200,
    group: "offerings_site",
  },
  {
    name: "offerings_traffic",
    label: "Keyword demand per offering",
    description:
      "Last 28 days, one row per offering and value band: { offering_id, value_band, keywords, clicks, impressions }. Empty array when no keyword demand is placed on any offering; absent in the brand-only editor or while loading.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 1500,
    autoContext: false,
    sortOrder: 210,
    group: "offerings_site",
  },
  {
    name: "offerings_placement",
    label: "Keyword placement status",
    description:
      "How much of the site's keyword demand sits on an offering: { demand_keywords, demand_keywords_placed, demand_clicks, demand_clicks_placed, proposals_pending, queue_pending }. Absent in the brand-only editor or while loading.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 200,
    autoContext: false,
    sortOrder: 220,
    group: "offerings_site",
  },
  {
    name: "offering_edit_draft",
    label: "Open offering form",
    description:
      "The add/edit form as it was opened or staged: { offering_id (null = adding a new one), name, kind, description, parent_id, price_amount, price_currency, price_unit, price_note } (strings; empty price_amount = no published price). Text the person typed into the open form afterwards is not visible here. Absent when no form is open.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 300,
    sortOrder: 300,
    group: "offerings_form",
  },
];

/**
 * Write targets, each wired to the page's own handlers.
 *
 * - `offering_draft` (draft): opens the add/edit form pre-filled; the OWNER
 *   presses Save (offering row, then published price).
 * - `offering_stop_draft` (draft): opens the page's "Stop offering" confirm
 *   dialog (it lists the consequences); the owner confirms.
 * - `offering_worth_draft` (draft): opens the page's worth dialog pre-filled;
 *   the owner reviews and saves.
 * - `offering_offer_here` (entity, ask): the row's "offered here" switch saves
 *   on click, so this does too, after the owner approves the call.
 * - `offering_move` (entity, ask): drag-and-drop re-parenting saves on drop, so
 *   this does too, after the owner approves the call.
 *
 * DELETION IS HUMAN-ONLY: there is deliberately no target that removes an
 * offering from the brand (it also drops it from every site and reassigns
 * keyword placements), and none that clears a worth ruling. The site-view
 * targets throw in the brand-only editor (no website, nothing per-site to
 * change). Handlers: `features/marketing/seo/value-system/offerings/BrandOfferingsSurface.tsx`.
 */
const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "offering_draft",
    label: "Offering form",
    description:
      "Open the add/edit offering form pre-filled. Value: a partial object with any of { offering_id?: string (an id from offerings_catalog to edit that offering; omit to add a new one), name?: string, kind?: \"product\" | \"service\", description?: string, parent_id?: string | null (an offering id; null = top level), price_amount?: string | number (\"\" = no published price), price_currency?: 3-letter code, price_unit?: one_time | per_month | per_year | per_hour | per_item | starting_at | \"\", price_note?: string }. When offering_id is given the omitted keys keep that offering's current values. Nothing is saved until the owner presses Save in the form.",
    valueType: "object",
    updatesValue: "offering_edit_draft",
    mode: "draft",
    applyPolicy: "ask",
    group: "offerings_form",
    sortOrder: 100,
  },
  {
    name: "offering_stop_draft",
    label: "Stop offering on this website",
    description:
      "Site view only. Open the 'Stop offering' confirm dialog for offerings this website currently offers. Value: { offering_ids: string[] } (ids from offerings_catalog whose offered_here is true; ones already not offered are skipped, and it throws if none is offered). The dialog states what stopping sets aside (keyword placements, worth rulings) and takes the owner's reason; nothing changes until the owner confirms there.",
    valueType: "object",
    updatesValue: "offerings_catalog",
    mode: "draft",
    applyPolicy: "ask",
    group: "offerings_site",
    sortOrder: 210,
  },
  {
    name: "offering_worth_draft",
    label: "Worth ruling",
    description:
      "Site view only. Open this website's worth dialog for one offering, pre-filled. Value: { offering_id: string (offered_here must be true), worth_points: number (points added to the site baseline; negative counts down), lead_quality?: \"high_value\" | \"medium_value\" | \"low_value\" | \"negative_value\" | null, offering_match?: \"core_offering\" | \"adjacent_offering\" | \"not_offered\" | \"actively_avoided\" | null, notes?: string }. Omitted keys keep the saved ruling. negative_value / not_offered / actively_avoided force every keyword beneath the offering to Negative, which the dialog says when chosen. Nothing is saved until the owner presses Save.",
    valueType: "object",
    updatesValue: "offerings_catalog",
    mode: "draft",
    applyPolicy: "ask",
    group: "offerings_site",
    sortOrder: 220,
  },
  {
    name: "offering_offer_here",
    label: "Offer on this website",
    description:
      "Site view only. Start offering brand offerings on this website (the 'offered here' switch). Value: { offering_ids: string[] } (ids from offerings_catalog whose offered_here is false; ones already offered are skipped, and it throws if all are). Saves immediately and restores any worth rulings and keyword placements that were set aside when it was last stopped. Stopping is not immediate: use offering_stop_draft.",
    valueType: "object",
    updatesValue: "offerings_catalog",
    mode: "entity",
    applyPolicy: "ask",
    group: "offerings_site",
    sortOrder: 230,
  },
  {
    name: "offering_move",
    label: "Move an offering",
    description:
      "Site view only. Re-parent and/or reorder one offering in the brand's catalog (the drag-and-drop move). Value: { offering_id: string, parent_id: string | null (required; null = top level), position?: integer (0 = first among its new siblings; omitted = last) }. The whole branch moves with it, for every website of the brand, and it saves immediately. Throws for an unknown id or a move under the offering's own branch.",
    valueType: "object",
    updatesValue: "offerings_catalog",
    mode: "entity",
    applyPolicy: "ask",
    group: "offerings_site",
    sortOrder: 240,
  },
];

export const marketingBrandOfferingsManifest: SurfaceManifest = {
  surfaceName: "matrx-user/marketing-brand-offerings",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description:
    "The brand offerings room — the tree of what the brand sells and charges, plus (with a website) what the site offers and what each offering is worth.",
  label: "Brand Offerings",
  situation:
    "They are in the brand's Offerings room: the tree of what the brand sells ({offerings_count|an unknown number of} offerings), shown for the website {offerings_site.domain|none chosen}. They can add, edit, move or stop an offering, set what it is worth and whether this website offers it.",
  urlPattern: "/marketing/[brandId]/identity/offerings",
  inheritsFrom: "matrx-user/marketing-brand",
  readiness: "partial",
  readinessNote:
    "Manifest, emitter and five write targets (offering form, stop offering, worth ruling, offer here, move) are wired and synced to the DB mirror (2026-10-18); not yet run live. Deleting an offering and clearing a worth ruling are deliberately not agent-writable. This room inherits the brand only: in the site view the open website is declared by this room as offerings_site, while the site surface's own context (site_context, connections) is not carried into this room's scope. No AI job runs from this room, so there are no agent roles.",
  intro: `<surface_intro>
You are on a brand's Offerings room: the tree of what the brand sells and what it charges. Read brand_context first, then offerings_outline for the shape and offerings_catalog for ids and prices.
Offerings belong to the brand; the parent/child tree is catalog hierarchy ("On-site Shredding is part of Hard Drive Shredding"), not which website sells it. When offerings_site is present the brand has a website and the page also shows what THAT site offers, its worth rulings and the keyword demand per offering; when it is absent this is the brand-only editor.
In the site view you may also offer an offering here (offering_offer_here, saves after the owner approves), move one (offering_move, same), or stage a stop-offering or worth ruling the owner confirms in the page's own dialog. Removing an offering is the owner's alone.
Useful work: spot missing or duplicated offerings, a product filed as a service, a child that belongs elsewhere, or offerings with no published price, and stage the fix in offering_draft. The owner reviews the form and saves; nothing you stage is saved on its own.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("selection", "context"), surfaceSpecific),
  writeTargets,
};

/**
 * Type-safe payload helper. Required keys ↔ every `alwaysAvailable: true`
 * value, INCLUDING the inherited `brand_id` from `matrx-user/marketing-brand`.
 */
export function createMarketingBrandOfferingsScope(values: {
  // Inherited alwaysAvailable: true → required
  brand_id: string;
  // Inherited optionals (marketing-brand)
  brand_name?: string;
  brand_context?: string;
  brand_profile?: Record<string, unknown>;
  pending_review_count?: number;
  sites_summary?: ReadonlyArray<Record<string, unknown>>;
  properties_summary?: ReadonlyArray<Record<string, unknown>>;
  // Own (all optional)
  offerings_catalog?: ReadonlyArray<Record<string, unknown>>;
  offerings_outline?: string;
  offerings_count?: number;
  offerings_site?: Record<string, unknown>;
  offerings_traffic?: ReadonlyArray<Record<string, unknown>>;
  offerings_placement?: Record<string, unknown>;
  offering_edit_draft?: Record<string, unknown>;
  selection?: string;
  context?: Record<string, unknown>;
}): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
