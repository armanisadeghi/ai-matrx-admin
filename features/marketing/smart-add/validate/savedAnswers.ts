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
  deleteSite,
  getBrand,
  updateBrand,
  type BrandRelationKind,
} from "@/features/marketing/data/service";
import { associationsService } from "@/features/scopes/service/associationsService";
import { isJsonRecord, type MarketingBrand } from "@/features/marketing/types";
import type { EvidenceItem } from "../evidence";
import type { SuggestContext } from "../webKinds";
import { fromRow, type SavedRow } from "./fromSaved";
import { focusFromEvidence, focusFromFact, type Answer, type BrandFact, type FocusItem } from "./queue";
import type { Persisted } from "./persist";

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

const ANSWERS: ReadonlySet<string> = new Set(["preferred", "ours", "alias", "not_us", "related", "correct", "wrong", "ignore"]);

const rec = (j: Json | null | undefined): Record<string, Json | undefined> => (isJsonRecord(j) ? (j as Record<string, Json | undefined>) : {});

async function db() {
  return authenticatedWebDb(supabase);
}

/** Take back every home an answer wrote (newest first), then put the finding back to pending. */
async function undoSaved(brandId: string, rowIds: string[], leadId: string, answer: Record<string, Json | undefined>, kinds: BrandRelationKind[], relationKey: string | null) {
  const homes = Array.isArray(answer.homes) ? answer.homes.filter((h): h is string => typeof h === "string") : [];
  const before = rec(answer.before as Json);
  for (const home of [...homes].reverse()) {
    const [table, id] = [home.slice(0, home.indexOf(":")), home.slice(home.indexOf(":") + 1)];
    if (table === "web.property") await deleteProperty(id);
    else if (table === "web.site") await deleteSite(id);
    else if (table === "web.brand_asset") await deleteBrandAsset(id);
    else if (table === "web.brand_exclusion") {
      const { error } = await (await db()).from("brand_exclusion").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(error.message);
    } else if (table === "web.business_fact") {
      const kept = rec(before.fact);
      if (kept.kept) {
        const { error } = await (await db())
          .from("business_fact")
          .update({ value: kept.value ?? null, confirmed_at: (kept.confirmed_at as string | null) ?? null, metadata: kept.metadata ?? null, deleted_at: null } as never)
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
  const { error } = await (await db())
    .from("discovered_item")
    .update({ status: "pending", relation_key: null, reviewed_at: null, resolved_property_id: null, resolved_fact_id: null })
    .in("id", rowIds);
  if (error) throw new Error(error.message);
  void leadId;
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
    .eq("context->answer->>from", "smart_add.validate")
    .is("deleted_at", null)
    .order("reviewed_at", { ascending: false })
    .limit(300);
  if (res.error) throw new Error(res.error.message);
  const rows = res.data ?? [];
  const copiesOf = new Map<string, string[]>();
  for (const r of rows) {
    const folded = rec(rec(r.context).answer as Json).folded_into;
    if (typeof folded === "string") copiesOf.set(folded, [...(copiesOf.get(folded) ?? []), r.id]);
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
    }
    if (!item) continue;
    const rowIds = [r.id, ...(copiesOf.get(r.id) ?? [])];
    const homes = Array.isArray(answerCtx.homes) ? answerCtx.homes : [];
    const pulled = Boolean(r.resolved_property_id) || homes.some((h) => typeof h === "string" && h.startsWith("web.site:"));
    const relationKey = r.relation_key;
    const value = typeof rec(r.value).text === "string" ? (rec(r.value).text as string) : item.value;
    out.entries.push({
      id: r.id,
      item,
      answer: answer as Answer,
      relationLabel: relationKey ? (kinds.find((k) => k.key === relationKey)?.label ?? relationKey) : null,
      value:
        item.kind === "logo"
          ? "Logos"
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
