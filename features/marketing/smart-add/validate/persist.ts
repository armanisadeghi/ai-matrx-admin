/**
 * Smart Add validation — every answer is saved the moment it is given, into the same homes Create
 * uses, and every save can be undone.
 *
 *   the finding itself      → web.discovered_item: the pending row Create kept for it
 *                             (context.evidence_key) is answered in place, else a new row; status
 *                             confirmed / dismissed, relation_key, context.answer {answer, by, at, suggested}
 *   Ours (account)          → web.property (resolved_property_id) + its post history, fetched on the
 *                             server (smart_add_brand_ingest; the person's posts default, metered)
 *   Ours (website, web root)→ web.site + its crawl on the server (smart_add_brand_ingest)
 *   Preferred (name)        → web.brand.name
 *   Alias (name)            → web.brand.profile.brand_aliases
 *   Related: competitor     → web.brand.profile.competitors
 *   Not us                  → web.brand_exclusion
 *   Correct / edited (fact) → web.business_fact (resolved_fact_id; source `discovered`, provenance in
 *                             metadata), or its web.brand profile key (aliases, service area, competitors)
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
import { startSystemRun } from "@/features/education/kits/systemRuns";
import { associationsService } from "@/features/scopes/service/associationsService";
import { getStoreSingleton } from "@/lib/redux/store-singleton";
import { normalizeWebsiteUrl } from "@/features/marketing/lib/website-url";
import {
  isBusinessFactKind,
  isJsonRecord,
  parseBrandProfile,
  type MarketingBrand,
} from "@/features/marketing/types";
import { candidateCategory, websiteHost } from "../evidence";
import { webIdentity } from "../webKinds";
import { webSiteRoot } from "../relations";
import { claimSite } from "../siteOwnership";
import { siteNameOf } from "../siteName";
import { liveSiteClaimDeps } from "../siteOwnershipLive";
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
  /**
   * Set when the answer pulled data in (an account's tracking + posts, a website's crawl): undo goes through
   * the retraction (preview, then take back everything it brought in — UNDO.md), never the plain undo.
   */
  retraction?: { rootType: "decision"; rootId: string };
}

const CONFIRMED: ReadonlySet<Answer> = new Set(["preferred", "ours", "alias", "related", "correct"]);
const DISMISSED: ReadonlySet<Answer> = new Set(["not_us", "wrong", "ignore"]);

function relationKeyFor(answer: Answer, relationKey: string | null): string | null {
  if (answer === "related") return relationKey;
  if (answer === "ours" || answer === "preferred" || answer === "alias") return "ours";
  if (answer === "not_us") return "not_us";
  return null;
}

/** The facts agent's fields (brand_basics) that are a web.business_fact kind under another name. */
const FACT_FIELD_KIND: Record<string, string> = {
  toll_free_phone: "phone",
  sms_number: "phone",
  street_address: "address",
  business_hours: "hours",
  legal_entity_name: "legal_name",
  brand_legal_name: "legal_name",
  short_description: "description",
  registration_number: "registration",
};

/** web.business_fact kind for a fact field (the table's own list), else `other` with its label. */
function factKind(field: string): string {
  const f = field.toLowerCase();
  if (isBusinessFactKind(f)) return f;
  return FACT_FIELD_KIND[f] ?? "other";
}

