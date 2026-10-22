/**
 * Products & services — reads and writes (PRODUCTS.md § 4–§ 6, aidream `services/brand_offerings`).
 *
 * Reads, direct to Supabase:
 * - `web.brand_offering` (status active): the kept offerings — always on the list. One is CONFIRMED only when a
 *   person validated it (`web.person_validated_offering_ids`, the ONE rule aidream `person_validated_offerings`
 *   reads too: a person-confirmed finding names it, a person-confirmed fact minted it, or a person inserted it — a
 *   test/agent seat is never a person). Every other kept offering shows "not confirmed" with Yes / No.
 * - `web.discovered_item` (category `offering`): one row per (item, url) the run staged; `value.key` is the item,
 *   `context` holds the candidate, its verbatim quotes with source family, the computed certainty and the group
 *   the grouping step filed it under.
 * - `mandate.provision_snapshot` point `brand_offerings.after_core`: the newest capture's coverage verdict, size
 *   claims and reader checks.
 * - `workflow.run` of the `smart_add_brand_offerings` system run for this brand: the run to watch.
 *
 * Writes: Yes → `web.brand_offering` (+ every row of the item `confirmed`, `resolved_offering_id`; a kept offering
 * with no finding gets one person-reviewed finding naming it, so the Yes is on record);
 * No → `web.brand_exclusion` (name match, never returns) + rows `dismissed`. Every answer names the person
 * (`reviewed_at` + `reviewed_by` = the signed-in person; a cleared answer clears both): the person-only readers
 * (aidream `person_validated_offerings`) and the DB triggers (`web._stance_follows_kept_offering`,
 * `web._offering_no_withdraws_stances`) act only on an answer that names who gave it.
 */

import { supabase } from "@/utils/supabase/client";
import { signedInPersonId } from "@/utils/supabase/webDb";
import type { Json } from "@/types/database.types";

export type Certainty = "confirmed" | "likely" | "possible";

export interface OfferingQuote {
  source: string;
  family: string;
  url: string | null;
  quote: string;
  addressOnly: boolean;
}

/** A kept offering a past defect may have wrongly minted (`metadata.contamination_review`): a person confirms or retires it. */
export interface OfferingReview {
  /** One plain line: why this row needs a look. */
  reason: string;
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
  review: OfferingReview | null;
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

export interface DiscoveredOfferingRow {
  id: string;
  value: unknown;
  context: unknown;
  status: string | null;
  resolved_offering_id: string | null;
}

export interface KeptOfferingRow {
  id: string;
  name: string;
  kind: string;
  price_note: string | null;
  metadata: unknown;
}

const REVIEW_REASON: Record<string, string> = {
  not_offered_ruling: "An earlier site check said this brand does not offer it.",
  foreign_tier_placement_only: "Added from a shared topic nobody here chose.",
};

/** The flag a past defect left on a kept offering, as the one line the person reads; null when it carries none. */
export function reviewOf(metadata: unknown): OfferingReview | null {
  const flag = obj(obj(metadata).contamination_review);
  if (!Object.keys(flag).length) return null;
  return { reason: REVIEW_REASON[str(flag.reason) ?? ""] ?? str(flag.why) ?? "Added automatically; please confirm it is yours." };
}

/** One spelling for "the same item": case, punctuation and a plural ending never split it. */
export function offeringMatchKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
    .join(" ");
}

const CERTAINTY_RANK: Record<Certainty, number> = { confirmed: 3, likely: 2, possible: 1 };

/**
 * The screen's one list: the run's staged findings (`web.discovered_item`) merged with the brand's kept
 * offerings (`web.brand_offering`). A kept offering is always ON the list — the facts step and the promotion write
 * offerings straight to `brand_offering`, so a screen reading only the staged rows showed "Found 0" beside kept
 * products (Creativity Warehouse, 2026-10-16) — but it is CONFIRMED only when its id is in `personValidated`
 * (`web.person_validated_offering_ids`). A code-minted offering, or a row a job or a test seat marked confirmed, is
 * "not confirmed" and keeps its Yes / No (REVIEW2: 63 code-made offerings could be answered No but never Yes).
 */
