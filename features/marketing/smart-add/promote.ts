/**
 * Smart Add promotion — the client of the ONE path that lands what Smart Add kept on a brand in the brand's real
 * home tables. The rules live on the server (aidream `aidream/services/brand_profile/promote.py`), never here:
 * findings keep arriving after Create (the facts agent is often still running) and after the person leaves the
 * page, and only the server sees those. Every trigger runs the same reconcile:
 *
 *   Create (SmartAddBrand.tsx) and every confirmed validation answer (validate/persist.ts)
 *                                         → POST /brand-intake/promote/{brandId}   (promoteSmartAddFindings)
 *   the round's facts step ending after Create → the server's brand.identify.land_late_findings step
 *   the backfill                          → aidream scripts/backfill_smart_add_promotion.py
 *
 * What lands where (confirmed findings only; Not us, match-only and Maybe never do — relation-usage.ts):
 *   competitor → seo.competitor · person → crm.party + platform.associations · location → web.business_location ·
 *   listing / review site → web.location_listing · keyword (Specialty) → seo.site_keyword_value · backlink →
 *   seo.backlink · product / service → web.brand_offering · category → web.brand.industry · typed fact kinds.
 *
 * Idempotent: a repeat call adds nothing. The result names the ids it created so an undo removes exactly those
 * (`undoPromotion`) and never a row a person made.
 */

import { postJson } from "@/lib/python-client";
import { supabase } from "@/utils/supabase/client";
import { parseBrandProfile, type BrandCompetitor as ProfileCompetitor } from "@/features/marketing/types";
import type { Json } from "@/types/database.types";

export const PROMOTED_TYPES = [
  "competitor",
  "person",
  "location",
  "listing",
  "keyword",
  "backlink",
  "offering",
  "industry",
  "typed_fact",
] as const;
export type PromotedFindingType = (typeof PROMOTED_TYPES)[number];

export interface PromoteResult {
  /** Rows written into a home table by this call. */
  landed: Record<PromotedFindingType, number>;
  /** Findings already in their home (idempotent re-run). */
  alreadyHome: Record<PromotedFindingType, number>;
  /** Findings whose home is the brand itself (a name-only rival, a listing with no location yet…). */
  keptOnBrand: Record<PromotedFindingType, number>;
  /** Ids of the home rows this call created, so an undo removes exactly those. */
  createdIds: Record<PromotedFindingType, string[]>;
  /** Rows the server could not write, by name. */
  problems: string[];
}

interface PromoteResponse {
  brand_id: string;
  landed: Record<string, number>;
  already_home: Record<string, number>;
  kept_on_brand: Record<string, number>;
  created_ids: Record<string, string[]>;
  problems: string[];
}

function byType<T>(raw: Record<string, T> | undefined, empty: () => T): Record<PromotedFindingType, T> {
  return Object.fromEntries(PROMOTED_TYPES.map((t) => [t, raw?.[t] ?? empty()])) as Record<PromotedFindingType, T>;
}

/** The server's response in the client's words (pure; tested). */
export function toPromoteResult(data: PromoteResponse): PromoteResult {
  return {
    landed: byType(data.landed, () => 0),
    alreadyHome: byType(data.already_home, () => 0),
    keptOnBrand: byType(data.kept_on_brand, () => 0),
    createdIds: byType(data.created_ids, () => [] as string[]),
    problems: data.problems ?? [],
  };
}

/** Land every confirmed Smart Add finding on this brand in its home, once (the server holds the rules). */
export async function promoteSmartAddFindings(brandId: string): Promise<PromoteResult> {
  const { data } = await postJson<PromoteResponse>(`/brand-intake/promote/${encodeURIComponent(brandId)}`, {});
  return toPromoteResult(data);
}

/** Where each created id lives, as `table:id` — published to the Builder panel beside an answer's homes. */
const HOME_TABLE: Record<PromotedFindingType, string | null> = {
  competitor: "seo.competitor",
  person: "platform.associations",
  location: "web.business_location",
  listing: "web.location_listing",
  keyword: "seo.site_keyword_value",
  backlink: "seo.backlink",
  offering: "web.brand_offering",
  industry: "web.brand",
  typed_fact: "web.business_fact",
};

export function promotedHomes(result: PromoteResult): string[] {
  return PROMOTED_TYPES.flatMap((t) => result.createdIds[t].map((id) => `${HOME_TABLE[t]}:${id}`));
}

/**
 * Undo a promotion: remove exactly the rows it created (soft delete where the table has it). A re-typed fact and a
 * filled industry are corrections, not new rows, and stay.
 */
export async function undoPromotion(created: Record<PromotedFindingType, string[]>): Promise<void> {
  const now = new Date().toISOString();
  const soft = async (schema: "web" | "seo" | "platform", table: string, ids: string[]) => {
    if (!ids.length) return;
    const { error } = await supabase.schema(schema).from(table as never).update({ deleted_at: now } as never).in("id", ids);
    if (error) throw new Error(error.message);
  };
  const hard = async (table: "competitor" | "backlink", ids: string[]) => {
    if (!ids.length) return;
    // No soft delete on these seo tables; the ids are only rows this promotion itself just created.
    const { error } = await supabase.schema("seo").from(table).delete().in("id", ids);
    if (error) throw new Error(error.message);
  };
  await hard("competitor", created.competitor);
  await hard("backlink", created.backlink);
  await soft("platform", "associations", created.person);
  await soft("web", "location_listing", created.listing);
  await soft("web", "business_location", created.location);
  await soft("seo", "site_keyword_value", created.keyword);
  await soft("web", "brand_offering", created.offering);
}

// ── Readers the Competitors page shares (display only; no promotion rule lives here) ──

/** `https://www.Foo.com/x` | `foo.com` → `foo.com`; null when it is not a domain. */
export function normalizeCompetitorDomain(raw: string | null | undefined): string | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return host.includes(".") ? host : null;
  } catch {
    return null;
  }
}

/** The brand's kept competitors, one per name and per domain (repeated Create/validate writes collapse). */
export function profileCompetitors(profile: Json | null): ProfileCompetitor[] {
  const list = parseBrandProfile(profile).competitors ?? [];
  const domains = new Set<string>();
  return list.filter((c) => {
    const d = normalizeCompetitorDomain(c.domain);
    if (!d) return true;
    if (domains.has(d)) return false;
    domains.add(d);
    return true;
  });
}
