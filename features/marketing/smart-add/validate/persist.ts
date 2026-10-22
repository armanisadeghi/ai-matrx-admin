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
 *   Related: founder / key person → crm.party (person) + its association to the brand (relations.linkPersonToBrand)
 *   Not us                  → web.brand_exclusion
 *   Correct / edited (fact) → web.business_fact (resolved_fact_id; source `discovered`, provenance in
 *                             metadata), or its web.brand profile key (aliases, service area, competitors)
 *   Ask me later            → nothing (stays pending); on a web result (recordMark) its row keeps answer "later"
 *   Ignore                  → status dismissed, no relationship (a web result kept as a decision)
 */

import { foundByForSource } from "../factIdentity";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import { promotedHomes, promoteSmartAddFindings, undoPromotion } from "../promote";
import type { Json } from "@/types/database.types";
import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb, signedInPersonId } from "@/utils/supabase/webDb";
import {
  createBrandAsset,
  listBrandPropertiesForMatching,
  createBusinessFact,
  createProperty,
  createSite,
  deleteBrandAsset,
  deleteBusinessFact,
  deleteProperty,
  getBrand,
  mergeBrandProfile,
  moveSiteBrand,
  updateBrand,
  type BrandRelationKind,
} from "@/features/marketing/data/service";
import { startSystemRun } from "@/lib/workflows/system-runs";
import { applyRetraction, restoreRetraction, withdrawSite, type RetractionSummary } from "@/features/marketing/data/retraction";
import { sourceAccountOf } from "@/features/marketing/components/brands/logo-rank";
import { associationsService } from "@/features/scopes/service/associationsService";
import { linkPersonToBrand } from "../relations";
import { getStoreSingleton } from "@/lib/redux/store-singleton";
import { normalizeWebsiteUrl } from "@/features/marketing/lib/website-url";
import {
  isJsonRecord,
  parseBrandProfile,
  type MarketingBrand,
} from "@/features/marketing/types";
import { candidateCategory, websiteHost } from "../evidence";
import { webIdentity } from "../webKinds";
import { factKindFor, loadFactRules, profileHomeFor } from "../factRules";
import { webSiteRoot } from "../relations";
import { claimSite } from "../siteOwnership";
import { siteNameOf } from "../siteName";
import { liveSiteClaimDeps } from "../siteOwnershipLive";
import { resolveAccountInput } from "../../social/account-input";
import { GAP_PREFIX, type Answer, type FocusItem } from "./queue";

/** How one answer is saved. `relationKey` for Related; `value` for an edited fact or a person's name. */
export interface PersistOptions {
  relationKey?: string | null;
  value?: string;
  /** A mention's tone (web.brand_relation_kind.has_sentiment): kept on the finding's row. */
  sentiment?: "positive" | "neutral" | "negative" | null;
  /**
   * Founder / Key person on a PAGE with no name yet: the decision is kept on the finding's row now and the person is
   * made once a name is given (answered again with `value`). Without it a missing name is refused.
   */
  allowUnnamed?: boolean;
  /**
   * "Ask me later" / "Ignore" on a web result are decisions too: with this set, a later is kept on the finding's row
   * (still pending, answer "later") instead of writing nothing, so a reopened review and the brand's On the web tab
   * show it. Off by default: the validation queue's Ask me later keeps writing nothing.
   */
  recordMark?: boolean;
  /**
   * Create's Yes (SmartAddBrand): Create already made this answer's home (the account's property, the website's site),
   * so this records the person's answer on the finding and writes none. Create promotes once for the whole brand, so no
   * per-answer promotion. The finding row is the person evidence research reads (aidream research/verified_identity.py
   * person_validated_properties): without it a brand made through Smart Add was never "known as theirs".
   */
  created?: { propertyId?: string; siteId?: string; existing?: boolean };
}

/**
 * `created.existing` (validate/unconfirmed.ts): the home was on the brand BEFORE this answer (an account or website no
 * person had confirmed). Yes records the person's answer naming it (the same row Create writes); Undo takes back only the
 * answer, never the home. Not us withdraws the home through `web.decision_retraction` (no second NO LIST entry: the
 * answer adds its own) and Undo restores exactly what that took. The homes it predates are kept on the answer
 * (`context.answer.kept`), the withdrawals' summaries in `context.answer.before.retractions`, so a later visit's Undo
 * (savedAnswers.ts) does the same.
 */
