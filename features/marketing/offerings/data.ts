/**
 * Products & services — reads and writes (PRODUCTS.md § 4–§ 6, aidream `services/brand_offerings`).
 *
 * Reads, direct to Supabase:
 * - `web.discovered_item` (category `offering`): one row per (item, url) the run staged; `value.key` is the item,
 *   `context` holds the candidate, its verbatim quotes with source family, the computed certainty and the group
 *   the grouping step filed it under.
 * - `mandate.provision_snapshot` point `brand_offerings.after_core`: the newest capture's coverage verdict, size
 *   claims and reader checks.
 * - `workflow.run` of the `smart_add_brand_offerings` system run for this brand: the run to watch.
 *
 * Writes: Yes → `web.brand_offering` (+ every row of the item `confirmed`, `resolved_offering_id`);
 * No → `web.brand_exclusion` (name match, never returns) + rows `dismissed`.
 */

import { supabase } from "@/utils/supabase/client";
import type { Json } from "@/types/database.types";

export type Certainty = "confirmed" | "likely" | "possible";

export interface OfferingQuote {
  source: string;
  family: string;
  url: string | null;
  quote: string;
  addressOnly: boolean;
}

export interface OfferingItem {
  key: string;
  name: string;
  kind: "product" | "service";
  priceText: string | null;
  group: string | null;
  sourceGroups: string[];
  certainty: Certainty;
  families: string[];
  quotes: OfferingQuote[];
  rowIds: string[];
  status: "pending" | "confirmed" | "dismissed";
  offeringId: string | null;
  byReader: boolean;
}

export interface OfferingsVerdict {
  verdict: "complete" | "more_exists" | "cant_tell" | null;
  line: string | null;
  actions: string[];
  scopeClaims: { quote: string; url: string; count: number | null }[];
  checks: Record<string, { calls: number; answered: number; kept: number; dropped: Record<string, number> }>;
  snapshotId: string | null;
  capturedAt: string | null;
}

export interface OfferingsRun {
  id: string;
  status: string;
  createdAt: string;
}