export function buildOfferingItems(
  rows: DiscoveredOfferingRow[],
  kept: KeptOfferingRow[],
  personValidated: ReadonlySet<string> = new Set(),
): OfferingItem[] {
  const byKey = new Map<string, OfferingItem>();
  for (const row of rows) {
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
      review: null,
    };
    item.quotes.push(...quotes);
    item.rowIds.push(row.id);
    item.families = [...new Set([...item.families, ...quotes.filter((q) => !q.addressOnly).map((q) => q.family)])];
    item.group = item.group ?? str(ctx.group);
    // A row's own `confirmed` is not the brand's word: only a person-validated offering is (below).
    if (row.status === "dismissed") item.status = "dismissed";
    item.offeringId = item.offeringId ?? row.resolved_offering_id ?? null;
    item.byReader = item.byReader || quotes.some((q) => q.source.startsWith("reader_"));
    const c = (str(ctx.certainty) as Certainty) ?? "possible";
    if (CERTAINTY_RANK[c] > CERTAINTY_RANK[item.certainty]) item.certainty = c;
    byKey.set(key, item);
  }

  const items = [...byKey.values()];
  const byOfferingId = new Map(items.filter((i) => i.offeringId).map((i) => [i.offeringId as string, i]));
  const byMatch = new Map<string, OfferingItem>();
  for (const i of items) {
    byMatch.set(offeringMatchKey(i.key), i);
    byMatch.set(offeringMatchKey(i.name), i);
  }
  for (const o of kept) {
    const linked = byOfferingId.get(o.id) ?? byMatch.get(offeringMatchKey(o.name));
    const meta = obj(o.metadata);
    const byPerson = personValidated.has(o.id);
    if (linked) {
      // Active and person-validated: confirmed. Active but nobody's word: open again, whatever a row says.
      linked.status = byPerson ? "confirmed" : "pending";
      linked.offeringId = linked.offeringId ?? o.id;
      if (byPerson) linked.certainty = "confirmed";
      linked.review = reviewOf(meta);
      continue;
    }
    const urls = Array.isArray(meta.evidence_urls) ? meta.evidence_urls.filter((u): u is string => typeof u === "string") : [];
    const reason = str(meta.reason);
    const family = str(meta.step) === "facts" ? "own_site" : (str(meta.found_by) ?? "kept");
    const item: OfferingItem = {
      key: `offering:${o.id}`,
      name: o.name,
      kind: o.kind === "product" ? "product" : "service",
      priceText: o.price_note,
      group: str(meta.group),
      sourceGroups: [],
      certainty: byPerson ? "confirmed" : "likely",
      families: [family],
      quotes: (urls.length ? urls : [null]).map((url) => ({
        source: str(meta.found_by) ?? "brand_offering",
        family,
        url,
        quote: reason ?? o.name,
        addressOnly: false,
      })),
      rowIds: [],
      status: byPerson ? "confirmed" : "pending",
      offeringId: o.id,
      byReader: false,
      review: reviewOf(meta),
    };
    items.push(item);
    byMatch.set(offeringMatchKey(o.name), item);
  }
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

/** The brand's active offerings a PERSON validated — the one rule, in the database (aidream reads the same function). */
export async function fetchPersonValidatedOfferingIds(brandId: string): Promise<Set<string>> {
  const { data, error } = await supabase.schema("web").rpc("person_validated_offering_ids", { p_brand_id: brandId });
  if (error) throw new Error(`Which products and services are confirmed could not be read: ${error.message}`);
  return new Set((data ?? []).map(String));
}

export async function fetchOfferingItems(brandId: string): Promise<OfferingItem[]> {
  const [found, kept, validated] = await Promise.all([
    supabase
      .schema("web")
      .from("discovered_item")
      .select("id, value, context, status, resolved_offering_id")
      .eq("brand_id", brandId)
      .eq("category", "offering")
      .is("deleted_at", null)
      .limit(5000),
    supabase
      .schema("web")
      .from("brand_offering")
      .select("id, name, kind, price_note, metadata")
      .eq("brand_id", brandId)
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(5000),
    fetchPersonValidatedOfferingIds(brandId),
  ]);
  if (found.error) throw new Error(`Products and services could not be read: ${found.error.message}`);
  if (kept.error) throw new Error(`Kept products and services could not be read: ${kept.error.message}`);
  return buildOfferingItems(found.data ?? [], kept.data ?? [], validated);
}

