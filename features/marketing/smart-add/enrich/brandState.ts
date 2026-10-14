/**
 * Enrich: read everything currently on the brand once, when enrich starts (ENRICH.md §2).
 * Live rows only (deleted_at is null) — every reader below already filters it.
 */

import { listBrandExclusions, listBrandRelations } from "@/features/marketing/data/brand-relations";
import {
  getBrand,
  listBrandAssets,
  listBrandProperties,
  listBrandRelationKinds,
  listBrandSites,
  listBusinessFacts,
} from "@/features/marketing/data/service";
import { isJsonRecord } from "@/features/marketing/types";
import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb } from "@/utils/supabase/webDb";
import { textKeySource, type BrandOffering, type BrandSnapshot } from "./known";

async function sha12(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
}

async function listBrandOfferings(brandId: string): Promise<BrandOffering[]> {
  const { data, error } = await (await authenticatedWebDb(supabase))
    .from("brand_offering")
    .select("id, name, kind")
    .eq("brand_id", brandId)
    .is("deleted_at", null)
    .order("sort", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map((o) => ({ id: o.id, name: o.name, kind: o.kind }));
}

export async function loadBrandSnapshot(brandId: string): Promise<BrandSnapshot> {
  const [brand, sites, properties, assets, facts, relations, kinds, offerings, exclusions] = await Promise.all([
    getBrand(brandId),
    listBrandSites(brandId),
    listBrandProperties(brandId),
    listBrandAssets(brandId),
    listBusinessFacts(brandId),
    listBrandRelations(brandId),
    listBrandRelationKinds(),
    listBrandOfferings(brandId),
    listBrandExclusions(brandId),
  ]);
  const personKinds = new Set(kinds.filter((k) => k.routesTo === "owns" || k.routesTo === "key_person").map((k) => k.key));
  const people = relations
    .filter((r) => personKinds.has(r.relationKey))
    .map((r) => ({ id: r.id, label: r.label, url: r.url, relationKey: r.relationKey }));
  // The server keys long text by a hash (brand_identify._key): match it so a re-found description is "already known".
  const texts = [
    brand.description ?? "",
    ...facts
      .filter((f) => f.kind === "address" && isJsonRecord(f.value) && typeof f.value.text === "string")
      .map((f) => (isJsonRecord(f.value) ? String(f.value.text) : "")),
  ].filter(Boolean);
  const textKeys: Record<string, string> = {};
  await Promise.all(
    texts.map(async (t) => {
      const src = textKeySource(t);
      textKeys[src] = await sha12(src);
    }),
  );
  return { brand, sites, properties, assets, facts, people, offerings, exclusions, textKeys };
}
