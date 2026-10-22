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
import { authenticatedWebDb } from "@/utils/supabase/webDb";
import { listBrandRelationKinds, type BrandRelationKind } from "@/features/marketing/data/service";
import type { MarketingBrand } from "@/features/marketing/types";
import { suggestContext } from "@/features/marketing/smart-add/relations";
import { loadSavedFindings } from "@/features/marketing/smart-add/validate/fromSaved";
import { buildQueue, type FocusItem } from "@/features/marketing/smart-add/validate/queue";
import { EMPTY_KNOWN, foldQueue } from "@/features/marketing/smart-add/validate/fold";
import { partOf, type ChoiceRow, type ElementRow, type Placement, type WordRow } from "./deck";

const CHOICE_COLUMNS =
  "id, brand_id, element_id, value, origin, recommended_placement, opinion_reason, word_signals, decision, placement, decided_by, decided_at, decision_reason, organization_id, created_at";

export const SESSION_VIA = "brand_session";

export interface SessionData {
  elements: ElementRow[];
  /** Every live candidate on the brand (open and decided); the hook decides which are cards this sitting. */
  choices: ChoiceRow[];
  /** The person's word-level remarks (said rows carrying part_of), by the candidate they are about. */
  words: Map<string, WordRow[]>;
  /** Findings waiting for a confirm, in Smart Add's own queue order. */
  findings: FocusItem[];
  kinds: BrandRelationKind[];
}

async function loadElements(): Promise<ElementRow[]> {
  const { data, error } = await supabase
    .schema("platform")
    .from("categories")
    .select("id, name, slug, position, metadata")
    .eq("dimension", "brand_element")
    .is("deleted_at", null)
    .limit(500);
  if (error) throw new Error(`The brand elements could not be read: ${error.message}`);
  return (data ?? []).map((c) => {
    const meta = c.metadata && typeof c.metadata === "object" && !Array.isArray(c.metadata) ? (c.metadata as Record<string, Json>) : {};
    return { id: c.id, name: c.name, slug: c.slug ?? "", position: c.position, cardinality: typeof meta.cardinality === "string" ? meta.cardinality : "many" };
  });
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

const PLACEMENT_OF: Record<string, Placement> = { declined: "not_us", parked: "not_sure" };

function wordRows(choices: readonly ChoiceRow[]): Map<string, WordRow[]> {
  const out = new Map<string, WordRow[]>();
  for (const c of choices) {
    if (c.origin !== "said") continue;
    const p = partOf(c.value);
    if (!p) continue;
    const answer: Placement | null =
      c.decision === "chosen" ? (c.placement === "support" ? "support" : "lead") : (PLACEMENT_OF[c.decision] ?? null);
    out.set(p.of, [...(out.get(p.of) ?? []), { id: c.id, of: p.of, start: p.start, end: p.end, answer }]);
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
  const [elements, choices, findings] = await Promise.all([loadElements(), loadChoices(brand.id), loadFindings(brand, kinds)]);
  return { elements, choices, words: wordRows(choices), findings, kinds };
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

export type DecideAction = Placement | "retract" | "withdraw";

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
