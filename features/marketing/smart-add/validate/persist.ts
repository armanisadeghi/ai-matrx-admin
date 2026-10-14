/**
 * Smart Add validation — every answer is saved the moment it is given, into the same homes Create
 * uses, and every save can be undone.
 *
 *   the finding itself      → web.discovered_item: the pending row Create kept for it
 *                             (context.evidence_key) is answered in place, else a new row; status
 *                             confirmed / dismissed, relation_key, context.answer {answer, by, at, suggested}
 *   Ours (account)          → web.property (resolved_property_id)
 *   Ours (website, web root)→ web.site (+ the normal crawl)
 *   Preferred (name)        → web.brand.name
 *   Alias (name)            → web.brand.profile.brand_aliases
 *   Related: competitor     → web.brand.profile.competitors
 *   Not us                  → web.brand_exclusion
 *   Correct / edited (fact) → web.business_fact (resolved_fact_id)
 *   Ask me later            → nothing (stays pending)
 */

import type { Json } from "@/types/database.types";
import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb } from "@/utils/supabase/webDb";
import {
  createBusinessFact,
  createProperty,
  createSite,
  deleteBusinessFact,
  deleteProperty,
  deleteSite,
  moveSiteBrand,
  updateBrand,
  type BrandRelationKind,
} from "@/features/marketing/data/service";
import { initializeSite } from "@/features/marketing/crawler/direct-client";
import { normalizeWebsiteUrl } from "@/features/marketing/lib/website-url";
import {
  isBusinessFactKind,
  isJsonRecord,
  parseBrandProfile,
  type MarketingBrand,
} from "@/features/marketing/types";
import { candidateCategory, websiteHost } from "../evidence";
import { webAddress } from "../webKinds";
import { webSiteRoot } from "../relations";
import type { Answer, FocusItem } from "./queue";

export interface PersistContext {
  organizationId: string;
  /** The brand as last written (its version moves with every write). */
  getBrand: () => MarketingBrand;
  setBrand: (brand: MarketingBrand) => void;
  kinds: BrandRelationKind[];
}

export interface Persisted {
  discoveredId: string | null;
  /** The canonical homes written, as `table:id` — published to the Builder panel. */
  homes: string[];
  undo: () => Promise<void>;
}

const CONFIRMED: ReadonlySet<Answer> = new Set(["preferred", "ours", "alias", "related", "correct"]);
const DISMISSED: ReadonlySet<Answer> = new Set(["not_us", "wrong", "ignore"]);

function relationKeyFor(answer: Answer, relationKey: string | null): string | null {
  if (answer === "related") return relationKey;
  if (answer === "ours" || answer === "preferred" || answer === "alias") return "ours";
  if (answer === "not_us") return "not_us";
  return null;
}

/** web.business_fact kind for a fact field (the table's own list), else `other` with its label. */
function factKind(field: string): string {
  const f = field.toLowerCase();
  if (isBusinessFactKind(f)) return f;
  if (f === "legal_name" || f === "brand_legal_name") return "legal_name";
  return "other";
}

async function db() {
  return authenticatedWebDb(supabase);
}

