/**
 * Create's facts: every fact the Brand Basics Fact Finder found that the person did not say No to lands on
 * the brand, with its provenance — never dropped because nobody answered it ("everything found is kept
 * unless No").
 *
 *   each kept fact          → web.business_fact (source `discovered`; confirmed_at only when the person said
 *                             Yes), or its brand profile key when that is its one home (aliases, service area,
 *                             competitors — the same homes validate/persist.ts uses)
 *                           + web.discovered_item (its decision: pending "kept", or confirmed), answered in
 *                             place later by the validation page (context.evidence_key = the fact's key;
 *                             resolved_fact_id = the fact row)
 *   the basics              → web.brand description / industry (only when Create had none), profile.audience,
 *                             profile.service_area, profile.brand_aliases, profile.competitors,
 *                             profile.expertise_areas, tagline fact
 *   offerings               → web.brand_offering (active)
 *   what the person settled → web.brand.metadata.smart_add.confirmed, so the setup gate never asks again
 *
 * Provenance on every row: found_by (the mandate), agent kind, the round's run id, step, field, certainty,
 * reason, evidence urls, the decision. Nothing here hard-deletes; undo goes through validate/persist.ts
 * (soft-delete) and web.decision_retraction (UNDO.md).
 */

import type { Json } from "@/types/database.types";
import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb } from "@/utils/supabase/webDb";
import { extractErrorMessage } from "@/utils/errors";
import { isBusinessFactKind } from "@/features/marketing/types";
import type { BrandFact } from "./validate/queue";
import type { Decision } from "./evidence";

/** The mandate that produces these facts (Arman's Brand Basics Fact Finder). */
export const FACTS_FOUND_BY = "brand_intake.early_facts";

/** The facts agent's fields that are a web.business_fact kind under another name (validate/persist.ts agrees). */
const FIELD_KIND: Record<string, string> = {
  toll_free_phone: "phone",
  sms_number: "phone",
  street_address: "address",
  business_hours: "hours",
  official_name: "legal_name",
  legal_entity_name: "legal_name",
  brand_legal_name: "legal_name",
  short_description: "description",
  registration_number: "registration",
  license_number: "registration",
};

/** Fact fields whose one home is a web.brand profile key (validate/persist.ts PROFILE_HOME). */
const PROFILE_HOME: Record<string, "brand_aliases" | "service_area" | "competitors"> = {
  also_known_as: "brand_aliases",
  dba_name: "brand_aliases",
  former_name: "brand_aliases",
  service_area: "service_area",
  competitor: "competitors",
};

const OFFERING_FIELDS = new Set(["primary_products_services", "product", "service", "products", "services"]);
const SERVICE_WORDS = /\b(service|services|repair|install|installation|consult|consulting|coaching|training|placement|search|staffing|recruit|cleaning|care|therapy|treatment|design|management|support|plumbing|delivery|catering|classes?|lessons?|programs?)\b/i;

const CERTAINTY_RANK: Record<string, number> = { confirmed: 3, likely: 2, possible: 1 };
const sure = (f: BrandFact) => (CERTAINTY_RANK[f.certainty] ?? 0) >= 2;

export function factKindFor(field: string): string {
  const f = field.toLowerCase();
  if (isBusinessFactKind(f)) return f;
  return FIELD_KIND[f] ?? "other";
}

export type FactDecision = "kept" | "confirmed";

export interface KeptFactRow {
  fact: BrandFact;
  decision: FactDecision;
  /** web.business_fact kind; null when the fact's home is a profile key. */
  kind: string | null;
  profileHome: "brand_aliases" | "service_area" | "competitors" | null;
  metadata: Record<string, Json>;
}

export interface KeptFactPlan {
  rows: KeptFactRow[];
  /** Brand columns to fill when Create had none. */
  description: string | null;
  industry: string | null;
  tagline: string | null;
  profile: { audience?: string; service_area?: string; brand_aliases?: string[]; competitors?: { name: string }[]; expertise_areas?: string[] };
  offerings: { name: string; kind: "product" | "service"; fact: BrandFact }[];
  /** Where each filled basic came from (the gate shows it). */
  basicsSources: Record<string, string>;
}

/**
 * Plan what Create writes from the facts. `slotDecision(fact)` is the person's answer on the slot the fact
 * fed (name / phone / email / category), if any; facts are otherwise unanswered before Create.
 */