function keptHomes(opts: PersistOptions): string[] {
  const c = opts.created;
  if (!c?.existing) return [];
  return [...(c.propertyId ? [`web.property:${c.propertyId}`] : []), ...(c.siteId ? [`web.site:${c.siteId}`] : [])];
}

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

async function db() {
  return authenticatedWebDb(supabase);
}

/** When an answer counts as reviewed, and by whom: a pending row (other than "later") names nobody. */
function reviewStamp(status: string, answer: Answer, at: string, me: string): { reviewed_at: string | null; reviewed_by: string | null } {
  return status === "pending" && answer !== "later" ? { reviewed_at: null, reviewed_by: null } : { reviewed_at: at, reviewed_by: me };
}

/** The brand as the server holds it now, kept as the page's copy (background runs move it after Create). */
async function freshBrand(ctx: PersistContext): Promise<MarketingBrand> {
  const brand = await getBrand(ctx.getBrand().id);
  ctx.setBrand(brand);
  return brand;
}

type DiscoveredInsert = {
  brand_id: string;
  category: string;
  guessed_kind: string;
  url: string | null | undefined;
  value: Json;
  status: string;
  relation_key: string | null;
  sentiment: PersistOptions["sentiment"];
  reviewed_at: string | null;
  reviewed_by: string | null;
  resolved_property_id?: string;
  resolved_fact_id?: string;
};

/** The row the dedup index says is this finding (same brand, category, kind, url and value), answered in place. */
async function answerTwinRow(
  w: Awaited<ReturnType<typeof db>>,
  row: DiscoveredInsert,
  answerCtx: Record<string, unknown>,
  key: string,
): Promise<{ id: string; undo: () => Promise<void> }> {
  let q = w
    .from("discovered_item")
    .select("id, status, relation_key, sentiment, reviewed_at, reviewed_by, context, resolved_property_id, resolved_fact_id, deleted_at")
    .eq("brand_id", row.brand_id)
    .eq("category", row.category)
    .eq("guessed_kind", row.guessed_kind)
    .eq("value", JSON.stringify(row.value));
  q = row.url ? q.eq("url", row.url) : q.is("url", null);
  const found = await q.limit(1).maybeSingle();
  if (found.error) throw new Error(found.error.message);
  if (!found.data) throw new Error("It tried to save a record that already existed, and that record could not be read.");
  const was = found.data;
  const context = { ...(isJsonRecord(was.context) ? was.context : {}), answer: answerCtx, answered_as: key } as Json;
  const { error } = await w
    .from("discovered_item")
    .update({
      deleted_at: null,
      status: row.status,
      relation_key: row.relation_key,
      sentiment: row.sentiment,
      reviewed_at: row.reviewed_at,
      reviewed_by: row.reviewed_by,
      context,
      ...(row.resolved_property_id ? { resolved_property_id: row.resolved_property_id } : {}),
      ...(row.resolved_fact_id ? { resolved_fact_id: row.resolved_fact_id } : {}),
    })
    .eq("id", was.id);
  // access-errors: ok — a write failure on the person's own answer, shown as "Not saved"
  if (error) throw new Error(error.message);
  return {
    id: was.id,
    undo: async () => {
      const { error: e } = await (await db())
        .from("discovered_item")
        .update({
          deleted_at: was.deleted_at,
          status: was.status,
          relation_key: was.relation_key,
          sentiment: was.sentiment,
          reviewed_at: was.reviewed_at,
          reviewed_by: was.reviewed_by,
          context: was.context,
          resolved_property_id: was.resolved_property_id,
          resolved_fact_id: was.resolved_fact_id,
        })
        .eq("id", was.id);
      // access-errors: ok — an undo write on the person's own answer; the tray shows "Not saved"
      if (e) throw new Error(e.message);
    },
  };
}

