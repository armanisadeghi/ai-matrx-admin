/**
 * Smart Add validation — the Answered tray from SAVED data (MKT-137). Every answer is written to the finding's
 * `web.discovered_item` (status, relation, `context.answer` with the homes it wrote and what it replaced), so a reload
 * or a return visit lists the brand's earlier answers again, latest first, each with the same Undo as in-session.
 */

import type { Json } from "@/types/database.types";
import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb } from "@/utils/supabase/webDb";
import {
  deleteBrandAsset,
  deleteBusinessFact,
  deleteProperty,
  getBrand,
  updateBrand,
  type BrandRelationKind,
} from "@/features/marketing/data/service";
import { associationsService } from "@/features/scopes/service/associationsService";
import { restoreRetraction, withdrawSite, type RetractionSummary } from "@/features/marketing/data/retraction";
import { isJsonRecord, type MarketingBrand } from "@/features/marketing/types";
import type { EvidenceItem } from "../evidence";
import type { SuggestContext } from "../webKinds";
import { fromRow, type SavedRow } from "./fromSaved";
import { focusFromEvidence, focusFromFact, type Answer, type BrandFact, type FocusItem } from "./queue";
import { PROMOTED_TYPES, undoPromotion, type PromotedFindingType } from "../promote";
import type { Persisted } from "./persist";
import { logoLabel } from "./fold";

export interface SavedAnswer {
  id: string;
  item: FocusItem;
  answer: Answer;
  relationLabel: string | null;
  value: string;
  persisted: Persisted;
}

export interface SavedAnswers {
  entries: SavedAnswer[];
  items: EvidenceItem[];
  facts: BrandFact[];
}

/**
 * Where an answer was given that the tray lists: the validation page AND Create (an account or website answered Yes at
 * Create is recorded through the same writer, `persistAnswer(... { created })`, from "smart_add.create"). A Create answer
 * left out could be neither seen nor undone here (2026-10-22). Undo is the same path for both: the homes the answer
 * names (Create's property / site) are taken back, then the finding goes back to pending.
 */
export const ANSWERED_FROM = ["smart_add.validate", "smart_add.create"] as const;

const ANSWERS: ReadonlySet<string> = new Set(["preferred", "ours", "alias", "not_us", "related", "correct", "wrong", "ignore"]);

const rec = (j: Json | null | undefined): Record<string, Json | undefined> => (isJsonRecord(j) ? (j as Record<string, Json | undefined>) : {});

async function db() {
  return authenticatedWebDb(supabase);
}

