/**
 * Web review decisions ("On the web": Ours / Backlink / Mentions us / Not us / Former / Broken link / Maybe …) once a
 * brand exists — saved the moment they are made, through the ONE answer path the validation page uses
 * (validate/persist.ts → web.discovered_item status + relation_key + sentiment, the answer's own homes, then the
 * server's promotion). Before this, Enrich held every web answer only in the page's memory and Apply wrote none of
 * them (2026-10-17: 40+ answers on brand ai-matrx were lost).
 *
 *   answerForWebChoice      → which answer a relationship is (Ours / Not us / Related + its key)
 *   WebDecisionSaver        → one saver per brand: each decision saved in order per finding, a changed decision takes
 *                             the earlier one back first, every failure reported (never swallowed), flush() before Apply
 *   loadSavedWebDecisions   → the brand's saved web answers, so a reloaded Enrich shows them answered again
 *   changeWebDecision       → the brand page's "On the web" table changing one row's relationship (same path)
 *
 * Pure planning here is tested (`__tests__/enrichWebDecisions.test.ts`); the writes are persist.ts's.
 */

import { readAllRows } from "@ai-matrx/data/db";
import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb } from "@/utils/supabase/webDb";
import type { BrandRelationKind } from "@/features/marketing/data/service";
import { extractErrorMessage } from "@/utils/errors";
import { persistAnswer, type PersistContext, type Persisted, type PersistOptions } from "./validate/persist";
import { focusFromEvidence, type Answer, type FocusItem } from "./validate/queue";
import type { EvidenceField, EvidenceItem } from "./evidence";
import { webIdentity, type SuggestContext, type WebChoice } from "./webKinds";

/** Which answer a web relationship is: Ours adds the site, Not us lands on the NO LIST, anything else is Related. */
export function answerForWebChoice(kind: Pick<BrandRelationKind, "key" | "routesTo">): { answer: Answer; relationKey: string | null } {
  if (kind.key === "ours") return { answer: "ours", relationKey: null };
  if (kind.key === "not_us") return { answer: "not_us", relationKey: null };
  return { answer: "related", relationKey: kind.key };
}

export const isPersonKind = (kind: Pick<BrandRelationKind, "routesTo"> | undefined): boolean =>
  kind?.routesTo === "owns" || kind?.routesTo === "key_person";

export type WebSaveState = "saving" | "saved" | "failed";

export interface WebSaveStatus {
  state: WebSaveState;
  error: string | null;
}

interface Held {
  choice: WebChoice | null;
  /** The person's name a Founder / Key person answer was saved with ("" = none yet). */
  name: string;
  /** This visit's save (its undo takes the answer back); null for an answer restored from an earlier visit. */
  persisted: Persisted | null;
  state: WebSaveState;
  error: string | null;
}

export interface WebDecisionSaverDeps {
  kinds: () => BrandRelationKind[];
  suggest: () => SuggestContext;
  persist: (item: FocusItem, answer: Answer, opts: PersistOptions) => Promise<Persisted>;
  /** A saved answer the person cleared again (restored from an earlier visit): its row goes back to undecided. */
  reopen: (key: string) => Promise<void>;
  onStatus: (key: string, status: WebSaveStatus) => void;
  /** Said out loud and filed (validate/notSaved.ts), never only a console line. */
  onFailed: (item: EvidenceItem, label: string, error: unknown) => void;
}

/**
 * One brand's web decisions. `decide` is called the moment a row is answered; each finding's saves run in order
 * (a fast re-answer waits for the earlier one, then replaces it). `flush` waits for every save and retries any that
 * failed or still need a person's name — Apply calls it, so nothing the person answered can stay unsaved silently.
 */
export class WebDecisionSaver {
  private held = new Map<string, Held>();
  private chains = new Map<string, Promise<void>>();

  constructor(private deps: WebDecisionSaverDeps) {}

  status(key: string): WebSaveStatus | null {
    const h = this.held.get(key);
    return h ? { state: h.state, error: h.error } : null;
  }

  /** Answers already saved on an earlier visit: shown answered, never written again unless changed. */
  markRestored(key: string, choice: WebChoice): void {
    if (this.held.has(key)) return;
    this.held.set(key, { choice, name: "", persisted: null, state: "saved", error: null });
  }

  decide(item: EvidenceItem, choice: WebChoice | null, name = ""): Promise<void> {
    const prev = this.chains.get(item.key) ?? Promise.resolve();
    const run = prev.catch(() => undefined).then(() => this.saveOne(item, choice, name.trim()));
    this.chains.set(item.key, run);
    return run;
  }

  private set(key: string, h: Held) {
    this.held.set(key, h);
    this.deps.onStatus(key, { state: h.state, error: h.error });
  }

