/**
 * The brand session's reads and writes. Reads go straight to Supabase under the person's JWT; every decision goes
 * through ONE door each (rule 2: nothing is the brand until the person chooses it):
 *
 *   a choice placed, retracted (undo) or the person's words withdrawn → web.brand_choice_decide (person-signed;
 *     a single-value element supersedes its earlier chosen row in the same transaction; undo restores it)
 *   a long-press correction                                            → web.brand_choice_correct (origin said,
 *     grew_from the candidate it corrects)
 *   a finding confirmed / dismissed                                    → Smart Add's persistAnswer (its one confirm
 *     path, with undo) — never written here
 *   a page agent's rewording                                           → web.brand_choice_propose: an OPEN candidate
 *     (origin ai), never a choice
 */

import { readAllRows } from "@ai-matrx/data/db";

import type { Json } from "@/types/database.types";
import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb, signedInPersonId } from "@/utils/supabase/webDb";
import { listBrandRelationKinds, type BrandRelationKind } from "@/features/marketing/data/service";
import type { MarketingBrand } from "@/features/marketing/types";
import { suggestContext } from "@/features/marketing/smart-add/relations";
import { loadSavedFindings } from "@/features/marketing/smart-add/validate/fromSaved";
import { buildQueue, type FocusItem } from "@/features/marketing/smart-add/validate/queue";
import { EMPTY_KNOWN, foldQueue } from "@/features/marketing/smart-add/validate/fold";
import { partOf, type ChoiceRow, type DecideAction, type ElementRow, type Placement, type WordRow } from "./deck";

const CHOICE_COLUMNS =
  "id, brand_id, element_id, value, origin, recommended_placement, opinion_reason, word_signals, decision, placement, decided_by, decided_at, decision_reason, organization_id, created_at, created_by";

export const SESSION_VIA = "brand_session";

export interface SessionData {
  elements: ElementRow[];
  /** Every live candidate on the brand (open and decided); the hook decides which are cards this sitting. */
  choices: ChoiceRow[];
  /** The person's word-level remarks (said rows carrying part_of), by the candidate they are about. */
  words: Map<string, WordRow[]>;
  /** The audience rows ("Who", "Cares about") and every audience category the brand's organization can use. */
  audienceRows: AudienceRow[];
  audienceCategories: AudienceCategory[];
  /** Findings waiting for a confirm, in Smart Add's own queue order. */
  findings: FocusItem[];
  kinds: BrandRelationKind[];
}

async function loadElements(): Promise<ElementRow[]> {
  // Read COMPLETE: a card whose element is missing from this list loses its name and cardinality.
  const data = await readAllRows<{ id: string; name: string; slug: string | null; position: number | null; metadata: Json }>(
    ({ from, to }) =>
      supabase
        .schema("platform")
        .from("categories")
        .select("id, name, slug, position, metadata", { count: "exact" })
        .eq("dimension", "brand_element")
        .is("deleted_at", null)
        .order("id", { ascending: true })
        .range(from, to),
    { label: "platform.categories (brand_element)" },
  ).catch((e: unknown) => {
    throw new Error(`The brand elements could not be read: ${e instanceof Error ? e.message : String(e)}`);
  });
  return data.map((c) => {
    const meta = c.metadata && typeof c.metadata === "object" && !Array.isArray(c.metadata) ? (c.metadata as Record<string, Json>) : {};
    return { id: c.id, name: c.name, slug: c.slug ?? "", position: c.position, cardinality: typeof meta.cardinality === "string" ? meta.cardinality : "many" };
  });
}

/** A row of audience categories: a public system parent in dimension `brand_audience`. */
export interface AudienceRow {
  id: string;
  slug: string;
  name: string;
}

/** An audience category: a child of its row, the platform's or the brand's organization's own. */
export interface AudienceCategory {
  id: string;
  name: string;
  row: string;
}

