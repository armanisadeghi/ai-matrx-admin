/**
 * Undo without poisoned data (common-docs smart-add-brand/UNDO.md).
 *
 * A person's decision ("this account is ours", "this site is ours") pulls things in: tracking, captured
 * posts, crawls, facts learned from it, findings. Undoing it must take all of that back, never just the one
 * row. `web.decision_retraction` is the one door: `apply: false` previews exactly what `apply: true`
 * retracts (same queries), so the confirm shows the real consequence.
 *
 * Root: the decision itself (`web.discovered_item`), or a brand-page property/site (its decision, if any,
 * is found by the server). Soft-delete only, one shared timestamp, audit on the decision.
 */

import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb } from "@/utils/supabase/webDb";

export type RetractionRootType = "decision" | "property" | "site";

export interface RetractionSummary {
  root: { type: RetractionRootType; id: string };
  decision_id: string | null;
  brand_id: string;
  label: string | null;
  url: string | null;
  accounts: number;
  sites: number;
  tracking: number;
  posts: number;
  pages: number;
  crawls_cancelled: number;
  runs_cancelled: number;
  facts_retracted: number;
  facts_weakened: number;
  findings_retracted: number;
  findings_rechecked: number;
  people_unlinked: number;
  snapshots_stale: number;
  exclusion: { match_kind: string; match_value: string } | null;
  applied: boolean;
  exclusion_id?: string | null;
}

async function call(
  rootType: RetractionRootType,
  rootId: string,
  apply: boolean,
  exclude: boolean,
): Promise<RetractionSummary> {
  const { data, error } = await (await authenticatedWebDb(supabase)).rpc("decision_retraction", {
    p_root_type: rootType,
    p_root_id: rootId,
    p_apply: apply,
    p_exclude: exclude,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object") throw new Error("The undo returned nothing");
  return data as unknown as RetractionSummary;
}

/** What undoing this takes back — nothing is changed. */
export function previewRetraction(rootType: RetractionRootType, rootId: string, exclude = true) {
  return call(rootType, rootId, false, exclude);
}

/** Take it back: everything the preview listed, plus "Not us" when `exclude`. */
export function applyRetraction(rootType: RetractionRootType, rootId: string, exclude = true) {
  return call(rootType, rootId, true, exclude);
}

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** The consequence, as short parts: "1 account", "36 posts", "12 facts learned from it". */
export function retractionParts(s: RetractionSummary): string[] {
  const parts: string[] = [];
  if (s.accounts) parts.push(plural(s.accounts, "account"));
  if (s.sites) parts.push(plural(s.sites, "website"));
  if (s.posts) parts.push(plural(s.posts, "post"));
  if (s.pages) parts.push(plural(s.pages, "page"));
  if (s.facts_retracted) parts.push(`${plural(s.facts_retracted, "fact")} learned from it`);
  if (s.findings_retracted) parts.push(plural(s.findings_retracted, "finding"));
  if (s.people_unlinked) parts.push(plural(s.people_unlinked, "person", "people"));
  return parts;
}

/** What stays but is re-checked or stopped. */
export function retractionAlso(s: RetractionSummary): string[] {
  const also: string[] = [];
  if (s.facts_weakened) also.push(`re-checks ${plural(s.facts_weakened, "fact")} with other sources`);
  if (s.findings_rechecked) also.push(`re-checks ${plural(s.findings_rechecked, "suggestion")}`);
  if (s.crawls_cancelled + s.runs_cancelled) also.push(`stops ${plural(s.crawls_cancelled + s.runs_cancelled, "running job")}`);
  if (s.snapshots_stale) also.push(`marks ${plural(s.snapshots_stale, "agent input")} stale`);
  return also;
}