  private async saveOne(item: EvidenceItem, choice: WebChoice | null, name: string): Promise<void> {
    const before = this.held.get(item.key);
    const kind = choice ? this.deps.kinds().find((k) => k.key === choice.kind) : undefined;
    if (choice && !kind) {
      this.set(item.key, { choice, name, persisted: before?.persisted ?? null, state: "failed", error: `Unknown relationship ${choice.kind}` });
      this.deps.onFailed(item, item.label ?? item.value, new Error(`Unknown relationship ${choice.kind}`));
      return;
    }
    this.set(item.key, { choice, name, persisted: before?.persisted ?? null, state: "saving", error: null });
    try {
      // A changed answer takes the earlier one back first (its exclusion, site, person, competitor), then saves anew.
      if (before?.persisted) await before.persisted.undo();
      if (!choice || !kind) {
        if (before && !before.persisted && before.choice) await this.deps.reopen(item.key);
        this.held.delete(item.key);
        this.deps.onStatus(item.key, { state: "saved", error: null });
        return;
      }
      const focus = focusFromEvidence(item, this.deps.kinds(), this.deps.suggest());
      if (!focus) throw new Error("This result cannot be saved");
      const { answer, relationKey } = answerForWebChoice(kind);
      const persisted = await this.deps.persist(focus, answer, {
        relationKey,
        sentiment: kind.hasSentiment ? (choice.sentiment ?? null) : null,
        // Founder / Key person on a page: the decision is kept now; the person is made once a name is given.
        ...(isPersonKind(kind) ? { value: name || undefined, allowUnnamed: true } : {}),
      });
      this.set(item.key, { choice, name, persisted, state: "saved", error: null });
    } catch (error) {
      this.set(item.key, { choice, name, persisted: null, state: "failed", error: extractErrorMessage(error) });
      this.deps.onFailed(item, item.label ?? item.value, error);
    }
  }

  /**
   * Before Apply: wait for every save, then save again what failed, what was never saved, and a Founder / Key person
   * whose name changed since. Returns what is saved now and what is not (by key, with the reason).
   */
  async flush(
    items: EvidenceItem[],
    choices: Record<string, WebChoice>,
    names: (key: string) => string,
  ): Promise<{ saved: string[]; failed: { key: string; error: string }[] }> {
    await Promise.all([...this.chains.values()].map((c) => c.catch(() => undefined)));
    const redo: Promise<void>[] = [];
    for (const item of items) {
      const choice = choices[item.key];
      if (!choice) continue;
      const h = this.held.get(item.key);
      const kind = this.deps.kinds().find((k) => k.key === choice.kind);
      const name = names(item.key).trim();
      const stale =
        !h ||
        h.state === "failed" ||
        h.choice?.kind !== choice.kind ||
        (h.choice?.sentiment ?? null) !== (choice.sentiment ?? null) ||
        (isPersonKind(kind) && name !== h.name);
      if (stale) redo.push(this.decide(item, choice, name));
    }
    await Promise.all(redo);
    const saved: string[] = [];
    const failed: { key: string; error: string }[] = [];
    for (const item of items) {
      if (!choices[item.key]) continue;
      const h = this.held.get(item.key);
      if (h?.state === "saved") saved.push(item.key);
      else failed.push({ key: item.key, error: h?.error ?? "Not saved" });
    }
    return { saved, failed };
  }
}

// ── The brand's saved web answers ─────────────────────────────────────────────────────────────────────────────