const RUN_DEFINITION_NAME = "smart_add_brand_offerings";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export async function fetchOfferingItems(brandId: string): Promise<OfferingItem[]> {
  const { data, error } = await supabase
    .schema("web")
    .from("discovered_item")
    .select("id, guessed_kind, url, value, context, status, source, resolved_offering_id")
    .eq("brand_id", brandId)
    .eq("category", "offering")
    .is("deleted_at", null)
    .limit(5000);
  if (error) throw new Error(`Products and services could not be read: ${error.message}`);
  const byKey = new Map<string, OfferingItem>();
  for (const row of data ?? []) {
    const key = str(obj(row.value).key);
    if (!key) continue;
    const ctx = obj(row.context);
    const cand = obj(ctx.candidate);
    const quotes: OfferingQuote[] = (Array.isArray(ctx.quotes) ? ctx.quotes : []).map((q) => {
      const o = obj(q);
      return {
        source: str(o.source) ?? "",
        family: str(o.family) ?? "",
        url: str(o.url),
        quote: str(o.quote) ?? "",
        addressOnly: o.address_only === true,
      };
    });
    const item = byKey.get(key) ?? {
      key,
      name: str(cand.name) ?? key,
      kind: cand.kind === "product" ? "product" : "service",
      priceText: str(cand.price_text),
      group: str(ctx.group),
      sourceGroups: Array.isArray(cand.groups) ? cand.groups.filter((g): g is string => typeof g === "string") : [],
      certainty: (str(ctx.certainty) as Certainty) ?? "possible",
      families: [],
      quotes: [],
      rowIds: [],
      status: "pending",
      offeringId: null,
      byReader: false,
    };
    item.quotes.push(...quotes);
    item.rowIds.push(row.id);
    item.families = [...new Set([...item.families, ...quotes.filter((q) => !q.addressOnly).map((q) => q.family)])];
    item.group = item.group ?? str(ctx.group);
    if (row.status === "confirmed") item.status = "confirmed";
    else if (row.status === "dismissed" && item.status !== "confirmed") item.status = "dismissed";
    item.offeringId = item.offeringId ?? row.resolved_offering_id ?? null;
    item.byReader = item.byReader || quotes.some((q) => q.source.startsWith("reader_"));
    const rank: Record<Certainty, number> = { confirmed: 3, likely: 2, possible: 1 };
    const c = (str(ctx.certainty) as Certainty) ?? "possible";
    if (rank[c] > rank[item.certainty]) item.certainty = c;
    byKey.set(key, item);
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchOfferingsVerdict(brandId: string): Promise<OfferingsVerdict> {
  const { data, error } = await supabase
    .schema("mandate")
    .from("provision_snapshot")
    .select("id, created_at, coverage, provision_values")
    .eq("subject_id", brandId)
    .eq("point_key", "brand_offerings.after_core")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(`The coverage verdict could not be read: ${error.message}`);
  const row = data?.[0];
  const values = new Map<string, unknown>(
    (Array.isArray(row?.provision_values) ? row.provision_values : []).map((v) => [str(obj(v).name) ?? "", obj(v).value]),
  );
  const draft = obj(values.get("coverage_verdict_draft"));
  const claims = obj(values.get("scope_claims"));
  const checks = obj(values.get("reader_checks"));
  return {
    verdict: (str(draft.verdict) as OfferingsVerdict["verdict"]) ?? null,
    line: str(draft.line),
    actions: Array.isArray(draft.actions)
      ? draft.actions.map((a) => (typeof a === "string" ? a : str(obj(a).label) ?? "")).filter(Boolean)
      : [],
    scopeClaims: (Array.isArray(claims.items) ? claims.items : []).map((c) => ({
      quote: str(obj(c).quote) ?? "",
      url: str(obj(c).url) ?? "",
      count: typeof obj(c).count === "number" ? (obj(c).count as number) : null,
    })),
    checks: checks as OfferingsVerdict["checks"],
    snapshotId: row?.id ?? null,
    capturedAt: row?.created_at ?? null,
  };
}

/** The newest products-and-services run for the brand (to watch while it goes). */
export async function fetchLatestOfferingsRun(brandId: string): Promise<OfferingsRun | null> {
  const defs = await supabase.schema("workflow").from("definition").select("id").eq("name", RUN_DEFINITION_NAME).limit(5);
  if (defs.error) throw new Error(`The run could not be read: ${defs.error.message}`);
  const ids = (defs.data ?? []).map((d) => d.id);
  if (!ids.length) return null;
  const { data, error } = await supabase
    .schema("workflow")
    .from("run")
    .select("id, status, created_at")
    .in("definition_id", ids)
    .eq("input->>brand_id", brandId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(`The run could not be read: ${error.message}`);
  const r = data?.[0];
  return r ? { id: r.id, status: r.status, createdAt: r.created_at } : null;
}

/** Every provision snapshot of a run: one per AI call (the Builder panel opens each). */
export async function fetchRunSnapshots(runId: string): Promise<{ id: string; pointKey: string; label: string }[]> {
  const { data, error } = await supabase
    .schema("mandate")
    .from("provision_snapshot")
    .select("id, point_key, point_label")
    .eq("run_id", runId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(`The run's inputs could not be read: ${error.message}`);
  return (data ?? []).map((s) => ({ id: s.id, pointKey: s.point_key, label: s.point_label ?? s.point_key }));
}

function slugOf(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "item";
}

/** Yes: keep the item as one of the brand's offerings, with its evidence summary. */
export async function keepOffering(brand: { id: string; organizationId: string }, item: OfferingItem): Promise<string> {
  let offeringId = item.offeringId;
  if (!offeringId) {
    const { data, error } = await supabase
      .schema("web")
      .from("brand_offering")
      .insert({
        organization_id: brand.organizationId,
        brand_id: brand.id,
        name: item.name,
        slug: `${slugOf(item.name)}-${item.key.slice(0, 6).replace(/[^a-z0-9]/g, "")}`,
        kind: item.kind,
        status: "active",
        price_note: item.priceText,
        metadata: {
          found_by: "brand_offerings",
          certainty: item.certainty,
          families: item.families,
          quote_count: item.quotes.length,
          group: item.group,
          evidence_urls: [...new Set(item.quotes.map((q) => q.url).filter(Boolean))].slice(0, 10),
          decided: { answer: "yes", at: new Date().toISOString() },
        } as unknown as Json,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Could not keep "${item.name}": ${error.message}`);
    offeringId = data.id;
  }
  const upd = await supabase
    .schema("web")
    .from("discovered_item")
    .update({ status: "confirmed", resolved_offering_id: offeringId })
    .in("id", item.rowIds);
  if (upd.error) throw new Error(`Could not mark "${item.name}" kept: ${upd.error.message}`);
  return offeringId;
}

/** No: never ours (an exclusion by name, so a later run never offers it again). */
export async function rejectOffering(brand: { id: string; organizationId: string }, item: OfferingItem): Promise<void> {
  const ins = await supabase.schema("web").from("brand_exclusion").insert({
    organization_id: brand.organizationId,
    brand_id: brand.id,
    match_kind: "name",
    match_value: item.name.trim().toLowerCase(),
    label: item.name,
    relation_key: "not_us",
    source: "brand_offerings",
    context: { from: "brand_offerings.review", key: item.key, at: new Date().toISOString() } as unknown as Json,
  });
  if (ins.error && ins.error.code !== "23505") throw new Error(`Could not reject "${item.name}": ${ins.error.message}`);
  const upd = await supabase.schema("web").from("discovered_item").update({ status: "dismissed" }).in("id", item.rowIds);
  if (upd.error) throw new Error(`Could not mark "${item.name}" rejected: ${upd.error.message}`);
}

/** Undo a decision: back to undecided (a kept offering stays; its rows are pending again). */
export async function clearDecision(item: OfferingItem): Promise<void> {
  const upd = await supabase.schema("web").from("discovered_item").update({ status: "pending" }).in("id", item.rowIds);
  if (upd.error) throw new Error(`Could not clear "${item.name}": ${upd.error.message}`);
}