async function recordDiscovered(
  ctx: PersistContext,
  item: FocusItem,
  answer: Answer,
  relationKey: string | null,
  value: string,
  resolved: { resolved_property_id?: string; resolved_fact_id?: string },
): Promise<{ id: string; undo: () => Promise<void> }> {
  const brand = ctx.getBrand();
  const w = await db();
  const at = new Date().toISOString();
  const status = CONFIRMED.has(answer) ? "confirmed" : DISMISSED.has(answer) ? "dismissed" : "pending";
  const answerCtx = {
    answer,
    by: "person",
    at,
    from: "smart_add.validate",
    suggested: item.suggestion ? (item.suggestion as unknown as Json) : null,
    ...(item.fact && value !== item.fact.value ? { edited_from: item.fact.value } : {}),
  };
  const existing = await w
    .from("discovered_item")
    .select("id, status, relation_key, reviewed_at, context, resolved_property_id, resolved_fact_id")
    .eq("brand_id", brand.id)
    .eq("source", "smart_add")
    .in("context->>evidence_key", [item.key, ...item.twins])
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  const relation_key = relationKeyFor(answer, relationKey);
  if (existing.data) {
    const before = existing.data;
    const context = { ...(isJsonRecord(before.context) ? before.context : {}), answer: answerCtx } as Json;
    const { error } = await w
      .from("discovered_item")
      .update({ status, relation_key, reviewed_at: at, context, ...resolved })
      .eq("id", before.id);
    if (error) throw new Error(error.message);
    return {
      id: before.id,
      undo: async () => {
        const { error: e } = await (await db())
          .from("discovered_item")
          .update({
            status: before.status,
            relation_key: before.relation_key,
            reviewed_at: before.reviewed_at,
            context: before.context,
            resolved_property_id: before.resolved_property_id,
            resolved_fact_id: before.resolved_fact_id,
          })
          .eq("id", before.id);
        if (e) throw new Error(e.message);
      },
    };
  }
  const ev = item.evidence;
  const inserted = await w
    .from("discovered_item")
    .insert({
      organization_id: ctx.organizationId,
      brand_id: brand.id,
      source: "smart_add",
      category: ev ? candidateCategory(ev.field) : "fact",
      guessed_kind: ev ? (ev.field === "social" ? (ev.platform ?? "social") : ev.field) : (item.fact?.field ?? "fact"),
      url: item.openUrl,
      value: (item.fact
        ? {
            text: value,
            field: item.fact.field,
            field_label: item.fact.field_label,
            certainty: item.fact.certainty,
            reason: item.fact.reason,
            evidence_urls: item.fact.evidence_urls,
          }
        : { text: value, label: ev?.label ?? null, handle: ev?.handle ?? null, followers: ev?.followers ?? null }) as Json,
      context: {
        evidence_key: item.key,
        where: item.source,
        found_on: ev?.source.url ?? null,
        step: ev?.source.node ?? "brand_basics",
        ...(ev?.hits?.length ? { search: { engines: ev.engines ?? [], hits: ev.hits, snippet: ev.snippet ?? null } } : {}),
        answer: answerCtx,
      } as unknown as Json,
      confidence: ev?.confidence ?? null,
      status,
      relation_key,
      reviewed_at: status === "pending" ? null : at,
      ...resolved,
    })
    .select("id")
    .single();
  if (inserted.error) throw new Error(inserted.error.message);
  const id = inserted.data.id;
  return {
    id,
    undo: async () => {
      const { error: e } = await (await db())
        .from("discovered_item")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (e) throw new Error(e.message);
    },
  };
}

async function patchProfile(ctx: PersistContext, edit: (profile: Record<string, Json>) => Record<string, Json>) {
  const brand = ctx.getBrand();
  const current = (isJsonRecord(brand.profile) ? { ...brand.profile } : {}) as Record<string, Json>;
  const next = await updateBrand({ brandId: brand.id, expectedVersion: brand.version, patch: { profile: edit(current) as Json } });
  ctx.setBrand(next);
  return async () => {
    const latest = ctx.getBrand();
    const restored = await updateBrand({ brandId: latest.id, expectedVersion: latest.version, patch: { profile: current as Json } });
    ctx.setBrand(restored);
  };
}

async function addSite(ctx: PersistContext, url: string): Promise<{ id: string; undo: () => Promise<void> }> {
  const brand = ctx.getBrand();
  const parsed = normalizeWebsiteUrl(url);
  const site = await createSite({
    organizationId: ctx.organizationId,
    name: parsed.hostname,
    rootUrl: parsed.toString(),
    domain: parsed.hostname.toLowerCase(),
    brandId: brand.id,
  });
  const previousBrand = site.brand_id;
  if (previousBrand !== brand.id) await moveSiteBrand(site.id, brand.id);
  // The normal crawl every confirmed site gets (as on Create); never blocks the answer.
  void initializeSite(site.id).catch(() => undefined);
  return {
    id: site.id,
    undo: async () => {
      if (previousBrand && previousBrand !== brand.id) await moveSiteBrand(site.id, previousBrand);
      else await deleteSite(site.id);
    },
  };
}

