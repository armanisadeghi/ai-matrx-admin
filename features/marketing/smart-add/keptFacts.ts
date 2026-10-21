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
 * Provenance on every row: found_by (the producing mandate: the agent that found it), the round's run id, step, field, certainty,
 * reason, evidence urls, the decision. Nothing here hard-deletes; undo goes through validate/persist.ts
 * (soft-delete) and web.decision_retraction (UNDO.md).
 */

import type { Json } from "@/types/database.types";
import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb } from "@/utils/supabase/webDb";
import { extractErrorMessage } from "@/utils/errors";
import { factDisplayLabel } from "@/features/marketing/lib/factLabel";
import type { BrandFact } from "./validate/queue";
import type { Decision } from "./evidence";
import { EARLY_FACTS_MANDATE, factIdentity } from "./factIdentity";
import { factKindFor, profileHomeFor, type FactRules, type ProfileHome } from "./factRules";

/** The mandate that produces these facts (Arman's Brand Basics Fact Finder). */
export const FACTS_FOUND_BY = EARLY_FACTS_MANDATE;

const OFFERING_FIELDS = new Set(["primary_products_services", "product", "service", "products", "services"]);
const SERVICE_WORDS = /\b(service|services|repair|install|installation|consult|consulting|coaching|training|placement|search|staffing|recruit|cleaning|care|therapy|treatment|design|management|support|plumbing|delivery|catering|classes?|lessons?|programs?)\b/i;

const CERTAINTY_RANK: Record<string, number> = { confirmed: 3, likely: 2, possible: 1 };
const sure = (f: BrandFact) => (CERTAINTY_RANK[f.certainty] ?? 0) >= 2;

export type FactDecision = "kept" | "confirmed";

export interface KeptFactRow {
  fact: BrandFact;
  decision: FactDecision;
  /** web.business_fact kind; null when the fact's home is a profile key. */
  kind: string | null;
  profileHome: ProfileHome | null;
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
 * fed (name / phone / email / category), if any; facts are otherwise unanswered before Create. `rules` is the
 * server's fact-filing rules (factRules.ts) — which kind a field is filed under and which fields live on the profile.
 */
export function planKeptFacts(
  facts: BrandFact[],
  slotDecision: (fact: BrandFact) => Decision | undefined,
  rules: FactRules,
  already: { description?: string | null; industry?: string | null; tagline?: string | null; brandName?: string | null } = {},
): KeptFactPlan {
  const seen = new Set<string>();
  const seenIdentity = new Set<string>();
  const rows: KeptFactRow[] = [];
  for (const fact of facts) {
    if (fact.conflict_with) continue; // a conflict asks which is right on the validation page; nothing is kept yet
    const d = slotDecision(fact);
    if (d === "no") continue;
    if (seen.has(fact.key)) continue;
    seen.add(fact.key);
    const profileHome = profileHomeFor(fact.field, rules);
    // The same fact in another format (or under another field name) is one row, never two.
    const identity = profileHome ? null : factIdentity(factKindFor(fact.field, rules), fact.value);
    if (identity) {
      if (seenIdentity.has(identity)) continue;
      seenIdentity.add(identity);
    }
    const decision: FactDecision = d ? "confirmed" : "kept";
    rows.push({
      fact,
      decision,
      kind: profileHome ? null : factKindFor(fact.field, rules),
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

/** A contact fact (phone / email / address) or the tagline the person confirmed on the slots. */
export interface ConfirmedContactFact {
  kind: string;
  value: string;
  /** Mandate key that found it (factIdentity.foundByForSource). */
  foundBy: string;
  typed: boolean;
}

/**
 * Create writes each confirmed fact ONCE through saveKeptFacts: a confirmed value the facts agent also found
 * (same fact, however formatted) upgrades that planned row to `confirmed`; only the rest is returned to be
 * written by the caller, each with its found-by mandate.
 */
export function mergeConfirmedIntoPlan(
  plan: KeptFactPlan,
  confirmed: ConfirmedContactFact[],
): { plan: KeptFactPlan; remaining: ConfirmedContactFact[] } {
  const rows = plan.rows.map((r) => ({ ...r }));
  const remaining: ConfirmedContactFact[] = [];
  const claimed = new Set<string>();
  for (const c of confirmed) {
    const id = factIdentity(c.kind, c.value);
    const hit = rows.find((r) => r.kind && factIdentity(r.kind, r.fact.value) === id);
    if (hit) {
      hit.decision = "confirmed";
      hit.metadata = { ...hit.metadata, decision: "confirmed" };
      continue;
    }
    if (claimed.has(id)) continue;
    claimed.add(id);
    remaining.push(c);
  }
  return { plan: { ...plan, rows }, remaining };
}

function provenance(fact: BrandFact, decision: FactDecision): Record<string, Json> {
  return {
    found_by: fact.mandate ?? FACTS_FOUND_BY,
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
): Promise<{ problems: string[]; factIds: string[]; offeringIds: string[] }> {
  const problems: string[] = [];
  const db = await authenticatedWebDb(supabase);
  const now = new Date().toISOString();
  const factRows = plan.rows.filter((r) => r.kind);
  const factIdByKey = new Map<string, string>();
  if (factRows.length) {
    const res = await db
      .from("business_fact")
      .insert(
        factRows.map((r) => ({
          organization_id: organizationId,
          brand_id: brandId,
          kind: r.kind as string,
          label: factDisplayLabel(r.fact.field_label, r.fact.value) || r.fact.field_label,
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
          found_by: r.fact.mandate ?? FACTS_FOUND_BY,
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
