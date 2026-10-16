/**
 * Smart Add promotion — the ONE path from what Smart Add kept on a brand to the brand's real home tables.
 *
 * Smart Add records some findings on the brand itself (the profile lists Create and the validation page
 * write), but the marketing surfaces read real tables. Before this path existed every competitor Smart Add
 * found sat in `web.brand.profile.competitors`, which the brand's Competitors page never reads (it reads
 * `seo.competitor` through the brand's sites and `social.tracked_account` role competitor), so none showed.
 *
 * `promoteSmartAddFindings(deps, brandId)` is a RECONCILE: it reads what the brand holds and makes sure
 * each promotable finding exists in its home. Running it again (Refresh, a later answer, the backfill)
 * adds nothing twice and never rewrites a row a person has since edited (insert-if-missing only).
 *
 * Callers: Create (SmartAddBrand.tsx, after the sites are claimed), the validation page's competitor answer
 * (validate/persist.ts), and the backfill. Each finding type has one promoter in `PROMOTERS`.
 *
 * What is promotable is decided upstream by the review answers: only kept findings reach the profile lists
 * (Not us / No never do — keptFacts.ts, relations.ts), so this path promotes everything it finds there.
 *
 *   competitor with a domain, brand has a site → seo.competitor (candidate, unclassified, source declared)
 *   competitor that is a name or handles only  → stays in the profile list; the Competitors page reads it
 *                                                (listBrandCompetitors) — no table holds a domain-less rival,
 *                                                and tracking handles spends points, which stays a click.
 */

import { getClaimsUser } from "@ai-matrx/auth";
import { supabase } from "@/utils/supabase/client";
import { parseBrandProfile, type BrandCompetitor as ProfileCompetitor } from "@/features/marketing/types";
import type { Json } from "@/types/database.types";

export type PromotedFindingType = "competitor";

export interface PromoteSite {
  id: string;
  /** The site's own host (www. stripped), so a brand never lists itself as a rival. */
  host: string | null;
}

export interface CompetitorHomeInsert {
  siteId: string;
  organizationId: string;
  createdBy: string;
  domain: string;
  name: string;
}

export interface PromoteDeps {
  readBrand(brandId: string): Promise<{ id: string; organizationId: string; profile: Json | null }>;
  listSites(brandId: string): Promise<PromoteSite[]>;
  /** Normalized domains already in seo.competitor on any of these sites. */
  listCompetitorDomains(siteIds: string[]): Promise<Set<string>>;
  /** Insert-if-missing on (site_id, normalized_domain); returns the ids of the rows THIS call created. */
  insertCompetitors(rows: CompetitorHomeInsert[]): Promise<string[]>;
  /** Remove rows this path created (an undo); never called with a row a person made. */
  deleteCompetitors(ids: string[]): Promise<void>;
  actorId(): Promise<string>;
}

export interface PromoteResult {
  /** Rows written into a home table by this run. */
  landed: Record<PromotedFindingType, number>;
  /** Findings already in their home (idempotent re-run). */
  alreadyHome: Record<PromotedFindingType, number>;
  /** Findings whose home is the profile list itself (name or handles only, or no site yet). */
  keptOnBrand: Record<PromotedFindingType, number>;
  /** Ids of the home rows this run created, so an undo removes exactly those and nothing a person made. */
  createdIds: Record<PromotedFindingType, string[]>;
}

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

type Promoter = (deps: PromoteDeps, brand: Awaited<ReturnType<PromoteDeps["readBrand"]>>) => Promise<{
  landed: number;
  alreadyHome: number;
  keptOnBrand: number;
  createdIds: string[];
}>;