/** Take back every home an answer wrote (newest first), then put the finding back to pending. */
async function undoSaved(brandId: string, rowIds: string[], leadId: string, answer: Record<string, Json | undefined>, kinds: BrandRelationKind[], relationKey: string | null) {
  const homes = Array.isArray(answer.homes) ? answer.homes.filter((h): h is string => typeof h === "string") : [];
  const before = rec(answer.before as Json);
  // What the server's promotion created for this answer (a competitor, a person's link, a listing, a backlink …),
  // recorded on the row when it was made: taken back first, and only exactly those rows.
  const promoted = rec(answer.promoted as Json);
  const created = Object.fromEntries(
    PROMOTED_TYPES.map((t) => [t, Array.isArray(promoted[t]) ? (promoted[t] as Json[]).filter((id): id is string => typeof id === "string") : []]),
  ) as Record<PromotedFindingType, string[]>;
  await undoPromotion(created);
  // Homes that were on the brand before the answer (an unconfirmed account / website confirmed on the page) stay.
  const kept = new Set(Array.isArray(answer.kept) ? answer.kept.filter((h): h is string => typeof h === "string") : []);
  for (const home of [...homes].reverse()) {
    if (kept.has(home)) continue;
    const [table, id] = [home.slice(0, home.indexOf(":")), home.slice(home.indexOf(":") + 1)];
    if (table === "web.property") await deleteProperty(id);
    // The site goes through the retraction door AS THIS ANSWER (root decision = the row carrying the `caused` edge), so
    // the pending findings its crawl produced go with it, a site another live answer still names stays, and no other
    // answer is rewritten (REVIEW5 I1).
    else if (table === "web.site") await withdrawSite(id, leadId);
    else if (table === "web.brand_asset") await deleteBrandAsset(id);
    else if (table === "web.brand_exclusion") {
      const { error } = await (await db()).from("brand_exclusion").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(error.message);
    } else if (table === "web.business_fact") {
      const kept = rec(before.fact);
      if (kept.kept) {
        const { error } = await (await db())
          .from("business_fact")
          .update({ value: kept.value ?? null, confirmed_at: (kept.confirmed_at as string | null) ?? null, confirmed_by: (kept.confirmed_by as string | null) ?? null, metadata: kept.metadata ?? null, deleted_at: null } as never)
          .eq("id", id);
        if (error) throw new Error(error.message);
      } else await deleteBusinessFact(id);
    } else if (table === "web.brand.logo_url") {
      const latest = await getBrand(id);
      await updateBrand({ brandId: id, expectedVersion: latest.version, patch: { logo_url: null } });
    } else if (table === "web.brand.name" && typeof before.name === "string") {
      const latest = await getBrand(id);
      await updateBrand({ brandId: id, expectedVersion: latest.version, patch: { name: before.name } });
    } else if (table.startsWith("web.brand.profile") && before.profile !== undefined) {
      const latest = await getBrand(id);
      await updateBrand({ brandId: id, expectedVersion: latest.version, patch: { profile: before.profile as Json } });
    } else if (table === "crm.party") {
      const role = kinds.find((k) => k.key === relationKey)?.routesTo ?? undefined;
      const gone = await associationsService.remove({ sourceType: "party", sourceId: id, targetType: "web_brand", targetId: brandId, role });
      if (!gone.ok) throw new Error(gone.error.message);
    }
  }
  // A Not us on a home already on the brand withdrew it: bring back exactly what that took.
  const taken = Array.isArray(before.retractions) ? (before.retractions as unknown as RetractionSummary[]) : [];
  for (const t of [...taken].reverse()) await restoreRetraction(t);
  const { error } = await (await db())
    .from("discovered_item")
    .update({ status: "pending", relation_key: null, reviewed_at: null, reviewed_by: null, resolved_property_id: null, resolved_fact_id: null })
    .in("id", rowIds);
  if (error) throw new Error(error.message);
}