export function planKeptFacts(
  facts: BrandFact[],
  slotDecision: (fact: BrandFact) => Decision | undefined,
  already: { description?: string | null; industry?: string | null; tagline?: string | null; brandName?: string | null } = {},
): KeptFactPlan {
  const seen = new Set<string>();
  const rows: KeptFactRow[] = [];
  for (const fact of facts) {
    if (fact.conflict_with) continue; // a conflict asks which is right on the validation page; nothing is kept yet
    const d = slotDecision(fact);
    if (d === "no") continue;
    if (seen.has(fact.key)) continue;
    seen.add(fact.key);
    const decision: FactDecision = d ? "confirmed" : "kept";
    const profileHome = PROFILE_HOME[fact.field.toLowerCase()] ?? null;
    rows.push({
      fact,
      decision,
      kind: profileHome ? null : factKindFor(fact.field),
      profileHome,
      metadata: provenance(fact, decision),
    });
  }
  const kept = rows.map((r) => r.fact);
  const best = (fields: string[], filter: (f: BrandFact) => boolean = sure): BrandFact | null => {
    for (const field of fields) {
      const hits = kept.filter((f) => f.field === field && filter(f));
      hits.sort((a, b) => (CERTAINTY_RANK[b.certainty] ?? 0) - (CERTAINTY_RANK[a.certainty] ?? 0));
      if (hits[0]) return hits[0];
    }
    return null;
  };
  const basicsSources: Record<string, string> = {};
  const from = (key: string, f: BrandFact | null) => {
    if (f) basicsSources[key] = `Brand Basics Fact Finder · ${f.field_label} · ${f.certainty}`;
    return f;
  };
  const taglineFact = already.tagline ? null : best(["tagline", "brand_statement"]);
  const tagline = already.tagline ?? taglineFact?.value ?? null;
  // The statement chosen as the tagline IS the tagline fact (one row, never a second copy).
  const taglineRow = taglineFact ? rows.find((r) => r.fact === taglineFact) : undefined;
  if (taglineRow) taglineRow.kind = "tagline";
  if (taglineFact) from("tagline", taglineFact);
  // What you do: the short description, else the business type, else the fullest statement that is not the tagline.
  const statements = kept
    .filter((f) => f.field === "brand_statement" && sure(f) && f.value !== tagline)
    .sort((a, b) => b.value.length - a.value.length);
  const descriptionFact = already.description
    ? null
    : from("what_you_do", best(["short_description", "business_type"]) ?? statements[0] ?? null);
  const industryFact = already.industry ? null : from("industry", best(["industry", "business_category", "business_type"]));

  const unique = (values: string[]) => [...new Map(values.map((v) => [v.trim().toLowerCase(), v.trim()])).values()].filter(Boolean);
  const all = (field: string) => kept.filter((f) => f.field === field && sure(f));
  const audience = unique(all("target_market").map((f) => f.value));
  const serviceArea = from("service_area", best(["service_area"]));
  const name = (already.brandName ?? "").trim().toLowerCase();
  const aliases = unique([...all("also_known_as"), ...all("dba_name")].map((f) => f.value)).filter((a) => a.toLowerCase() !== name);
  const competitors = unique(all("competitor").map((f) => f.value));
  const expertise = unique(all("specialty").map((f) => f.value));
  if (audience.length) basicsSources.audience = "Brand Basics Fact Finder · Target Market";
  if (competitors.length) basicsSources.competitors = "Brand Basics Fact Finder · Competitor";
  if (aliases.length) basicsSources.aliases = "Brand Basics Fact Finder · Also Known As";

  const offeringSeen = new Set<string>();
  const offerings: KeptFactPlan["offerings"] = [];
  for (const f of kept) {
    if (!OFFERING_FIELDS.has(f.field) || !sure(f)) continue;
    const slug = f.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!slug || offeringSeen.has(slug)) continue;
    offeringSeen.add(slug);
    offerings.push({ name: f.value.trim(), kind: f.field === "service" || SERVICE_WORDS.test(f.value) ? "service" : "product", fact: f });
  }
  if (offerings.length) basicsSources.offerings = "Brand Basics Fact Finder · Primary Products & Services";

  return {
    rows,
    description: descriptionFact?.value ?? null,
    industry: industryFact?.value ?? null,
    tagline: taglineFact?.value ?? null,
    profile: {
      ...(audience.length ? { audience: audience.join("; ") } : {}),
      ...(serviceArea ? { service_area: serviceArea.value } : {}),
      ...(aliases.length ? { brand_aliases: aliases } : {}),
      ...(competitors.length ? { competitors: competitors.map((c) => ({ name: c })) } : {}),
      ...(expertise.length ? { expertise_areas: expertise } : {}),
    },
    offerings,
    basicsSources,
  };
}

