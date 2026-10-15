/**
 * Smart Add validation — the page from SAVED data. Create writes every finding it kept to
 * `web.discovered_item` (pending, with `context.evidence_key`) and every kept fact to `web.business_fact`
 * (keptFacts.ts). This module reads them back — the open findings and what the brand already knows — so the
 * validation page opens straight from the brand, on any visit, with nothing waiting on a round.
 *
 *   rows (pending discovered_item)  → EvidenceItem[] (accounts, websites, names, contact, web, logos)
 *                                   + BrandFact[]    (the facts agent's findings; their row carries `field`)
 *   brand + properties + sites + confirmed facts → KnownOnBrand (fold.ts drops what is already known)
 */

import type { Json } from "@/types/database.types";
import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb } from "@/utils/supabase/webDb";
import { isJsonRecord, parseBrandProfile, type MarketingBrand } from "@/features/marketing/types";
import type { EvidenceField, EvidenceItem, EvidenceSource } from "../evidence";
import { parseSuggestion, type BrandFact } from "./queue";
import type { KnownOnBrand } from "./fold";

export interface SavedRow {
  id: string;
  category: string;
  guessed_kind: string | null;
  url: string | null;
  value: Json;
  context: Json;
  confidence: number | null;
}

const rec = (j: Json | null | undefined): Record<string, Json | undefined> => (isJsonRecord(j) ? (j as Record<string, Json | undefined>) : {});
const s = (v: Json | undefined): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const n = (v: Json | undefined): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

const FIELDS: ReadonlySet<string> = new Set<EvidenceField>([
  "name", "tagline", "expertise", "logo", "website", "social", "description", "category", "phone", "email", "address",
  "listing", "mention", "web_page", "bio_link", "link_page",
]);

function fieldOf(row: SavedRow): EvidenceField | null {
  if (row.category === "social") return "social";
  if (row.category === "media") return "logo";
  const g = row.guessed_kind ?? "";
  return FIELDS.has(g) ? (g as EvidenceField) : null;
}

function sourceKind(where: string, step: string): EvidenceSource["kind"] {
  if (/link ?tree|bio|beacons|stan\b/i.test(where)) return "link_in_bio";
  if (step === "web" || step === "deep" || /web result|image result|news result/i.test(where)) return "web_search";
  if (/profile/i.test(where)) return "social_profile";
  return "website";
}

/** One saved row → the facts agent's fact (its value carries `field`), or an evidence item, or null. */
export function fromRow(row: SavedRow): { fact: BrandFact } | { item: EvidenceItem } | null {
  const v = rec(row.value);
  const c = rec(row.context);
  const key = s(c.evidence_key);
  const text = s(v.text);
  if (!key || !text) return null;
  const factField = s(v.field);
  if (factField) {
    const urls = Array.isArray(v.evidence_urls) ? v.evidence_urls.filter((u): u is string => typeof u === "string") : [];
    return {
      fact: {
        key,
        field: factField,
        field_label: s(v.field_label) ?? factField,
        value: text,
        certainty: s(v.certainty) ?? "possible",
        reason: s(v.reason) ?? "",
        evidence_urls: urls,
        known_field: null,
        suggestion: parseSuggestion(c.suggestion),
        run_id: s(c.run_id),
      },
    };
  }
  const field = fieldOf(row);
  if (!field) return null;
  const where = s(c.where) ?? "";
  const search = rec(c.search);
  const url = row.url ?? (/^https?:\/\//i.test(text) ? text : null);
  return {
    item: {
      key,
      field,
      value: text,
      label: s(v.label),
      image_url: field === "logo" ? text : s(v.image_url),
      url,
      platform: row.category === "social" ? row.guessed_kind : null,
      handle: s(v.handle),
      followers: n(v.followers),
      verified: null,
      profile_id: s(c.profile_id),
      source: { node: s(c.step) ?? "saved", kind: sourceKind(where, s(c.step) ?? ""), url: s(c.found_on), where: where || null },
      confidence: row.confidence ?? 0.5,
      snippet: s(search.snippet),
      suggestion: c.suggestion ?? undefined,
    },
  };
}

export interface SavedFindings {
  items: EvidenceItem[];
  facts: BrandFact[];
  known: KnownOnBrand;
}

/** Every open finding saved on the brand, and what the brand already knows. */
export async function loadSavedFindings(brand: MarketingBrand): Promise<SavedFindings> {
  const db = await authenticatedWebDb(supabase);
  const [rows, properties, sites, facts] = await Promise.all([
    db
      .from("discovered_item")
      .select("id, category, guessed_kind, url, value, context, confidence")
      .eq("brand_id", brand.id)
      .eq("status", "pending")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(1000),
    db.from("property").select("url, handle, kind").eq("brand_id", brand.id).is("deleted_at", null).limit(500),
    db.from("site").select("root_url, domain").eq("brand_id", brand.id).is("deleted_at", null).limit(100),
    db.from("business_fact").select("kind, value, confirmed_at").eq("brand_id", brand.id).is("deleted_at", null).not("confirmed_at", "is", null).limit(1000),
  ]);
  for (const r of [rows, properties, sites, facts]) if (r.error) throw new Error(r.error.message);
  const items: EvidenceItem[] = [];
  const found: BrandFact[] = [];
  for (const row of rows.data ?? []) {
    const one = fromRow(row as SavedRow);
    if (!one) continue;
    if ("fact" in one) found.push(one.fact);
    else items.push(one.item);
  }
  const profile = parseBrandProfile(brand.profile);
  const known: KnownOnBrand = {
    names: [brand.name, ...(profile.brand_aliases ?? [])],
    hosts: [brand.website_url ?? "", ...(sites.data ?? []).flatMap((x) => [x.root_url ?? "", x.domain ?? ""])].filter(Boolean),
    urls: [
      brand.website_url ?? "",
      ...(properties.data ?? []).map((p) => p.url ?? ""),
      ...(sites.data ?? []).map((x) => x.root_url ?? ""),
    ].filter(Boolean),
    accounts: (properties.data ?? []).filter((p) => p.kind && p.handle).map((p) => `${p.kind}:${p.handle}`),
    values: (facts.data ?? []).map((f) => {
      const v = rec(f.value);
      return s(v.text) ?? s(v.url) ?? (typeof f.value === "string" ? f.value : "");
    }),
  };
  return { items, facts: found, known };
}