/** The brand's answered findings, latest first, as Answered-tray entries that can be undone. */
export async function loadSavedAnswers(brand: MarketingBrand, kinds: BrandRelationKind[], ctx: SuggestContext): Promise<SavedAnswers> {
  const w = await db();
  const res = await w
    .from("discovered_item")
    .select("id, category, guessed_kind, url, value, context, confidence, status, relation_key, reviewed_at, resolved_property_id")
    .eq("brand_id", brand.id)
    .eq("source", "smart_add")
    .in("status", ["confirmed", "dismissed"])
    .in("context->answer->>from", [...ANSWERED_FROM])
    .is("deleted_at", null)
    .order("reviewed_at", { ascending: false })
    .limit(300);
  if (res.error) throw new Error(res.error.message);
  const rows = res.data ?? [];
  const copiesOf = new Map<string, string[]>();
  const copyRowsOf = new Map<string, typeof rows>();
  for (const r of rows) {
    const folded = rec(rec(r.context).answer as Json).folded_into;
    if (typeof folded === "string") {
      copiesOf.set(folded, [...(copiesOf.get(folded) ?? []), r.id]);
      copyRowsOf.set(folded, [...(copyRowsOf.get(folded) ?? []), r]);
    }
  }
  const out: SavedAnswers = { entries: [], items: [], facts: [] };
  for (const r of rows) {
    const answerCtx = rec(rec(r.context).answer as Json);
    if (typeof answerCtx.folded_into === "string") continue;
    const answer = answerCtx.answer;
    if (typeof answer !== "string" || !ANSWERS.has(answer)) continue;
    const one = fromRow(r as SavedRow);
    if (!one) continue;
    let item: FocusItem | null;
    if ("fact" in one) {
      item = focusFromFact(one.fact);
      out.facts.push(one.fact);
    } else {
      item = focusFromEvidence(one.item, kinds, ctx);
      out.items.push(one.item);
      // A logo card settled one picture found at several addresses: its copies come back with it, so the "already
      // answered" pictures match the live session's (MKT-139, MKT-140).
      if (item?.kind === "logo") {
        const copies = (copyRowsOf.get(r.id) ?? [])
          .map((c) => fromRow(c as SavedRow))
          .map((c) => (c && "item" in c ? focusFromEvidence(c.item, kinds, ctx) : null))
          .filter((c): c is FocusItem => Boolean(c));
        if (copies.length) item = { ...item, twins: [...item.twins, ...copies.map((c) => c.key)], folded: copies };
      }
    }
    if (!item) continue;
    const rowIds = [r.id, ...(copiesOf.get(r.id) ?? [])];
    const homes = Array.isArray(answerCtx.homes) ? answerCtx.homes : [];
    // Only a home the answer brought in pulled data in; one that predates it (context.answer.kept) is never retracted.
    const kept = Array.isArray(answerCtx.kept) ? answerCtx.kept : [];
    const pulled =
      (Boolean(r.resolved_property_id) && !kept.includes(`web.property:${r.resolved_property_id}`)) ||
      homes.some((h) => typeof h === "string" && h.startsWith("web.site:") && !kept.includes(h));
    const relationKey = r.relation_key;
    const value = typeof rec(r.value).text === "string" ? (rec(r.value).text as string) : item.value;
    out.entries.push({
      id: r.id,
      item,
      answer: answer as Answer,
      relationLabel: relationKey ? (kinds.find((k) => k.key === relationKey)?.label ?? relationKey) : null,
      value:
        item.kind === "logo"
          ? logoLabel(item)
          : item.kind === "account" && item.evidence?.handle
            ? item.evidence.handle.startsWith("@")
              ? item.evidence.handle
              : `@${item.evidence.handle}`
            : item.kind === "web"
              ? (item.title ?? item.value)
              : value,
      persisted: {
        discoveredId: r.id,
        homes: homes.filter((h): h is string => typeof h === "string"),
        undo: () => undoSaved(brand.id, rowIds, r.id, answerCtx, kinds, relationKey),
        ...(pulled ? { retraction: { rootType: "decision" as const, rootId: r.id } } : {}),
      },
    });
  }
  return out;
}

/**
 * Take back an answer saved on an earlier visit (the brand page's table, a reopened Enrich) before it is changed or
 * cleared: every site / person link / competitor / listing / backlink it created goes, anything a person made stays,
 * and the finding goes back to undecided with no answer left on its row. False when no answered row was found.
 */
export async function retractSavedAnswer(
  brandId: string,
  kinds: BrandRelationKind[],
  where: { evidenceKey: string } | { rowId: string },
): Promise<boolean> {
  const w = await db();
  const base = w
    .from("discovered_item")
    .select("id, relation_key, context, status")
    .eq("brand_id", brandId)
    .is("deleted_at", null);
  const found = await ("rowId" in where ? base.eq("id", where.rowId) : base.eq("source", "smart_add").eq("context->>evidence_key", where.evidenceKey)).limit(20);
  if (found.error) throw new Error(found.error.message);
  const rows = found.data ?? [];
  if (!rows.length) return false;
  const lead = rows.find((r) => typeof rec(rec(r.context).answer as Json).folded_into !== "string") ?? rows[0];
  const answerCtx = rec(rec(lead.context).answer as Json);
  await undoSaved(brandId, rows.map((r) => r.id), lead.id, answerCtx, kinds, lead.relation_key);
  // undoSaved sets it back to pending; the answer record goes too, so the row no longer reads as decided.
  for (const r of rows) {
    const { answer: _gone, ...context } = rec(r.context);
    const { error } = await w.from("discovered_item").update({ sentiment: null, context: context as Json }).eq("id", r.id);
    if (error) throw new Error(error.message);
  }
  return true;
}