export interface WebDecisionRow {
  id: string;
  url: string;
  label: string;
  host: string;
  relationKey: string;
  sentiment: "positive" | "neutral" | "negative" | null;
  status: string;
  /** What the run found it as (web_page / mention / listing / website …). */
  field: string | null;
  /** The finding key the answer was given on (absent on Create's rows). */
  evidenceKey: string | null;
  where: string | null;
  decidedAt: string | null;
  source: string;
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

function hostOf(url: string): string {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** One stored row in the screen's words (pure; tested). */
export function toWebDecisionRow(row: {
  id: string;
  url: string | null;
  value: unknown;
  context: unknown;
  relation_key: string | null;
  sentiment: string | null;
  status: string;
  guessed_kind: string | null;
  reviewed_at: string | null;
  source: string;
}): WebDecisionRow | null {
  const value = rec(row.value);
  const url = str(row.url) ?? str(value.text);
  if (!url || !row.relation_key) return null;
  const context = rec(row.context);
  const answer = rec(context.answer);
  const sentiment = row.sentiment === "positive" || row.sentiment === "neutral" || row.sentiment === "negative" ? row.sentiment : null;
  return {
    id: row.id,
    url: /^https?:\/\//i.test(url) ? url : `https://${url}`,
    label: str(value.label) ?? str(value.handle) ?? hostOf(url),
    host: hostOf(url),
    relationKey: row.relation_key,
    sentiment,
    status: row.status,
    field: row.guessed_kind,
    evidenceKey: str(context.evidence_key),
    where: str(context.where) ?? str(answer.from),
    decidedAt: row.reviewed_at,
    source: row.source,
  };
}

/** Every web result answered on this brand (Create's, Enrich's, the validation page's, added by hand), oldest first. */
export async function listBrandWebDecisions(brandId: string): Promise<WebDecisionRow[]> {
  const db = await authenticatedWebDb(supabase);
  const rows = await readAllRows(
    ({ from, to }) =>
      db
        .from("discovered_item")
        .select("id, url, value, context, relation_key, sentiment, status, guessed_kind, reviewed_at, source", { count: "exact" })
        .eq("brand_id", brandId)
        .eq("category", "link")
        .not("relation_key", "is", null)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    { label: "web.discovered_item (web decisions)" },
  );
  return rows.map(toWebDecisionRow).filter((r): r is WebDecisionRow => Boolean(r));
}

/**
 * The saved answer for each run finding, matched by the finding key it was given on, else by its web address
 * (Create's rows carry no key). Pure; tested.
 */
export function matchSavedWebDecisions(items: EvidenceItem[], rows: WebDecisionRow[]): Record<string, WebChoice> {
  const byKey = new Map<string, WebDecisionRow>();
  const byAddress = new Map<string, WebDecisionRow>();
  for (const r of rows) {
    if (r.evidenceKey) byKey.set(r.evidenceKey, r);
    byAddress.set(webIdentity(r.url), r);
  }
  const out: Record<string, WebChoice> = {};
  for (const item of items) {
    const hit = byKey.get(item.key) ?? byAddress.get(webIdentity(item.url ?? item.value));
    if (hit) out[item.key] = { kind: hit.relationKey, sentiment: hit.sentiment };
  }
  return out;
}

/** "Reopen" a decision restored from an earlier visit: the row goes back to an undecided candidate. */
export async function reopenWebDecision(brandId: string, evidenceKey: string): Promise<void> {
  const db = await authenticatedWebDb(supabase);
  const { error } = await db
    .from("discovered_item")
    .update({ status: "pending", relation_key: null, sentiment: null, reviewed_at: null })
    .eq("brand_id", brandId)
    .eq("context->>evidence_key", evidenceKey)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
}

/** The finding a saved row was, rebuilt so the ONE answer path can answer it again. */
function evidenceOfRow(row: WebDecisionRow, key: string): EvidenceItem {
  const field: EvidenceField = row.field === "listing" || row.field === "mention" || row.field === "website" ? row.field : "web_page";
  return {
    key,
    field,
    value: row.url,
    label: row.label,
    image_url: null,
    url: row.url,
    platform: null,
    handle: null,
    followers: null,
    verified: null,
    profile_id: null,
    source: { node: "brand_page", kind: "web_search", url: null, where: row.where },
    confidence: 1,
  };
}

/**
 * The brand page changing one row's relationship: the same answer path as the review (homes + promotion). A row
 * Create saved has no finding key yet, so it is given one first and answered in place (never a second row). A row
 * leaving "Not us" / Namesake comes off the brand's NO LIST.
 */
export async function changeWebDecision(
  ctx: PersistContext,
  row: WebDecisionRow,
  kind: BrandRelationKind,
  opts: { name?: string; sentiment?: WebDecisionRow["sentiment"] } = {},
): Promise<Persisted> {
  const db = await authenticatedWebDb(supabase);
  const key = row.evidenceKey ?? `discovered:${row.id}`;
  if (!row.evidenceKey) {
    const current = await db.from("discovered_item").select("context").eq("id", row.id).maybeSingle();
    if (current.error) throw new Error(current.error.message);
    const { error } = await db
      .from("discovered_item")
      // The answer path reads Smart Add's rows by finding key; where the row came from is kept beside it.
      .update({ source: "smart_add", context: { ...rec(current.data?.context), evidence_key: key, source_before: row.source } as never })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
  }
  const wasExcluded = ctx.kinds.find((k) => k.key === row.relationKey)?.routesTo === "exclusion";
  if (wasExcluded && kind.routesTo !== "exclusion") {
    const { error } = await db
      .from("brand_exclusion")
      .update({ deleted_at: new Date().toISOString() })
      .eq("brand_id", ctx.getBrand().id)
      .in("match_value", [row.host, webIdentity(row.url)])
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
  }
  const focus = focusFromEvidence(evidenceOfRow(row, key), ctx.kinds, { foundAccounts: [], ourHandles: [], ourHosts: [], ourAccounts: [], name: ctx.getBrand().name, place: null });
  if (!focus) throw new Error("This row cannot be changed here");
  const { answer, relationKey } = answerForWebChoice(kind);
  return persistAnswer(ctx, focus, answer, {
    relationKey,
    sentiment: kind.hasSentiment ? (opts.sentiment ?? row.sentiment ?? null) : null,
    ...(isPersonKind(kind) ? { value: opts.name, allowUnnamed: true } : {}),
  });
}

/** "Websites decided: 40 · 12 Ours · 9 Backlink …" — counts by relationship label, largest first (pure; tested). */
export function webDecisionCounts(choices: WebChoice[], kinds: Pick<BrandRelationKind, "key" | "label">[]): { total: number; parts: { label: string; count: number }[] } {
  const label = new Map(kinds.map((k) => [k.key, k.label]));
  const counts = new Map<string, number>();
  for (const c of choices) {
    const l = label.get(c.kind) ?? c.kind;
    counts.set(l, (counts.get(l) ?? 0) + 1);
  }
  const parts = [...counts.entries()].map(([l, count]) => ({ label: l, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return { total: choices.length, parts };
}
