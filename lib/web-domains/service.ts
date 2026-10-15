/**
 * Known web domains — the reads and the one write (the learning loop's observation).
 *
 * Reads: `web.domain_categories_snapshot()` once, cached in memory (CACHE_MS mirrors the
 * `web_domains.cache_seconds` knob); a failed read throws.
 * Write: `web.record_domain_observation` — the database learns on that write (agreeing, independent
 * observations add a host as learned; conflicts become admin proposals on the attention dock).
 *
 * Doc: common-docs/systems/platform/known-web-domains/FEATURE.md
 */

import { supabase } from "@/utils/supabase/client";
import { setLiveKnownDomainRules, type KnownDomainRule } from "./registry";

const PROVENANCES = new Set(["seeded", "learned", "pattern", "admin_approved"]);
/** Matches the seeded `web_domains.cache_seconds` knob (300). */
const CACHE_MS = 300_000;

let cache: { at: number; rules: KnownDomainRule[] } | null = null;
let inflight: Promise<KnownDomainRule[]> | null = null;

/** Every active known-domain rule (cached). A failed read throws: silence would read as "no known sites". */
export async function fetchKnownDomainRules(): Promise<KnownDomainRule[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.rules;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase.schema("web").rpc("domain_categories_snapshot");
    if (error) throw new Error(`Known web domains could not be read: ${error.message}`);
    const rules: KnownDomainRule[] = (data ?? []).map((r) => ({
      host: r.host,
      pathPattern: r.path_pattern ?? "",
      category: r.category,
      provenance: (PROVENANCES.has(r.provenance) ? r.provenance : "seeded") as KnownDomainRule["provenance"],
      confidence: Number(r.confidence),
      label: r.label ?? "",
    }));
    cache = { at: Date.now(), rules };
    setLiveKnownDomainRules(rules);
    return rules;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** Where an observation came from. */
export type DomainObservationSource = "person_answer" | "web_result_classifier" | "we_think" | "person_path_tier";

export interface DomainObservationResult {
  outcome: "observed" | "proposed" | "learned" | "known" | "rejected_before" | "ignored";
  host?: string;
}

/**
 * Record that `source` classified `url` as `category` in `organizationId`'s work. Learning happens in the
 * database on this write. Never blocks the answer it describes: callers fire and forget, and a failure is
 * reported to the console as an error (the answer itself is already saved elsewhere).
 */
export async function recordDomainObservation(
  organizationId: string,
  url: string,
  category: string,
  source: DomainObservationSource,
  sourceRef?: string,
): Promise<DomainObservationResult | null> {
  const { data, error } = await supabase.schema("web").rpc("record_domain_observation", {
    p_organization_id: organizationId,
    p_url: url,
    p_category: category,
    p_source: source,
    p_source_ref: sourceRef,
  });
  if (error) {
    console.error(`[known-web-domains] observation ${category} for ${url} failed: ${error.message}`);
    return null;
  }
  const out = (data ?? null) as { outcome?: DomainObservationResult["outcome"]; host?: string } | null;
  if (out?.outcome === "learned") cache = null;
  return out?.outcome ? { outcome: out.outcome, host: out.host } : null;
}

/** An open proposal for a platform admin (attention dock). */
export interface DomainProposal {
  id: string;
  host: string;
  category: string;
  categoryLabel: string;
  provenance: string;
  confidence: number;
  evidenceCount: number;
  note: string | null;
  createdAt: string;
  sources: string[];
  organizations: number;
}

export async function fetchDomainProposals(): Promise<DomainProposal[]> {
  const { data, error } = await supabase.schema("web").rpc("domain_proposals_for_attention");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    host: r.host,
    category: r.category,
    categoryLabel: r.category_label,
    provenance: r.provenance,
    confidence: Number(r.confidence),
    evidenceCount: r.evidence_count,
    note: r.note,
    createdAt: r.created_at,
    sources: r.sources ?? [],
    organizations: r.organizations,
  }));
}

export async function decideDomainProposal(id: string, approve: boolean): Promise<void> {
  const { error } = await supabase.schema("web").rpc("decide_domain_proposal", { p_id: id, p_approve: approve });
  if (error) throw new Error(error.message);
  cache = null;
}