async function addExclusion(ctx: PersistContext, item: FocusItem): Promise<{ id: string | null; undo: () => Promise<void> }> {
  const brand = ctx.getBrand();
  const ev = item.evidence;
  const url = item.openUrl;
  const root = ev ? webSiteRoot(ev) : null;
  const match =
    item.kind === "account"
      ? { kind: "account", value: item.key }
      : item.kind === "name"
        ? { kind: "name", value: item.value.trim().toLowerCase() }
        : item.kind === "website"
          ? { kind: "host", value: websiteHost(item.value) }
          : root
            ? { kind: "host", value: websiteHost(root) }
            : { kind: "url", value: webAddress(url ?? item.value) };
  const w = await db();
  const { data, error } = await w
    .from("brand_exclusion")
    .insert({
      organization_id: ctx.organizationId,
      brand_id: brand.id,
      match_kind: match.kind,
      match_value: match.value,
      url: item.kind === "name" ? null : url,
      label: item.title ?? item.value,
      relation_key: "not_us",
      source: "smart_add",
      context: { from: "smart_add.validate", where: item.source, suggested: item.suggestion ?? null, at: new Date().toISOString() } as unknown as Json,
    })
    .select("id")
    .maybeSingle();
  if (error && error.code === "23505") {
    // An active match is already on the list; deleted history must stay deleted.
    const matching = () => w
      .from("brand_exclusion")
      .select("id")
      .eq("brand_id", brand.id)
      .eq("match_kind", match.kind)
      .eq("match_value", match.value);
    const active = await matching().is("deleted_at", null).limit(1).maybeSingle();
    if (active.error) throw new Error(active.error.message);
    if (active.data) return { id: null, undo: async () => undefined };

    // A lifetime-unique row may have been soft-deleted by Undo. Revive only
    // that row so other deleted history cannot collide with a partial index.
    const deleted = await matching()
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (deleted.error) throw new Error(deleted.error.message);
    if (!deleted.data) throw new Error("Could not find the exclusion that blocked this answer");
    const revived = await w
      .from("brand_exclusion")
      .update({ deleted_at: null })
      .eq("id", deleted.data.id)
      .select("id")
      .maybeSingle();
    if (revived.error || !revived.data) throw new Error(revived.error?.message ?? "Could not restore the exclusion");
    const again = revived.data.id;
    return {
      id: again,
      undo: async () => {
        if (!again) return;
        const { data: undone, error: e } = await (await db())
          .from("brand_exclusion")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", again)
          .select("id")
          .maybeSingle();
        if (e || !undone) throw new Error(e?.message ?? "Could not undo the exclusion");
      },
    };
  }
  if (error) throw new Error(error.message);
  const id = data?.id ?? null;
  return {
    id,
    undo: async () => {
      if (!id) return;
      const { data: undone, error: e } = await (await db())
        .from("brand_exclusion")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (e || !undone) throw new Error(e?.message ?? "Could not undo the exclusion");
    },
  };
}