function provenance(fact: BrandFact, decision: FactDecision): Record<string, Json> {
  return {
    found_by: FACTS_FOUND_BY,
    agent_kind: "brand_basics",
    run_id: fact.run_id ?? null,
    step: "facts",
    field: fact.field,
    field_label: fact.field_label,
    found_value: fact.value,
    certainty: fact.certainty,
    reason: fact.reason,
    evidence_urls: fact.evidence_urls,
    decision,
    evidence_key: fact.key,
    written_by: "smart_add.create",
  };
}

function factValue(value: string): Json {
  return /^https?:\/\//i.test(value.trim()) ? { url: value.trim() } : { text: value.trim() };
}

/** Write the planned facts, their decisions and the offerings. Returns the problems (never throws). */
export async function saveKeptFacts(
  organizationId: string,
  brandId: string,
  plan: KeptFactPlan,
  /** `kind|value` (lower case) already written by Create's own contact facts — never written twice. */
  written: Set<string>,
): Promise<{ problems: string[]; factIds: string[]; offeringIds: string[] }> {
  const problems: string[] = [];
  const db = await authenticatedWebDb(supabase);
  const now = new Date().toISOString();
  const factRows = plan.rows.filter((r) => r.kind && !written.has(`${r.kind}|${r.fact.value.trim().toLowerCase()}`));
  const factIdByKey = new Map<string, string>();
  if (factRows.length) {
    const res = await db
      .from("business_fact")
      .insert(
        factRows.map((r) => ({
          organization_id: organizationId,
          brand_id: brandId,
          kind: r.kind as string,
          label: r.fact.field_label,
          value: factValue(r.fact.value),
          source: "discovered",
          metadata: r.metadata as Json,
          ...(r.decision === "confirmed" ? { confirmed_at: now } : {}),
        })),
      )
      .select("id, metadata");
    if (res.error) problems.push(`Facts: ${res.error.message}`);
    for (const row of res.data ?? []) {
      const key = (row.metadata as Record<string, unknown> | null)?.evidence_key;
      if (typeof key === "string") factIdByKey.set(key, row.id);
    }
  }
  // Every kept fact's decision, answered in place by the validation page (validate/persist.ts).
  if (plan.rows.length) {
    const res = await db.from("discovered_item").insert(
      plan.rows.map((r) => ({
        organization_id: organizationId,
        brand_id: brandId,
        source: "smart_add",
        category: "fact",
        guessed_kind: r.fact.field,
        url: null,
        value: {
          text: r.fact.value,
          field: r.fact.field,
          field_label: r.fact.field_label,
          certainty: r.fact.certainty,
          reason: r.fact.reason,
          evidence_urls: r.fact.evidence_urls,
        } as Json,
        context: {
          evidence_key: r.fact.key,
          where: "research",
          found_on: r.fact.evidence_urls[0] ?? null,
          step: "facts",
          found_by: FACTS_FOUND_BY,
          run_id: r.fact.run_id ?? null,
          decision: r.decision,
          ...(r.profileHome ? { home: `web.brand.profile.${r.profileHome}` } : {}),
        } as Json,
        confidence: r.fact.certainty === "confirmed" ? 0.85 : r.fact.certainty === "likely" ? 0.7 : 0.5,
        status: r.decision === "confirmed" ? "confirmed" : "pending",
        ...(r.decision === "confirmed" ? { reviewed_at: now, relation_key: "ours" } : {}),
        ...(factIdByKey.get(r.fact.key) ? { resolved_fact_id: factIdByKey.get(r.fact.key) } : {}),
      })),
    );
    if (res.error) problems.push(`Fact decisions: ${res.error.message}`);
  }
  const offeringIds: string[] = [];
  if (plan.offerings.length) {
    const res = await db
      .from("brand_offering")
      .insert(
        plan.offerings.map((o, i) => ({
          organization_id: organizationId,
          brand_id: brandId,
          name: o.name,
          slug: o.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "offering",
          kind: o.kind,
          status: "active",
          sort: i,
          metadata: { ...provenance(o.fact, "kept"), kind_guessed: true } as Json,
        })),
      )
      .select("id");
    if (res.error) problems.push(`Offerings: ${extractErrorMessage(res.error)}`);
    offeringIds.push(...(res.data ?? []).map((r) => r.id));
  }
  return { problems, factIds: [...factIdByKey.values()], offeringIds };
}