async function recordDiscovered(
  ctx: PersistContext,
  item: FocusItem,
  answer: Answer,
  relationKey: string | null,
  value: string,
  resolved: { resolved_property_id?: string; resolved_fact_id?: string },
  trail: { homes: string[]; before: Record<string, Json>; kept?: string[] } = { homes: [], before: {} },
  sentiment: PersistOptions["sentiment"] = null,
  from: "smart_add.validate" | "smart_add.create" = "smart_add.validate",
): Promise<{ id: string; undo: () => Promise<void> }> {
  const brand = ctx.getBrand();
  const w = await db();
  // The answer records the person who gave it (single-source plan § 2.2): reviewed_by with every reviewed_at.
  const me = await signedInPersonId(supabase);
  const at = new Date().toISOString();
  const status = CONFIRMED.has(answer) ? "confirmed" : DISMISSED.has(answer) ? "dismissed" : "pending";
  const answerCtx = {
    answer,
    by: "person",
    at,
    from,
    // What the answer wrote and what it replaced: a reload's Undo (savedAnswers.ts) takes it back from this alone.
    homes: trail.homes,
    before: trail.before,
    // Homes named here that were on the brand before this answer: an Undo never takes them away.
    ...(trail.kept?.length ? { kept: trail.kept } : {}),
    suggested: item.suggestion ? (item.suggestion as unknown as Json) : null,
    ...(item.fact && value !== item.fact.value ? { edited_from: item.fact.value } : {}),
  };
  // Every saved row this card answers: the finding and each copy folded into it (fold.ts) — settled together.
  const existing = await w
    .from("discovered_item")
    .select("id, status, relation_key, sentiment, reviewed_at, reviewed_by, context, resolved_property_id, resolved_fact_id")
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
            sentiment: before.sentiment,
            reviewed_at: before.reviewed_at,
            reviewed_by: before.reviewed_by,
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
        .update({ status, relation_key, sentiment, reviewed_at: at, reviewed_by: me, context, ...(isLead ? resolved : {}) })
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
  // An answer taken back (Undo, or changed in the enrich review) soft-deleted its row; the dedup index is not partial,
  // so answering the same finding again REVIVES that row — a fresh insert would collide (23505) and the answer be lost.
  const gone = await w
    .from("discovered_item")
    .select("id, status, relation_key, sentiment, reviewed_at, context, resolved_property_id, resolved_fact_id, deleted_at")
    .eq("brand_id", brand.id)
    .eq("source", "smart_add")
    .eq("context->>evidence_key", item.key)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (gone.error) throw new Error(gone.error.message);
  if (gone.data) {
    const was = gone.data;
    const context = { ...(isJsonRecord(was.context) ? was.context : {}), answer: answerCtx } as Json;
    const { error } = await w
      .from("discovered_item")
      .update({ deleted_at: null, status, relation_key, sentiment, ...reviewStamp(status, answer, at, me), context, ...resolved })
      .eq("id", was.id);
    // access-errors: ok — a write failure on the person's own answer, shown as "Not saved"
    if (error) throw new Error(error.message);
    return {
      id: was.id,
      undo: async () => {
        const { error: e } = await (await db())
          .from("discovered_item")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", was.id);
        // access-errors: ok — an undo write on the person's own answer; the tray shows "Not saved"
        if (e) throw new Error(e.message);
      },
    };
  }
  const ev = item.evidence;
  const row = {
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
        : {
            text: value,
            label: ev?.label ?? null,
            handle: ev?.handle ?? null,
            followers: ev?.followers ?? null,
            // A web result keeps what the search said and what the server recognized the page as (Create's row,
            // relations.routeWebChoices): the recognition homes read `site_kind` (aidream brand_profile/recognitions.py).
            ...(ev?.snippet ? { snippet: ev.snippet } : {}),
            ...(ev?.siteKind ? { site_kind: { ...ev.siteKind } } : {}),
          }) as Json,
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
      sentiment,
      ...reviewStamp(status, answer, at, me),
      ...resolved,
  };
  const inserted = await w.from("discovered_item").insert(row).select("id").single();
  if (inserted.error?.code === "23505") {
    // The same finding is already saved under another key (live 2026-10-22, Four Barrel Coffee: the About card came
    // from the fact finder as `fact:description:…` while Create had saved the same value as `description:<80 chars>`):
    // the dedup index (brand, category, kind, url, md5(value)) holds it, so the answer settles THAT row instead of
    // failing "Not saved".
    return await answerTwinRow(w, row, answerCtx, item.key);
  }
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