async function loadAudience(organizationId: string): Promise<{ rows: AudienceRow[]; categories: AudienceCategory[] }> {
  // Read COMPLETE: every organization adds its own categories, so the dimension grows past any fixed cap.
  type CategoryRow = { id: string; name: string; slug: string | null; parent_id: string | null; position: number | null; organization_id: string | null; is_system: boolean | null };
  const all = await readAllRows<CategoryRow>(
    ({ from, to }) =>
      supabase
        .schema("platform")
        .from("categories")
        .select("id, name, slug, parent_id, position, organization_id, is_system", { count: "exact" })
        .eq("dimension", "brand_audience")
        .is("deleted_at", null)
        .order("position", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    { label: "platform.categories (brand_audience)" },
  ).catch((e: unknown) => {
    throw new Error(`The audience categories could not be read: ${e instanceof Error ? e.message : String(e)}`);
  });
  const rows = all.filter((c) => !c.parent_id && c.slug).map((c) => ({ id: c.id, slug: c.slug ?? "", name: c.name }));
  const slugOf = new Map(rows.map((r) => [r.id, r.slug]));
  const categories = all
    .filter((c) => c.parent_id && slugOf.has(c.parent_id) && (c.is_system || c.organization_id === organizationId))
    .map((c) => ({ id: c.id, name: c.name, row: slugOf.get(c.parent_id ?? "") ?? "who" }));
  return { rows, categories };
}

async function loadChoices(brandId: string): Promise<ChoiceRow[]> {
  const db = await authenticatedWebDb(supabase);
  return readAllRows(
    ({ from, to }) =>
      db
        .from("brand_choice")
        .select(CHOICE_COLUMNS, { count: "exact" })
        .eq("brand_id", brandId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    { label: "web.brand_choice" },
  ) as Promise<ChoiceRow[]>;
}

/** The signed-in person (a stance answer withdraws only their own earlier answer). */
export async function sessionPersonId(): Promise<string> {
  return signedInPersonId(supabase);
}

const PLACEMENT_OF: Record<string, Placement> = { declined: "not_us", parked: "not_sure" };

function wordRows(choices: readonly ChoiceRow[]): Map<string, WordRow[]> {
  const out = new Map<string, WordRow[]>();
  for (const c of choices) {
    if (c.origin !== "said") continue;
    const p = partOf(c.value);
    if (!p) continue;
    const answer: Placement | null =
      c.decision === "chosen" ? (c.placement === "support" ? "support" : "lead") : (PLACEMENT_OF[c.decision] ?? null);
    const v = c.value && typeof c.value === "object" && !Array.isArray(c.value) ? (c.value as Record<string, Json>) : {};
    const categories = Array.isArray(v.categories) ? v.categories.filter((x): x is string => typeof x === "string") : [];
    out.set(p.of, [...(out.get(p.of) ?? []), { id: c.id, of: p.of, start: p.start, end: p.end, answer, categories }]);
  }
  return out;
}

async function loadFindings(brand: MarketingBrand, kinds: BrandRelationKind[]): Promise<FocusItem[]> {
  const saved = await loadSavedFindings(brand);
  const raw = buildQueue({
    items: saved.items,
    facts: saved.facts,
    decisions: {},
    webChoices: {},
    answered: new Set(),
    later: [],
    kinds,
    ctx: suggestContext([brand.website_url], [], brand.name),
  });
  return foldQueue({ queue: raw, known: { ...EMPTY_KNOWN, ...saved.known, names: [...saved.known.names, brand.name] }, later: [] });
}

export async function loadSession(brand: MarketingBrand): Promise<SessionData> {
  const kinds = await listBrandRelationKinds();
  const [elements, choices, findings, audience] = await Promise.all([
    loadElements(),
    loadChoices(brand.id),
    loadFindings(brand, kinds),
    loadAudience(brand.organization_id),
  ]);
  return { elements, choices, words: wordRows(choices), findings, kinds, audienceRows: audience.rows, audienceCategories: audience.categories };
}

/** What the decide door answered. */
export interface DecideResult {
  id: string;
  decision: string;
  superseded: string[];
  restored: string[];
}

function asDecideResult(data: Json): DecideResult {
  const r = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, Json>) : {};
  const ids = (v: Json | undefined) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return { id: String(r.id ?? ""), decision: String(r.decision ?? ""), superseded: ids(r.superseded), restored: ids(r.restored) };
}

/** Place, retract or withdraw one candidate as the signed-in person. Throws the database's own sentence. */
export async function decideChoice(choiceId: string, action: DecideAction, reason?: string | null): Promise<DecideResult> {
  const db = await authenticatedWebDb(supabase);
  const { data, error } = await db.rpc("brand_choice_decide", {
    p_choice_id: choiceId,
    p_action: action,
    ...(reason ? { p_reason: reason } : {}),
    p_via: SESSION_VIA,
  });
  if (error) throw new Error(error.message);
  return asDecideResult(data);
}

/**
 * A brand's answer about an audience category (web.brand_audience_answer): adds the category in the brand's
 * organization when it is new, and the brand's one candidate about it, then places it. `action` null adds only.
 */
export async function answerAudience(
  brandId: string,
  row: string,
  name: string,
  action: Placement | "retract" | null,
  origin: "said" | "team",
): Promise<{ category_id: string; choice_id: string }> {
  const db = await authenticatedWebDb(supabase);
  const { data, error } = await db.rpc("brand_audience_answer", {
    p_brand_id: brandId,
    p_row: row,
    p_name: name,
    ...(action ? { p_action: action } : {}),
    p_origin: origin,
    p_via: SESSION_VIA,
  });
  if (error) throw new Error(error.message);
  const r = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, Json>) : {};
  return { category_id: String(r.category_id ?? ""), choice_id: String(r.choice_id ?? "") };
}

/** The person's own words about a candidate (a whole rewording, or one span of its words), optionally placed at once. */
export async function correctChoice(choiceId: string, value: string | Record<string, Json>, action: Placement | null): Promise<string> {
  const db = await authenticatedWebDb(supabase);
  const { data, error } = await db.rpc("brand_choice_correct", {
    p_choice_id: choiceId,
    p_value: value as Json,
    ...(action ? { p_action: action } : {}),
    p_via: SESSION_VIA,
  });
  if (error) throw new Error(error.message);
  const r = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, Json>) : {};
  return String(r.id ?? "");
}

/**
 * A page agent's rewording of a card, on the person's request: a NEW open candidate (origin ai) for the same element,
 * grown from the card it rewords (web.brand_choice_propose). It waits at the end of the deck for the person's choice.
 */
export async function proposeRewording(choiceId: string, text: string): Promise<string> {
  const db = await authenticatedWebDb(supabase);
  const { data, error } = await db.rpc("brand_choice_propose", { p_choice_id: choiceId, p_value: text });
  if (error) throw new Error(error.message);
  return data;
}