export async function fetchOfferingsVerdict(brandId: string): Promise<OfferingsVerdict> {
  // The screen reads `coverage.screen` only: the capture's provision values stay on the server (aidream
  // brand_offerings/run.py, the used-keys guarantee, 2026-10-16).
  const { data, error } = await supabase
    .schema("mandate")
    .from("provision_snapshot")
    .select("id, created_at, coverage")
    .eq("subject_id", brandId)
    .eq("point_key", "brand_offerings.after_core")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(`The coverage verdict could not be read: ${error.message}`);
  const row = data?.[0];
  const screen = obj(obj(row?.coverage).screen);
  const draft = obj(screen.verdict);
  const claims = Array.isArray(screen.scope_claims) ? screen.scope_claims : [];
  const checks = obj(screen.checks);
  return {
    verdict: (str(draft.verdict) as OfferingsVerdict["verdict"]) ?? null,
    line: str(draft.line),
    actions: Array.isArray(draft.actions)
      ? draft.actions.map((a) => (typeof a === "string" ? a : str(obj(a).label) ?? "")).filter(Boolean)
      : [],
    scopeClaims: claims.map((c) => ({
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
  // archived-items-law-exempt: lineage lookup of the run definition's ids by name — the newest run is wanted even if its definition was archived
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
  const reviewedBy = await signedInPersonId(supabase);
  if (!item.rowIds.length) {
    // A kept offering with no finding: the person's Yes is recorded as one reviewed finding naming it — the same
    // record every other Yes leaves, which `web.person_validated_offering_ids` and the stance trigger read.
    const ins = await supabase
      .schema("web")
      .from("discovered_item")
      .insert({
        organization_id: brand.organizationId,
        brand_id: brand.id,
        source: "brand_offerings.person_answer",
        category: "offering",
        value: { key: offeringMatchKey(item.name) } as unknown as Json,
        context: { candidate: { key: offeringMatchKey(item.name), name: item.name, kind: item.kind } } as unknown as Json,
        status: "confirmed",
        resolved_offering_id: offeringId,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewedBy,
      });
    if (ins.error) throw new Error(`Could not mark "${item.name}" kept: ${ins.error.message}`);
    return offeringId;
  }
  const upd = await supabase
    .schema("web")
    .from("discovered_item")
    .update({
      status: "confirmed",
      resolved_offering_id: offeringId,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
    })
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
  if (item.offeringId) {
    // A kept offering answered No leaves the brand's list (retired, never deleted).
    const ret = await supabase.schema("web").from("brand_offering").update({ status: "retired" }).eq("id", item.offeringId);
    if (ret.error) throw new Error(`Could not retire "${item.name}": ${ret.error.message}`);
  }
  if (!item.rowIds.length) return;
  const upd = await supabase
    .schema("web")
    .from("discovered_item")
    .update({ status: "dismissed", reviewed_at: new Date().toISOString(), reviewed_by: await signedInPersonId(supabase) })
    .in("id", item.rowIds);
  if (upd.error) throw new Error(`Could not mark "${item.name}" rejected: ${upd.error.message}`);
}

/** Undo a decision: back to undecided (a kept offering stays; its rows are pending again). */
export async function clearDecision(item: OfferingItem): Promise<void> {
  if (!item.rowIds.length) return;
  const upd = await supabase
    .schema("web")
    .from("discovered_item")
    .update({ status: "pending", reviewed_at: null, reviewed_by: null })
    .in("id", item.rowIds);
  if (upd.error) throw new Error(`Could not clear "${item.name}": ${upd.error.message}`);
}

/**
 * Keep a flagged offering: the flag is cleared and who kept it, and when, is recorded on the offering.
 * ("Not ours" is `rejectOffering`: it retires the offering through the same path as any No.)
 */
export async function keepFlaggedOffering(item: OfferingItem): Promise<void> {
  if (!item.offeringId) return;
  const { data: auth } = await supabase.auth.getUser();
  const cur = await supabase.schema("web").from("brand_offering").select("metadata").eq("id", item.offeringId).single();
  if (cur.error) throw new Error(`Could not read "${item.name}": ${cur.error.message}`);
  const { contamination_review: flag, ...rest } = obj(cur.data.metadata);
  const upd = await supabase
    .schema("web")
    .from("brand_offering")
    .update({
      metadata: {
        ...rest,
        contamination_review_kept: { by: auth.user?.id ?? null, at: new Date().toISOString(), flag: flag ?? null },
      } as unknown as Json,
    })
    .eq("id", item.offeringId);
  if (upd.error) throw new Error(`Could not keep "${item.name}": ${upd.error.message}`);
}