async function patchProfile(ctx: PersistContext, edit: (profile: Record<string, Json>) => Record<string, Json>, before?: Record<string, Json>) {
  // Edited against the profile the server holds now: a background write never turns this answer into a conflict (MKT-151).
  const written = await mergeBrandProfile(ctx.getBrand().id, edit);
  ctx.setBrand(written.brand);
  const was = written.before;
  if (before) before.profile = was as Json;
  const now = (isJsonRecord(written.brand.profile) ? written.brand.profile : {}) as Record<string, Json>;
  const touched = [...new Set([...Object.keys(was), ...Object.keys(now)])].filter((k) => JSON.stringify(was[k] ?? null) !== JSON.stringify(now[k] ?? null));
  // Undo puts back only the keys this answer changed, onto whatever the profile holds by then.
  return async () => {
    const restored = await mergeBrandProfile(ctx.getBrand().id, (p) => {
      const next = { ...p };
      for (const k of touched) {
        if (k in was) next[k] = was[k];
        else delete next[k];
      }
      return next;
    });
    ctx.setBrand(restored.brand);
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

async function addSite(
  ctx: PersistContext,
  url: string,
  /** The answer that made the site, once recorded with its `caused` edge: its undo acts as exactly that answer. */
  decisionOf: () => string | null = () => null,
): Promise<{ id: string | null; note?: string; undo: () => Promise<void> }> {
  const brand = ctx.getBrand();
  const parsed = normalizeWebsiteUrl(url);
  const host = parsed.hostname.toLowerCase();
  // A site the brand already tracks is a person's (or an earlier answer's): the RPC hands it back, and taking this answer
  // back must never delete it. Only a site this answer creates is recorded as its home and removed by its undo.
  const existing = await (await db())
    .from("site")
    .select("id")
    .eq("brand_id", brand.id)
    .eq("domain", host)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  const claim = await claimSite(liveSiteClaimDeps, {
    organizationId: ctx.organizationId,
    brandId: brand.id,
    rootUrl: parsed.toString(),
    host,
  });
  // A site another brand tracks stays with it (never reassigned here); this brand got its own website row.
  if (claim.kind === "tracked-elsewhere") return { id: null, note: claim.note, undo: async () => {} };
  const site = claim.site;
  // The crawl every confirmed site gets (as on Create), on the server; never blocks the answer.
  startIngest(ctx, site.id, { sites: [site.id] });
  if (existing.data?.id === site.id) return { id: null, undo: async () => {} };
  // Undo goes through the retraction door (never a bare site delete): what the site's crawl found goes with it.
  return { id: site.id, undo: async () => void (await withdrawSite(site.id, decisionOf())) };
}

/** A live web.business_fact on the brand of this finding's kind with the same text (case and spacing ignored). */
async function sameFactOnBrand(ctx: PersistContext, item: FocusItem, value: string): Promise<string | null> {
  const field = item.fact?.field ?? item.evidence?.field;
  if (!field) return null;
  const norm = (v: string) => v.trim().replace(/\s+/g, " ").toLowerCase();
  const wanted = new Set([value, item.fact?.value ?? ""].filter(Boolean).map(norm));
  const { data, error } = await (await db())
    .from("business_fact")
    .select("id, kind, value")
    .eq("brand_id", ctx.getBrand().id)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
  const kind = factKindFor(field, await loadFactRules());
  const hit = (data ?? []).find((row) => {
    if (row.kind !== kind) return false;
    const v = isJsonRecord(row.value) ? (row.value.text ?? row.value.url) : row.value;
    return typeof v === "string" && wanted.has(norm(v));
  });
  return hit?.id ?? null;
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
  trail: Record<string, Json>,
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
  // No link (the card came from another round or step): the same fact already on the brand is the one to settle,
  // so a Yes never writes it twice (MKT-179: a tagline Create kept was written again by the validate Yes).
  const factId = link.data?.resolved_fact_id ?? (await sameFactOnBrand(ctx, item, value));
  if (!factId) return false;
  const current = await w
    .from("business_fact")
    .select("id, value, confirmed_at, confirmed_by, metadata, version, deleted_at")
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
          confirmed_by: await signedInPersonId(supabase),
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
  trail.fact = { value: before.value, confirmed_at: before.confirmed_at, confirmed_by: before.confirmed_by, metadata: before.metadata, kept: true };
  undos.push(async () => {
    const { error: e } = await (await db())
      .from("business_fact")
      .update({ value: before.value, confirmed_at: before.confirmed_at, confirmed_by: before.confirmed_by, metadata: before.metadata, deleted_at: null, version: before.version + 2 })
      .eq("id", factId);
    if (e) throw new Error(e.message);
  });
  return true;
}

async function addExclusion(ctx: PersistContext, item: FocusItem, relationKey = "not_us"): Promise<{ id: string | null; undo: () => Promise<void> }> {
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
      relation_key: relationKey,
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

/**
 * One save at a time per finding: two answers to the same card (a repeated key press, two tabs of the tray) read
 * "no row yet" together and each inserted one. The second now waits, finds the first's row, and answers it in place.
 */
const saving = new Map<string, Promise<unknown>>();

/** Save one answer in its homes. `relationKey` for Related; `value` for an edited fact. */
export async function persistAnswer(
  ctx: PersistContext,
  item: FocusItem,
  answer: Answer,
  opts: PersistOptions = {},
): Promise<Persisted> {
  const slot = `${ctx.getBrand().id}:${item.key}`;
  const turn = (saving.get(slot) ?? Promise.resolve())
    .catch(() => undefined)
    .then(() => persistAnswerOnce(ctx, item, answer, opts))
    .then((persisted) => (CONFIRMED.has(answer) && !opts.created ? withPromotion(ctx, persisted) : persisted));
  saving.set(slot, turn);
  try {
    return await turn;
  } finally {
    if (saving.get(slot) === turn) saving.delete(slot);
  }
}

/**
 * One promotion at a time per brand: the server reconciles EVERY confirmed finding on each call, so two overlapping
 * calls would credit one answer's new rows to the other, and taking an answer back would miss its rows (or the
 * other's). Serialized, each call's `createdIds` belong to the answer that triggered it.
 */
const promoting = new Map<string, Promise<unknown>>();

async function promoteOnce(brandId: string): Promise<Awaited<ReturnType<typeof promoteSmartAddFindings>>> {
  const turn = (promoting.get(brandId) ?? Promise.resolve()).catch(() => undefined).then(() => promoteSmartAddFindings(brandId));
  promoting.set(brandId, turn);
  try {
    return await turn;
  } finally {
    if (promoting.get(brandId) === turn) promoting.delete(brandId);
  }
}

/**
 * The rows a promotion created are kept on the answer's own row (context.answer.promoted), so taking the answer back
 * on a LATER visit (a reopened Enrich, the brand page's table) removes exactly them — never a row a person made.
 */
async function recordPromoted(discoveredId: string, createdIds: Record<string, string[]>): Promise<void> {
  const w = await db();
  const current = await w.from("discovered_item").select("context").eq("id", discoveredId).maybeSingle();
  if (current.error) throw new Error(current.error.message);
  const context = isJsonRecord(current.data?.context) ? current.data.context : {};
  const answer = isJsonRecord(context.answer) ? context.answer : {};
  const promoted = Object.fromEntries(Object.entries(createdIds).filter(([, ids]) => ids.length));
  const { error } = await w
    .from("discovered_item")
    .update({ context: { ...context, answer: { ...answer, promoted } } as unknown as Json })
    .eq("id", discoveredId);
  if (error) throw new Error(error.message);
}

/**
 * A confirmed answer lands in the brand's home tables through the server's ONE promotion (promote.ts): the person
 * linked, the location added, the listing, the keyword, the rival, the backlink. Undo removes exactly the rows that
 * promotion created, then the answer; the ids are also kept on the answer's row for a later visit. The answer is
 * already saved, so a promotion that fails is said, never thrown.
 */
async function withPromotion(ctx: PersistContext, persisted: Persisted): Promise<Persisted> {
  try {
    const promoted = await promoteOnce(ctx.getBrand().id);
    for (const problem of promoted.problems) toast.error(problem);
    const homes = promotedHomes(promoted);
    if (!homes.length) return persisted;
    if (persisted.discoveredId) {
      try {
        await recordPromoted(persisted.discoveredId, promoted.createdIds);
      } catch (error) {
        toast.error(`Saved, but changing this answer later may leave its pages behind: ${extractErrorMessage(error)}`);
      }
    }
    return {
      ...persisted,
      homes: [...persisted.homes, ...homes],
      undo: async () => {
        await undoPromotion(promoted.createdIds);
        await persisted.undo();
      },
    };
  } catch (error) {
    toast.error(`Saved, but not added to the brand's pages yet: ${extractErrorMessage(error)}`);
    return persisted;
  }
}

/** A core gap card (MKT-143): the typed website / account / name lands where Create would have put it; anything else is a skip. */
async function persistGap(ctx: PersistContext, item: FocusItem, answer: Answer, value: string): Promise<Persisted> {
  const none: Persisted = { discoveredId: null, homes: [], undo: async () => undefined };
  if (answer !== "correct" || !value) return none;
  const kind = item.key.slice(GAP_PREFIX.length);
  if (kind === "website") {
    const site = await addSite(ctx, value);
    return { ...none, homes: site.id ? [`web.site:${site.id}`] : [], undo: site.undo };
  }
  if (kind === "account") {
    const parsed = resolveAccountInput({ text: value });
    if (parsed.status !== "ok") throw new Error("That is not a social account link or @handle we can read.");
    const row = await createProperty({
      organizationId: ctx.organizationId,
      brandId: ctx.getBrand().id,
      kind: parsed.platform as Parameters<typeof createProperty>[0]["kind"],
      url: parsed.url ?? null,
      handle: parsed.handle,
      displayName: null,
      status: "active",
    });
    startIngest(ctx, row.id, { accounts: [{ handle_or_url: parsed.url ?? parsed.handle, platform: parsed.platform, property_id: row.id }] });
    return { ...none, homes: [`web.property:${row.id}`], undo: async () => deleteProperty(row.id) };
  }
  if (kind === "name") {
    const brand = ctx.getBrand();
    const before = brand.name;
    ctx.setBrand(await updateBrand({ brandId: brand.id, expectedVersion: brand.version, base: brand, patch: { name: value } }));
    return {
      ...none,
      homes: [`web.brand.name:${brand.id}`],
      undo: async () => {
        const latest = ctx.getBrand();
        ctx.setBrand(await updateBrand({ brandId: latest.id, expectedVersion: latest.version, base: latest, patch: { name: before } }));
      },
    };
  }
  return none;
}

async function persistAnswerOnce(
  ctx: PersistContext,
  item: FocusItem,
  answer: Answer,
  opts: PersistOptions = {},
): Promise<Persisted> {
  const homes: string[] = [];
  const undos: (() => Promise<void>)[] = [];
  const before: Record<string, Json> = {};
  const resolved: { resolved_property_id?: string; resolved_fact_id?: string } = {};
  const value = opts.value?.trim() || item.value;
  const ev = item.evidence;
  let siteId: string | null = null;
  // Set once the answer row AND its `caused` edge to the site exist: the site's undo then names this answer.
  let decidedId: string | null = null;

  if (answer === "later" && !opts.recordMark) return { discoveredId: null, homes, undo: async () => undefined };
  if (item.key.startsWith(GAP_PREFIX)) return persistGap(ctx, item, answer, value);

  if (answer === "ours" && item.kind === "account" && ev && opts.created?.propertyId) {
    // Create made the property (and starts its tracking in the setup run): the answer names it, and a failed record
    // never takes Create's row back (no undo here; a later undo goes through the retraction, which reads the link).
    resolved.resolved_property_id = opts.created.propertyId;
    homes.push(`web.property:${opts.created.propertyId}`);
  } else if (answer === "ours" && item.kind === "account" && ev) {
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
  if (answer === "ours" && (item.kind === "website" || item.kind === "web") && ev && opts.created?.siteId) {
    // Create claimed the site (and crawls it in the setup run): the answer names it (same rule as the account above).
    siteId = opts.created.siteId;
    homes.push(`web.site:${siteId}`);
  } else if (answer === "ours" && (item.kind === "website" || item.kind === "web") && ev) {
    const root = item.kind === "website" ? (ev.url ?? ev.value) : webSiteRoot(ev);
    if (root) {
      const site = await addSite(ctx, root, () => decidedId);
      siteId = site.id;
      if (site.id) homes.push(`web.site:${site.id}`);
      undos.push(site.undo);
    }
  }
  if (answer === "ours" && item.kind === "logo") {
    // MKT-048: Yes on a logo saves it — a library asset, and the brand's own logo when it has none yet,
    // so the header and Brand assets stop showing a placeholder. A second yes adds a non-primary asset.
    const url = (ev?.image_url ?? item.value ?? "").trim();
    if (!/^https?:\/\//i.test(url)) throw new Error("This logo has no picture address to save.");
    // Whether the brand has a logo yet is read now: the setup run saves one in the background after Create.
    const brand = await freshBrand(ctx);
    // A profile picture belongs to the account it came from: a person's account never gives the brand its logo.
    const account = ev?.source.kind === "social_profile"
      ? sourceAccountOf(await listBrandPropertiesForMatching(brand.id), ev.platform, ev.source.url)
      : null;
    if (account?.owner_kind === "person") throw new Error("This is a person's profile picture, not the brand's logo.");
    const makePrimary = !brand.logo_url;
    const asset = await createBrandAsset({
      organizationId: ctx.organizationId,
      brandId: brand.id,
      kind: brand.kind === "person" ? "headshot" : "logo",
      sourceUrl: url,
      title: item.title ?? ev?.label ?? null,
      notes: `Smart Add validation · ${ev?.source.where ?? ev?.source.kind ?? "found"}${ev?.source.url ? ` · ${ev.source.url}` : ""}`,
      isPrimary: makePrimary,
      source: "discovered",
      ...(account ? { metadata: { source_property_id: account.id, source_platform: account.kind } } : {}),
    });
    homes.push(`web.brand_asset:${asset.id}`);
    undos.push(() => deleteBrandAsset(asset.id));
    if (makePrimary) {
      ctx.setBrand(await updateBrand({ brandId: brand.id, expectedVersion: brand.version, base: brand, patch: { logo_url: url } }));
      homes.push(`web.brand.logo_url:${brand.id}`);
      undos.push(async () => {
        const latest = ctx.getBrand();
        ctx.setBrand(await updateBrand({ brandId: latest.id, expectedVersion: latest.version, base: latest, patch: { logo_url: null } }));
      });
    }
  }
  if (answer === "preferred" && item.kind === "name") {
    const brand = ctx.getBrand();
    const nameBefore = brand.name;
    before.name = nameBefore;
    const next = await updateBrand({ brandId: brand.id, expectedVersion: brand.version, base: brand, patch: { name: value } });
    ctx.setBrand(next);
    homes.push(`web.brand.name:${brand.id}`);
    undos.push(async () => {
      const latest = ctx.getBrand();
      ctx.setBrand(await updateBrand({ brandId: latest.id, expectedVersion: latest.version, base: latest, patch: { name: nameBefore } }));
    });
  }
  if (answer === "alias" && item.kind === "name") {
    const undo = await patchProfile(ctx, (p) => {
      const aliases = parseBrandProfile(p as Json).brand_aliases ?? [];
      return aliases.includes(value) ? p : { ...p, brand_aliases: [...aliases, value] };
    }, before);
    homes.push(`web.brand.profile.brand_aliases:${ctx.getBrand().id}`);
    undos.push(undo);
  }
  if (answer === "related" && opts.relationKey) {
    const kind = ctx.kinds.find((k) => k.key === opts.relationKey);
    if (kind && (kind.routesTo === "owns" || kind.routesTo === "key_person")) {
      // MKT-043: Founder / Key person makes the person and links them to the brand, the same path Create uses.
      // The name is the person's (typed, or the account's own name) — never a page title.
      const name = (opts.value?.trim() || (item.kind === "account" ? (item.title ?? item.value) : "")).trim();
      if (!name && !opts.allowUnnamed) throw new Error(`${kind.label} needs the person's name.`);
    }
    // No name yet (allowUnnamed): only the decision is kept below; the person is made when the name is given.
    const personName = (opts.value?.trim() || (item.kind === "account" ? (item.title ?? item.value) : "")).trim();
    if (kind && (kind.routesTo === "owns" || kind.routesTo === "key_person") && personName) {
      const name = personName;
      const page = item.kind === "web" || item.kind === "website";
      const person = await linkPersonToBrand(
        ctx.organizationId,
        ctx.getBrand().id,
        name,
        { routesTo: kind.routesTo, label: kind.label },
        { url: item.openUrl, platform: page ? "website" : (item.platform ?? ev?.platform ?? null), bio: item.detail },
      );
      homes.push(`crm.party:${person.partyId}`, person.home);
      undos.push(async () => {
        const gone = await associationsService.remove({
          sourceType: "party",
          sourceId: person.partyId,
          targetType: "web_brand",
          targetId: ctx.getBrand().id,
          role: kind.routesTo ?? undefined,
        });
        if (!gone.ok) throw new Error(gone.error.message);
      });
    }
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
      }, before);
      homes.push(`web.brand.profile.competitors:${ctx.getBrand().id}`);
      undos.push(undo);
    }
    // Namesake (and any other "not us" kind) lands on the brand's NO LIST with its own relationship.
    if (kind?.routesTo === "exclusion") {
      const ex = await addExclusion(ctx, item, kind.key);
      if (ex.id) homes.push(`web.brand_exclusion:${ex.id}`);
      undos.push(ex.undo);
    }
  }
  if (answer === "not_us") {
    if (opts.created?.existing) {
      // Not ours after all: the home it was saved as leaves the brand with everything that grew from it.
      const taken: RetractionSummary[] = [];
      try {
        if (opts.created.siteId) taken.push(await applyRetraction("site", opts.created.siteId, false));
        if (opts.created.propertyId) taken.push(await applyRetraction("property", opts.created.propertyId, false));
      } catch (error) {
        for (const t of [...taken].reverse()) await restoreRetraction(t).catch(() => undefined);
        throw error;
      }
      before.retractions = taken as unknown as Json;
      undos.push(async () => {
        for (const t of [...taken].reverse()) await restoreRetraction(t);
      });
    }
    const ex = await addExclusion(ctx, item);
    if (ex.id) homes.push(`web.brand_exclusion:${ex.id}`);
    undos.push(ex.undo);
  }
  const profileHome = answer === "correct" && item.fact ? profileHomeFor(item.fact.field, await loadFactRules()) : null;
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
    }, before);
    homes.push(`web.brand.profile.${profileHome}:${ctx.getBrand().id}`);
    undos.push(undo);
  } else if ((answer === "correct" || answer === "wrong") && item.kind === "fact" && (await settleKeptFact(ctx, item, answer, value, resolved, homes, undos, before))) {
    // The fact Create kept (keptFacts.ts) is settled in place: confirmed, or soft-deleted — never a second row.
  } else if (answer === "correct" && item.kind === "fact") {
    const field = item.fact?.field ?? ev?.field ?? "other";
    const kind = factKindFor(field, await loadFactRules());
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
              found_by: item.fact.mandate ?? "brand_intake.early_facts",
              field: item.fact.field,
              field_label: item.fact.field_label,
              found_value: item.fact.value,
              certainty: item.fact.certainty,
              reason: item.fact.reason,
              evidence_urls: item.fact.evidence_urls,
            },
          }
        : ev
          ? { source: "discovered" as const, metadata: { found_by: foundByForSource(ev.source.node, ev.source.kind, ev.source.mandate), where: ev.source.where, url: ev.source.url } }
          : // Still a validation-queue item (it lands in web.discovered_item below): found, then confirmed.
            { source: "discovered" as const }),
    });
    resolved.resolved_fact_id = fact.id;
    homes.push(`web.business_fact:${fact.id}`);
    undos.push(() => deleteBusinessFact(fact.id));
  }

  try {
    const discovered = await recordDiscovered(
      ctx,
      item,
      answer,
      opts.relationKey ?? null,
      value,
      resolved,
      { homes: [...homes], before, kept: keptHomes(opts).filter((h) => homes.includes(h)) },
      opts.sentiment ?? null,
      opts.created && !opts.created.existing ? "smart_add.create" : "smart_add.validate",
    );
    homes.unshift(`web.discovered_item:${discovered.id}`);
    undos.unshift(discovered.undo);
    // Provenance: the site exists because of this decision (the account's is resolved_property_id).
    if (siteId) {
      await recordCause(ctx, discovered.id, "web_site", siteId);
      decidedId = discovered.id;
    }
    return {
      discoveredId: discovered.id,
      // A home this answer brought in is taken back through the retraction; a home that predates it (existing) never is.
      ...((resolved.resolved_property_id && !opts.created?.existing) || (siteId && !(opts.created?.existing && opts.created.siteId))
        ? { retraction: { rootType: "decision" as const, rootId: discovered.id } }
        : {}),
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