/** Save one answer in its homes. `relationKey` for Related; `value` for an edited fact. */
export async function persistAnswer(
  ctx: PersistContext,
  item: FocusItem,
  answer: Answer,
  opts: { relationKey?: string | null; value?: string } = {},
): Promise<Persisted> {
  const homes: string[] = [];
  const undos: (() => Promise<void>)[] = [];
  const resolved: { resolved_property_id?: string; resolved_fact_id?: string } = {};
  const value = opts.value?.trim() || item.value;
  const ev = item.evidence;

  if (answer === "later") return { discoveredId: null, homes, undo: async () => undefined };

  if (answer === "ours" && item.kind === "account" && ev) {
    const row = await createProperty({
      organizationId: ctx.organizationId,
      brandId: ctx.getBrand().id,
      kind: (ev.platform ?? "website") as Parameters<typeof createProperty>[0]["kind"],
      url: ev.url,
      handle: ev.handle,
      displayName: ev.label,
      status: "active",
    });
    resolved.resolved_property_id = row.id;
    homes.push(`web.property:${row.id}`);
    undos.push(() => deleteProperty(row.id));
  }
  if (answer === "ours" && (item.kind === "website" || item.kind === "web") && ev) {
    const root = item.kind === "website" ? (ev.url ?? ev.value) : webSiteRoot(ev);
    if (root) {
      const site = await addSite(ctx, root);
      homes.push(`web.site:${site.id}`);
      undos.push(site.undo);
    }
  }
  if (answer === "preferred" && item.kind === "name") {
    const brand = ctx.getBrand();
    const before = brand.name;
    const next = await updateBrand({ brandId: brand.id, expectedVersion: brand.version, patch: { name: value } });
    ctx.setBrand(next);
    homes.push(`web.brand.name:${brand.id}`);
    undos.push(async () => {
      const latest = ctx.getBrand();
      ctx.setBrand(await updateBrand({ brandId: latest.id, expectedVersion: latest.version, patch: { name: before } }));
    });
  }
  if (answer === "alias" && item.kind === "name") {
    const undo = await patchProfile(ctx, (p) => {
      const aliases = parseBrandProfile(p as Json).brand_aliases ?? [];
      return aliases.includes(value) ? p : { ...p, brand_aliases: [...aliases, value] };
    });
    homes.push(`web.brand.profile.brand_aliases:${ctx.getBrand().id}`);
    undos.push(undo);
  }
  if (answer === "related" && opts.relationKey) {
    const kind = ctx.kinds.find((k) => k.key === opts.relationKey);
    if (kind?.routesTo === "competitor") {
      const domain = item.openUrl ? websiteHost(item.openUrl) : null;
      const undo = await patchProfile(ctx, (p) => {
        const list = Array.isArray(p.competitors) ? p.competitors : [];
        return {
          ...p,
          competitors: [
            ...list,
            {
              name: item.title ?? item.value,
              ...(domain && item.kind !== "account" ? { domain } : {}),
              ...(item.kind === "account" ? { handles: [item.value] } : {}),
            },
          ] as Json,
        };
      });
      homes.push(`web.brand.profile.competitors:${ctx.getBrand().id}`);
      undos.push(undo);
    }
  }
  if (answer === "not_us") {
    const ex = await addExclusion(ctx, item);
    if (ex.id) homes.push(`web.brand_exclusion:${ex.id}`);
    undos.push(ex.undo);
  }
  if (answer === "correct" && item.kind === "fact") {
    const field = item.fact?.field ?? ev?.field ?? "other";
    const kind = factKind(field);
    const fact = await createBusinessFact({
      organizationId: ctx.organizationId,
      brandId: ctx.getBrand().id,
      kind: kind as Parameters<typeof createBusinessFact>[0]["kind"],
      label: kind === "other" ? item.label : null,
      value,
    });
    resolved.resolved_fact_id = fact.id;
    homes.push(`web.business_fact:${fact.id}`);
    undos.push(() => deleteBusinessFact(fact.id));
  }

  try {
    const discovered = await recordDiscovered(ctx, item, answer, opts.relationKey ?? null, value, resolved);
    homes.unshift(`web.discovered_item:${discovered.id}`);
    undos.unshift(discovered.undo);
    return {
      discoveredId: discovered.id,
      homes,
      undo: async () => {
        // Reverse order: the homes first, then the finding back to its earlier state.
        for (const u of [...undos].reverse()) await u();
      },
    };
  } catch (error) {
    // The finding could not be recorded: take back the homes written for it, so nothing half-saves.
    for (const u of [...undos].reverse()) await u().catch(() => undefined);
    throw error;
  }
}