/** Fact fields whose canonical home is a web.brand profile key (BrandProfile), not web.business_fact. */
const PROFILE_HOME: Record<string, "brand_aliases" | "service_area" | "competitors"> = {
  also_known_as: "brand_aliases",
  dba_name: "brand_aliases",
  former_name: "brand_aliases",
  service_area: "service_area",
  competitor: "competitors",
};

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
  // Every saved row this card answers: the finding and each copy folded into it (fold.ts) — settled together.
  const existing = await w
    .from("discovered_item")
    .select("id, status, relation_key, reviewed_at, context, resolved_property_id, resolved_fact_id")
    .eq("brand_id", brand.id)
    .eq("source", "smart_add")
    .in("context->>evidence_key", [item.key, ...item.twins])
    .is("deleted_at", null)
    .limit(200);
  if (existing.error) throw new Error(existing.error.message);
  const relation_key = relationKeyFor(answer, relationKey);
  const rows = existing.data ?? [];
  if (rows.length) {
    // The lead row carries the homes written (resolved_*); its copies point at it.
    const leadKey = (r: (typeof rows)[number]) => (isJsonRecord(r.context) ? r.context.evidence_key : null);
    const lead = rows.find((r) => leadKey(r) === item.key) ?? rows[0];
    const done: typeof rows = [];
    const restore = async () => {
      const d = await db();
      for (const before of done) {
        const { error: e } = await d
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
        // access-errors: ok — an undo write on the person's own answer; the tray shows "Not saved"
        if (e) throw new Error(e.message);
      }
    };
    for (const before of [lead, ...rows.filter((r) => r !== lead)]) {
      const isLead = before === lead;
      const context = {
        ...(isJsonRecord(before.context) ? before.context : {}),
        answer: isLead ? answerCtx : { ...answerCtx, folded_into: lead.id },
      } as Json;
      const { error } = await w
        .from("discovered_item")
        .update({ status, relation_key, reviewed_at: at, context, ...(isLead ? resolved : {}) })
        .eq("id", before.id);
      if (error) {
        await restore().catch(() => undefined);
        // access-errors: ok — a write failure on the person's own answer, shown as "Not saved" in the tray
        throw new Error(error.message);
      }
      done.push(before);
    }
    return { id: lead.id, undo: restore };
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
      // access-errors: ok — an undo write on the person's own answer; the tray shows "Not saved"
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

/**
 * The background work Create gives, for a thing confirmed after Create: the server tracks the account
 * and fetches its posts, or crawls the site (smart_add_brand_ingest). One run per confirmed thing
 * (subject ingest:<id>); never blocks the answer. A failure to start is logged, never silent.
 */
function startIngest(
  ctx: PersistContext,
  subjectId: string,
  inputs: { accounts?: { handle_or_url: string; platform: string; property_id: string }[]; sites?: string[] },
): void {
  const store = getStoreSingleton();
  if (!store) {
    console.error("[smart-add] background ingest not started: no app store");
    return;
  }
  void startSystemRun(
    store.dispatch,
    "smart_add_brand_ingest",
    {
      subject: `ingest:${subjectId}`,
      organizationId: ctx.organizationId,
      sourceFeature: "marketing",
      inputs: { brand_id: ctx.getBrand().id, accounts: inputs.accounts ?? [], sites: inputs.sites ?? [] },
    },
    "The background fetch could not start.",
  ).catch((error) => console.error("[smart-add] background ingest not started", error));
}

async function addSite(ctx: PersistContext, url: string): Promise<{ id: string | null; note?: string; undo: () => Promise<void> }> {
  const brand = ctx.getBrand();
  const parsed = normalizeWebsiteUrl(url);
  const claim = await claimSite(liveSiteClaimDeps, {
    organizationId: ctx.organizationId,
    brandId: brand.id,
    rootUrl: parsed.toString(),
    host: parsed.hostname.toLowerCase(),
  });
  // A site another brand tracks stays with it (never reassigned here); this brand got its own website row.
  if (claim.kind === "tracked-elsewhere") return { id: null, note: claim.note, undo: async () => {} };
  const site = claim.site;
  // The crawl every confirmed site gets (as on Create), on the server; never blocks the answer.
  startIngest(ctx, site.id, { sites: [site.id] });
  return { id: site.id, undo: async () => deleteSite(site.id) };
}

/**
 * The web.business_fact Create kept for this finding (keptFacts.ts; its discovered_item's resolved_fact_id), settled in
 * place: Correct confirms it (and takes an edit), Wrong soft-deletes it. Returns false when Create kept none.
 */
async function settleKeptFact(
  ctx: PersistContext,
  item: FocusItem,
  answer: "correct" | "wrong",
  value: string,
  resolved: { resolved_property_id?: string; resolved_fact_id?: string },
  homes: string[],
  undos: (() => Promise<void>)[],
): Promise<boolean> {
  const w = await db();
  const link = await w
    .from("discovered_item")
    .select("resolved_fact_id")
    .eq("brand_id", ctx.getBrand().id)
    .eq("source", "smart_add")
    .in("context->>evidence_key", [item.key, ...item.twins])
    .not("resolved_fact_id", "is", null)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (link.error) throw new Error(link.error.message);
  const factId = link.data?.resolved_fact_id;
  if (!factId) return false;
  const current = await w
    .from("business_fact")
    .select("id, value, confirmed_at, metadata, version, deleted_at")
    .eq("id", factId)
    .is("deleted_at", null)
    .maybeSingle();
  if (current.error) throw new Error(current.error.message);
  if (!current.data) return false;
  const before = current.data;
  const at = new Date().toISOString();
  const meta = isJsonRecord(before.metadata) ? before.metadata : {};
  const patch =
    answer === "correct"
      ? {
          confirmed_at: at,
          metadata: { ...meta, decision: "confirmed", ...(item.fact && value !== item.fact.value ? { edited_from: item.fact.value } : {}) } as Json,
          ...(item.fact && value !== item.fact.value ? { value: (/^https?:\/\//i.test(value) ? { url: value } : { text: value }) as Json } : {}),
        }
      : { deleted_at: at, metadata: { ...meta, decision: "wrong" } as Json };
  const { error } = await w
    .from("business_fact")
    .update({ ...patch, version: before.version + 1 })
    .eq("id", factId)
    .eq("version", before.version);
  if (error) throw new Error(error.message);
  if (answer === "correct") resolved.resolved_fact_id = factId;
  homes.push(`web.business_fact:${factId}`);
  undos.push(async () => {
    const { error: e } = await (await db())
      .from("business_fact")
      .update({ value: before.value, confirmed_at: before.confirmed_at, metadata: before.metadata, deleted_at: null, version: before.version + 2 })
      .eq("id", factId);
    if (e) throw new Error(e.message);
  });
  return true;
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
            : { kind: "url", value: webIdentity(url ?? item.value) };
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

/**
 * Provenance edge: `web_discovered_item (the decision) --caused--> <row>`. `web.decision_retraction` reads it
 * to take the row back on undo. A failed edge fails the answer loudly (its undo would leave the row behind).
 */
async function recordCause(ctx: PersistContext, decisionId: string, targetType: "web_site" | "party", targetId: string) {
  const linked = await associationsService.add({
    sourceType: "web_discovered_item",
    sourceId: decisionId,
    targetType,
    targetId,
    orgId: ctx.organizationId,
    role: "caused",
    label: "caused",
  });
  if (!linked.ok) throw new Error(`Could not record where this came from: ${linked.error.message}`);
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
  let siteId: string | null = null;

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
    if (ev.platform && ev.platform !== "website") {
      startIngest(ctx, row.id, {
        accounts: [{ handle_or_url: ev.url ?? ev.value, platform: ev.platform, property_id: row.id }],
      });
    }
    undos.push(() => deleteProperty(row.id));
  }
  if (answer === "ours" && (item.kind === "website" || item.kind === "web") && ev) {
    const root = item.kind === "website" ? (ev.url ?? ev.value) : webSiteRoot(ev);
    if (root) {
      const site = await addSite(ctx, root);
      siteId = site.id;
      if (site.id) homes.push(`web.site:${site.id}`);
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
              name: item.kind === "web" ? siteNameOf({ title: item.title, host: domain ?? websiteHost(item.value) }) : (item.title ?? item.value),
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
  const profileHome = answer === "correct" && item.fact ? PROFILE_HOME[item.fact.field] : undefined;
  if (profileHome) {
    // A brand profile key is the fact's one home (aliases, service area, competitors).
    const undo = await patchProfile(ctx, (p) => {
      const profile = parseBrandProfile(p as Json);
      if (profileHome === "service_area") return profile.service_area ? p : { ...p, service_area: value };
      if (profileHome === "brand_aliases") {
        const aliases = profile.brand_aliases ?? [];
        return aliases.includes(value) ? p : { ...p, brand_aliases: [...aliases, value] };
      }
      const list = Array.isArray(p.competitors) ? p.competitors : [];
      return { ...p, competitors: [...list, { name: value }] as Json };
    });
    homes.push(`web.brand.profile.${profileHome}:${ctx.getBrand().id}`);
    undos.push(undo);
  } else if ((answer === "correct" || answer === "wrong") && item.kind === "fact" && (await settleKeptFact(ctx, item, answer, value, resolved, homes, undos))) {
    // The fact Create kept (keptFacts.ts) is settled in place: confirmed, or soft-deleted — never a second row.
  } else if (answer === "correct" && item.kind === "fact") {
    const field = item.fact?.field ?? ev?.field ?? "other";
    const kind = factKind(field);
    const fact = await createBusinessFact({
      organizationId: ctx.organizationId,
      brandId: ctx.getBrand().id,
      kind: kind as Parameters<typeof createBusinessFact>[0]["kind"],
      label: kind === "other" || item.fact ? item.label : null,
      value,
      // The facts agent's finding keeps its provenance on the fact itself (the brand pages show it).
      ...(item.fact
        ? {
            source: "discovered" as const,
            metadata: {
              found_by: "brand_intake.early_facts",
              field: item.fact.field,
              field_label: item.fact.field_label,
              found_value: item.fact.value,
              certainty: item.fact.certainty,
              reason: item.fact.reason,
              evidence_urls: item.fact.evidence_urls,
            },
          }
        : ev
          ? { source: "discovered" as const, metadata: { found_by: ev.source.node, where: ev.source.where, url: ev.source.url } }
          : {}),
    });
    resolved.resolved_fact_id = fact.id;
    homes.push(`web.business_fact:${fact.id}`);
    undos.push(() => deleteBusinessFact(fact.id));
  }

  try {
    const discovered = await recordDiscovered(ctx, item, answer, opts.relationKey ?? null, value, resolved);
    homes.unshift(`web.discovered_item:${discovered.id}`);
    undos.unshift(discovered.undo);
    // Provenance: the site exists because of this decision (the account's is resolved_property_id).
    if (siteId) await recordCause(ctx, discovered.id, "web_site", siteId);
    return {
      discoveredId: discovered.id,
      ...(resolved.resolved_property_id || siteId ? { retraction: { rootType: "decision" as const, rootId: discovered.id } } : {}),
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
