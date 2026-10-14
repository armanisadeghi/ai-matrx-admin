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

import type { Json } from "@/types/database.types";
import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb } from "@/utils/supabase/webDb";

/** `logo`: the brand's current logo (root id = the brand id): brand.logo_url plus its primary logo assets. */
export type RetractionRootType = "decision" | "property" | "site" | "logo";

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
  /** Root `logo`: primary logo assets taken, and the logo address. */
  assets?: number;
  logo_url?: string | null;
  applied: boolean;
  /** Set on apply: the shared timestamp every taken row carries (restore matches it exactly). */
  at?: string;
  exclusion_id?: string | null;
  exclusion_added?: boolean;
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
export async function applyRetraction(rootType: RetractionRootType, rootId: string, exclude = true) {
  const summary = await call(rootType, rootId, true, exclude);
  // A decision keeps its own summary (context.retraction). A removal with no earlier decision (a brand-page
  // remove, an enrich removal) has no decision row, so the summary is kept on the "Not us" entry it created:
  // the brand page's Not us row can then Undo it after the person has left the screen.
  if (summary.exclusion_id) {
    try {
      await stashRetraction(summary.exclusion_id, summary);
    } catch (error) {
      // The removal itself succeeded; only the later Undo from the brand page is lost.
      console.error("Could not keep the undo for this removal", error);
    }
  }
  return summary;
}

/** Keep an applied summary on its web.brand_exclusion row (context.retraction). */
async function stashRetraction(exclusionId: string, summary: RetractionSummary): Promise<void> {
  const db = await authenticatedWebDb(supabase);
  const { data, error } = await db.from("brand_exclusion").select("context").eq("id", exclusionId).single();
  if (error) throw new Error(error.message);
  const context = data.context && typeof data.context === "object" && !Array.isArray(data.context) ? data.context : {};
  const { error: writeError } = await db
    .from("brand_exclusion")
    .update({ context: { ...context, retraction: summary as unknown as Json } })
    .eq("id", exclusionId);
  if (writeError) throw new Error(writeError.message);
}

/** The applied summary kept on a Not us entry, when its removal can still be restored. */
export function retractionFromContext(context: unknown): RetractionSummary | null {
  if (!context || typeof context !== "object" || Array.isArray(context)) return null;
  const r = (context as Record<string, unknown>).retraction;
  if (!r || typeof r !== "object") return null;
  const s = r as RetractionSummary;
  return s.applied && s.at && s.brand_id && s.root?.id ? s : null;
}

/** After a restore, an entry that stays on the NO LIST (it existed before) no longer offers Undo. */
export async function clearStashedRetraction(exclusionId: string): Promise<void> {
  const db = await authenticatedWebDb(supabase);
  const { data } = await db.from("brand_exclusion").select("context").eq("id", exclusionId).is("deleted_at", null).maybeSingle();
  if (!data) return;
  const context = data.context && typeof data.context === "object" && !Array.isArray(data.context) ? { ...(data.context as Record<string, Json>) } : {};
  delete context.retraction;
  await db.from("brand_exclusion").update({ context }).eq("id", exclusionId);
}

/**
 * Bring back exactly what an apply took (`web.decision_retraction_restore`): the rows carrying the apply's
 * shared timestamp, the decision's earlier answer, and the NO LIST entry the apply added is lifted.
 * Weakened facts keep their trimmed evidence; cancelled jobs stay cancelled (the next ingest re-runs them).
 */
export async function restoreRetraction(summary: RetractionSummary): Promise<Record<string, unknown>> {
  if (!summary.applied || !summary.at) throw new Error("Only an applied undo can be restored");
  const { data, error } = await (await authenticatedWebDb(supabase)).rpc("decision_retraction_restore", {
    p_summary: summary as unknown as Json,
  });
  if (error) throw new Error(error.message);
  return (data ?? {}) as Record<string, unknown>;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** The consequence, as short parts: "1 account", "36 posts", "12 facts learned from it". */
export function retractionParts(s: RetractionSummary): string[] {
  const parts: string[] = [];
  if (s.accounts) parts.push(plural(s.accounts, "account"));
  if (s.sites) parts.push(plural(s.sites, "website"));
  if (s.root.type === "logo") parts.push("the logo");
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
