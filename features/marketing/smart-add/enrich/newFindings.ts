/**
 * Enrich: the other things a round found. "Changes to your brand" diffs the basics (name, logo, sites, accounts…);
 * competitors, people, locations, listings, keywords, offerings and credentials reach the brand through the
 * Inbox and the server's promotion, so this summarises them as counts with a short list, each naming where it
 * now lives. Pure planning here (tested); the one read is `loadNewFindings`.
 */

import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb } from "@/utils/supabase/webDb";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { foldKeptDuplicates, keptKindOf, nameKey, type KeptOnBrand } from "@/features/marketing/discovery-duplicates";
import { isJsonRecord, type DiscoveredItem } from "@/features/marketing/types";
import { profileCompetitors } from "@/features/marketing/data/brand-relations";
import type { BrandSnapshot } from "./known";

export type FindingGroup = "competitor" | "person" | "location" | "listing" | "keyword" | "offering" | "credential";

export interface FindingRow {
  category: string;
  guessed_kind: string | null;
  url: string | null;
  value: unknown;
}

export interface FindingSummary {
  group: FindingGroup;
  label: string;
  count: number;
  /** At most `SHOWN` names. */
  names: string[];
  href: string;
}

const SHOWN = 3;
const GROUP_LABEL: Record<FindingGroup, string> = {
  competitor: "Competitors",
  person: "People",
  location: "Locations",
  listing: "Listings",
  keyword: "Keywords",
  offering: "Offerings",
  credential: "Credentials",
};
const ORDER: FindingGroup[] = ["competitor", "person", "location", "listing", "keyword", "offering", "credential"];

const PERSON_FIELDS = new Set(["founder", "co_founder", "cofounder", "owner", "key_executive", "ceo", "president", "employee", "team_member", "staff_contact", "spokesperson", "person"]);
const LOCATION_FIELDS = new Set(["headquarters_location", "additional_location", "campus_location"]);
const LISTING_FIELDS = new Set(["yelp_page", "other_listing", "trustpilot_page", "bbb_profile", "crunchbase_page", "google_business_profile", "tripadvisor_page", "angi_page", "houzz_page", "linkedin_company_page"]);
const CREDENTIAL_FIELDS = new Set(["certification", "membership", "award", "press_mention", "credential"]);

export function findingGroupOf(row: Pick<FindingRow, "category" | "guessed_kind">): FindingGroup | null {
  const field = (row.guessed_kind ?? "").toLowerCase();
  if (field === "competitor" || field === "competitors") return "competitor";
  if (PERSON_FIELDS.has(field)) return "person";
  if (LOCATION_FIELDS.has(field)) return "location";
  if (LISTING_FIELDS.has(field)) return "listing";
  if (field === "specialty") return "keyword";
  if (CREDENTIAL_FIELDS.has(field)) return "credential";
  if (row.category === "offering" || keptKindOf({ category: row.category, guessed_kind: row.guessed_kind }) === "offering") return "offering";
  return null;
}

function nameOf(row: FindingRow): string {
  if (isJsonRecord(row.value)) {
    for (const key of ["label", "name", "text", "value"]) {
      const v = row.value[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  } else if (typeof row.value === "string" && row.value.trim()) return row.value.trim();
  return row.url ?? "";
}

function hrefFor(group: FindingGroup, brandId: string): string {
  switch (group) {
    case "competitor":
      return marketingRoutes.brandCompetitors(brandId);
    case "location":
    case "listing":
      return marketingRoutes.brandLocal(brandId);
    case "offering":
      return marketingRoutes.brandOfferings(brandId);
    case "keyword":
      return marketingRoutes.brandSeo(brandId);
    default:
      return marketingRoutes.brand(brandId);
  }
}

/** What was already on the brand before the round, in the duplicate check's terms. */
export function keptFromSnapshot(snapshot: BrandSnapshot): KeptOnBrand {
  return {
    competitors: profileCompetitors(snapshot.brand.profile ?? null).map((c) => ({ name: c.name, domain: c.domain ?? c.url ?? null })),
    people: snapshot.people.map((p) => ({ name: p.label, domain: p.url })),
    offerings: snapshot.offerings.map((o) => ({ name: o.name })),
  };
}

/** Group a round's findings into counts with a short list; what the brand already held and repeats are not new. */
export function summarizeFindings(rows: readonly FindingRow[], kept: KeptOnBrand, brandId: string): FindingSummary[] {
  const { open } = foldKeptDuplicates(rows as readonly DiscoveredItem[], kept);
  const seen = new Set<string>();
  const byGroup = new Map<FindingGroup, string[]>();
  for (const row of open) {
    const group = findingGroupOf(row);
    if (!group) continue;
    const name = nameOf(row);
    const key = `${group}:${nameKey(name)}`;
    if (!name || seen.has(key)) continue;
    seen.add(key);
    byGroup.set(group, [...(byGroup.get(group) ?? []), name]);
  }
  return ORDER.filter((g) => byGroup.has(g)).map((group) => {
    const names = byGroup.get(group) ?? [];
    return { group, label: GROUP_LABEL[group], count: names.length, names: names.slice(0, SHOWN), href: hrefFor(group, brandId) };
  });
}

/** The findings the round made on this brand since it was read (pending in the Inbox or already kept). */
export async function loadNewFindings(snapshot: BrandSnapshot): Promise<FindingSummary[]> {
  if (!snapshot.readAt) return [];
  const db = await authenticatedWebDb(supabase);
  const { data, error } = await db
    .from("discovered_item")
    .select("category, guessed_kind, url, value")
    .eq("brand_id", snapshot.brand.id)
    .in("status", ["pending", "confirmed"])
    .gte("created_at", snapshot.readAt)
    .is("deleted_at", null)
    .limit(1000);
  if (error) throw new Error(error.message);
  return summarizeFindings(data ?? [], keptFromSnapshot(snapshot), snapshot.brand.id);
}