const promoteCompetitors: Promoter = async (deps, brand) => {
  const competitors = profileCompetitors(brand.profile);
  if (!competitors.length) return { landed: 0, alreadyHome: 0, keptOnBrand: 0, createdIds: [] };
  const sites = await deps.listSites(brand.id);
  const ownHosts = new Set(sites.map((s) => s.host).filter((h): h is string => Boolean(h)));
  const home = sites[0];
  const existing = sites.length ? await deps.listCompetitorDomains(sites.map((s) => s.id)) : new Set<string>();
  const inserts: CompetitorHomeInsert[] = [];
  let alreadyHome = 0;
  let keptOnBrand = 0;
  const actor = home ? await deps.actorId() : "";
  for (const c of competitors) {
    const domain = normalizeCompetitorDomain(c.domain);
    if (!domain || !home || ownHosts.has(domain)) {
      keptOnBrand += 1;
      continue;
    }
    if (existing.has(domain)) {
      alreadyHome += 1;
      continue;
    }
    existing.add(domain);
    inserts.push({ siteId: home.id, organizationId: brand.organizationId, createdBy: actor, domain, name: c.name });
  }
  const createdIds = inserts.length ? await deps.insertCompetitors(inserts) : [];
  return { landed: createdIds.length, alreadyHome, keptOnBrand, createdIds };
};

/** One promoter per finding type; a new Smart Add finding type adds its promoter here. */
export const PROMOTERS: Record<PromotedFindingType, Promoter> = {
  competitor: promoteCompetitors,
};

export async function promoteSmartAddFindings(deps: PromoteDeps, brandId: string): Promise<PromoteResult> {
  const brand = await deps.readBrand(brandId);
  const result: PromoteResult = {
    landed: { competitor: 0 },
    alreadyHome: { competitor: 0 },
    keptOnBrand: { competitor: 0 },
    createdIds: { competitor: [] },
  };
  for (const [type, promote] of Object.entries(PROMOTERS) as [PromotedFindingType, Promoter][]) {
    const r = await promote(deps, brand);
    result.landed[type] = r.landed;
    result.alreadyHome[type] = r.alreadyHome;
    result.keptOnBrand[type] = r.keptOnBrand;
    result.createdIds[type] = r.createdIds;
  }
  return result;
}

// ── Live dependencies: direct to Supabase under row security ──────────────────

export const livePromoteDeps: PromoteDeps = {
  async readBrand(brandId) {
    const { data, error } = await supabase
      .schema("web")
      .from("brand")
      .select("id,organization_id,profile")
      .eq("id", brandId)
      .single();
    if (error) throw error;
    return { id: data.id, organizationId: data.organization_id, profile: data.profile };
  },
  async listSites(brandId) {
    const { data, error } = await supabase
      .schema("web")
      .from("site")
      .select("id,domain,root_url,created_at")
      .eq("brand_id", brandId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((s) => ({ id: s.id, host: normalizeCompetitorDomain(s.domain ?? s.root_url) }));
  },
  async listCompetitorDomains(siteIds) {
    const { data, error } = await supabase
      .schema("seo")
      .from("competitor")
      .select("normalized_domain")
      .in("site_id", siteIds);
    if (error) throw error;
    return new Set((data ?? []).map((r) => r.normalized_domain));
  },
  async insertCompetitors(rows) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .schema("seo")
      .from("competitor")
      .upsert(
        rows.map((r) => ({
          site_id: r.siteId,
          organization_id: r.organizationId,
          created_by: r.createdBy,
          normalized_domain: r.domain,
          display_domain: r.domain,
          display_name: r.name,
          discovery_source: "declared",
          tracking_status: "candidate",
          classification_status: "unclassified",
          metadata: { found_by: "smart_add", promoted_from: "web.brand.profile.competitors" },
          first_observed_at: now,
          last_observed_at: now,
        })),
        { onConflict: "site_id,normalized_domain", ignoreDuplicates: true },
      )
      .select("id");
    if (error) throw error;
    return (data ?? []).map((r) => r.id);
  },
  async deleteCompetitors(ids) {
    if (!ids.length) return;
    // seo.competitor has no soft delete; these ids are only rows promote.ts itself just created.
    const { error } = await supabase.schema("seo").from("competitor").delete().in("id", ids);
    if (error) throw error;
  },
  async actorId() {
    const { data, error } = await getClaimsUser(supabase);
    if (error || !data.user) throw new Error("Your identity could not be verified, so the competitors were not added.");
    return data.user.id;
  },
};
