/**
 * The brand session deck — pure (no I/O). Turns the brand's candidates (`web.brand_choice`), its audience categories
 * (`platform.categories` dimension `brand_audience`) and its findings waiting for a confirm (`web.discovered_item`,
 * built by Smart Add's own queue) into the canonical swipe deck's items and state, and maps each deck change back to
 * the one door it is written through. Deck order: stances, audience, lines and picks, findings.
 *
 *   stance card    right grow · up sustain_or_accept · left sunset_or_refuse · down not_sure
 *                  → the person's own A3 row {stance, offering, answer_to} via web.brand_choice_correct (chosen);
 *                    not sure parks the agent's row (web.brand_choice_decide)
 *   audience card  right lead · up support · left not_us · down not_sure  → web.brand_audience_answer
 *   choice card    the same four                                          → web.brand_choice_decide
 *   pick card      right shortlist ("Could be it") · left not_us · down not_sure; the pick = decide lead
 *                  (single-value: supersedes the earlier chosen value; switching the pick shortlists it back)
 *   a part (hold a word) answered or tagged                               → web.brand_choice_correct (origin said,
 *                  value {text, part_of, start, end, categories})
 *   a category answered on the part screen ("+" too)                      → web.brand_audience_answer
 *   finding card   right confirm · left reject · down not_sure            → Smart Add persistAnswer (not_sure: nothing)
 *
 * The data design: common-docs projects/brand-discovery/DATA-MODEL.md § The brand session's answers.
 */

import {
  applyOps,
  tokenize,
  type DeckCategory,
  type DeckCategoryRow,
  type DeckItem,
  type DeckKeyOverride,
  type DeckOp,
  type DeckPart,
  type DeckPartSeed,
  type DeckState,
} from "@ai-matrx/design-system/swipe-deck";
import type { Json } from "@/types/database.types";
import { isJsonRecord } from "@/features/marketing/types";
import type { Answer, FocusItem } from "@/features/marketing/smart-add/validate/queue";
import { logoImageOf } from "@/features/marketing/smart-add/validate/fold";

export const CHOICE_PREFIX = "choice:";
export const FINDING_PREFIX = "finding:";
export const STANCE_PREFIX = "stance:";
export const AUDIENCE_PREFIX = "audience:";

/** The stance element (A3) and the pick-one elements (single value, chosen by a pick among the person's shortlist). */
export const STANCE_ELEMENT = "a3_offering_stance";
export const PICK_ELEMENTS: readonly string[] = ["h6_tagline", "h0_description"];

/** A choice card's four answers: the decide door's actions, by direction. */
export type Placement = "lead" | "support" | "not_us" | "not_sure";
export const PLACEMENTS: readonly Placement[] = ["lead", "support", "not_us", "not_sure"];

export const CHOICE_KEY: DeckKeyOverride = {
  right: { id: "lead", label: "Lead with it", tone: "success", rank: 3 },
  up: { id: "support", label: "Ours, not the face", tone: "info", rank: 2 },
  left: { id: "not_us", label: "Not us", tone: "destructive", rank: 0 },
  down: { id: "not_sure", label: "Not sure", tone: "warning", rank: 1 },
};

/** A stance: four swipes for the five stances (owner, 2026-10-19); the merged two are split in a later round. */
export type StanceAnswer = "grow" | "sustain_or_accept" | "sunset_or_refuse";
export const STANCE_ANSWERS: readonly StanceAnswer[] = ["grow", "sustain_or_accept", "sunset_or_refuse"];

export const STANCE_KEY: DeckKeyOverride = {
  right: { id: "grow", label: "Grow", tone: "success", rank: 3 },
  up: { id: "sustain_or_accept", label: "Sustain or Accept", tone: "info", rank: 2 },
  left: { id: "sunset_or_refuse", label: "Sunset or Refuse", tone: "destructive", rank: 0 },
  down: { id: "not_sure", label: "Not sure", tone: "warning", rank: 1 },
};

/** The precise stance (the agent's five, or a later split) on its swipe, and its words. */
const STANCE_OF: Record<string, { answer: StanceAnswer; label: string }> = {
  lead: { answer: "grow", label: "Lead" },
  door: { answer: "grow", label: "Door" },
  grow: { answer: "grow", label: "Grow" },
  sustain: { answer: "sustain_or_accept", label: "Sustain" },
  accept: { answer: "sustain_or_accept", label: "Accept" },
  sustain_or_accept: { answer: "sustain_or_accept", label: "Sustain or Accept" },
  sunset: { answer: "sunset_or_refuse", label: "Sunset" },
  refuse: { answer: "sunset_or_refuse", label: "Refuse" },
  sunset_or_refuse: { answer: "sunset_or_refuse", label: "Sunset or Refuse" },
};

export function stanceOf(value: unknown): { answer: StanceAnswer; label: string } | null {
  const raw = isJsonRecord(value as Json) ? (value as Record<string, Json>).stance : value;
  return typeof raw === "string" ? (STANCE_OF[raw.trim().toLowerCase()] ?? null) : null;
}

/** A pick card: could be it (kept in the running) · not us · not sure. The pick itself chooses. */
export type PickAnswer = "shortlist" | "not_us" | "not_sure";
export const PICK_KEY: DeckKeyOverride = {
  right: { id: "shortlist", label: "Could be it", tone: "success", rank: 3 },
  up: null,
  left: { id: "not_us", label: "Not us", tone: "destructive", rank: 0 },
  down: { id: "not_sure", label: "Not sure", tone: "warning", rank: 1 },
};

/** A finding is confirmed or not; "where it belongs" is never asked of a fact. */
export type FindingAnswer = "confirm" | "reject" | "not_sure";

export function findingKey(kind: FocusItem["kind"]): DeckKeyOverride {
  const fact = kind === "fact";
  return {
    right: { id: "confirm", label: fact ? "Correct" : "That's us", tone: "success", rank: 3 },
    up: null,
    left: { id: "reject", label: fact ? "Wrong" : "Not us", tone: "destructive", rank: 0 },
    down: { id: "not_sure", label: "Not sure", tone: "warning", rank: 1 },
  };
}

/** The Smart Add answer a finding swipe saves (its one confirm path). A name is kept as an alias, never renamed. */
export function smartAddAnswer(kind: FocusItem["kind"], answer: Exclude<FindingAnswer, "not_sure">): Answer {
  if (kind === "fact") return answer === "confirm" ? "correct" : "wrong";
  if (kind === "name") return answer === "confirm" ? "alias" : "not_us";
  return answer === "confirm" ? "ours" : "not_us";
}

export interface ElementRow {
  id: string;
  name: string;
  slug: string;
  position: number | null;
  cardinality: string;
}

export interface ChoiceRow {
  id: string;
  brand_id: string;
  element_id: string;
  value: Json;
  origin: string;
  recommended_placement: string | null;
  opinion_reason: string | null;
  word_signals: Json;
  decision: string;
  placement: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  organization_id: string;
  created_at: string;
  /** Who wrote the row (a stance answer's author: only they can withdraw it). */
  created_by?: string | null;
}

const ORIGIN_TAG: Record<string, string> = {
  found: "Found",
  said: "Your words",
  ai: "Proposed",
  customer: "Customer",
  team: "Team",
};

/** The words of a candidate: its text, or a list joined, or the JSON as a last resort (never blank). */
export function choiceText(value: Json): string {
  if (typeof value === "string") return value;
  if (isJsonRecord(value)) {
    // Same order as the server's candidate_text (aidream brand_discovery/curate.py): the Curator's word
    // spans are checked against those words, so the card must show exactly them.
    for (const key of ["text", "claim", "offering"] as const) {
      const t = value[key];
      if (typeof t === "string" && t.trim()) return t;
    }
    const items = value.items;
    if (Array.isArray(items)) return items.filter((x): x is string => typeof x === "string").join(" · ");
  }
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === "string").join(" · ");
  return JSON.stringify(value);
}

/** A word-level remark (a said row about part of a candidate), never a card of its own. */
export function partOf(value: Json): { of: string; start: number; end: number } | null {
  if (!isJsonRecord(value)) return null;
  const of = value.part_of;
  const start = value.start;
  const end = value.end;
  if (typeof of !== "string" || typeof start !== "number" || typeof end !== "number") return null;
  return { of, start, end };
}

/** The answer a stored decision shows on its card; open shows none. A superseded value keeps where it was placed. */
export function answerOfChoice(row: Pick<ChoiceRow, "decision" | "placement">): Placement | null {
  if (row.decision === "chosen" || row.decision === "superseded") return row.placement === "support" ? "support" : "lead";
  if (row.decision === "declined") return "not_us";
  if (row.decision === "parked") return "not_sure";
  return null;
}

/** A pick card's answer: shortlisted, picked (chosen) or replaced by the pick (superseded) are all "could be it". */
export function answerOfPick(row: Pick<ChoiceRow, "decision">): PickAnswer | null {
  if (row.decision === "shortlisted" || row.decision === "chosen" || row.decision === "superseded") return "shortlist";
  if (row.decision === "declined") return "not_us";
  if (row.decision === "parked") return "not_sure";
  return null;
}

function isPlacement(v: unknown): v is Placement {
  return typeof v === "string" && (PLACEMENTS as readonly string[]).includes(v);
}

function isStanceAnswer(v: unknown): v is StanceAnswer {
  return typeof v === "string" && (STANCE_ANSWERS as readonly string[]).includes(v);
}

/** The audience categories a word signal names: `categories` (names or {name}), else who it `attracts`. */
export function signalCategories(signal: Record<string, Json>): string[] {
  const out: string[] = [];
  const add = (v: Json | undefined) => {
    const name = typeof v === "string" ? v.trim() : isJsonRecord(v ?? null) && typeof (v as Record<string, Json>).name === "string" ? String((v as Record<string, Json>).name).trim() : "";
    if (name && !out.includes(name)) out.push(name);
  };
  if (Array.isArray(signal.categories)) signal.categories.forEach(add);
  else add(signal.attracts);
  return out;
}

/** The row a signal puts a category in (an explicit `{name, row}`), else null. */
function signalRows(signal: Record<string, Json>): Map<string, string> {
  const out = new Map<string, string>();
  if (!Array.isArray(signal.categories)) return out;
  for (const c of signal.categories) {
    if (!isJsonRecord(c)) continue;
    const r = c as Record<string, Json>;
    if (typeof r.name === "string" && typeof r.row === "string") out.set(r.name.trim(), r.row);
  }
  return out;
}

/** The curator's word check, offered as the card's parts: each word leans to its verdict and carries its categories. */
export function wordSeeds(signals: Json): DeckPartSeed[] {
  if (!Array.isArray(signals)) return [];
  const out: DeckPartSeed[] = [];
  for (const s of signals) {
    if (!isJsonRecord(s) || typeof s.word !== "string" || !s.word.trim()) continue;
    out.push({ phrase: s.word, suggested: isPlacement(s.verdict) ? s.verdict : null, categories: signalCategories(s) });
  }
  return out;
}

/** Every audience category the candidates' word checks name, with its row when the signal says (else Who). */
export function suggestedCategories(rows: readonly ChoiceRow[]): { name: string; row: string }[] {
  const out: { name: string; row: string }[] = [];
  for (const r of rows) {
    if (!Array.isArray(r.word_signals)) continue;
    for (const s of r.word_signals) {
      if (!isJsonRecord(s)) continue;
      const rows = signalRows(s);
      for (const name of signalCategories(s)) {
        if (!out.some((x) => x.name.toLowerCase() === name.toLowerCase())) out.push({ name, row: rows.get(name) ?? "who" });
      }
    }
  }
  return out;
}

export function isPickElement(element: ElementRow | undefined): boolean {
  return !!element && PICK_ELEMENTS.includes(element.slug);
}

export function choiceItem(row: ChoiceRow, element: ElementRow | undefined): DeckItem {
  const pick = isPickElement(element);
  const rec = isPlacement(row.recommended_placement) ? row.recommended_placement : null;
  const suggested = pick ? (rec === "lead" || rec === "support" ? "shortlist" : rec) : rec;
  return {
    id: CHOICE_PREFIX + row.id,
    text: choiceText(row.value),
    kicker: element?.name ?? "Brand element",
    tag: ORIGIN_TAG[row.origin] ?? row.origin,
    suggested,
    ...(row.opinion_reason?.trim() ? { reason: row.opinion_reason.trim() } : {}),
    parts: wordSeeds(row.word_signals),
    answers: pick ? PICK_KEY : CHOICE_KEY,
    ...(pick && element ? { group: element.slug, ...(rec === "lead" ? { pickSuggested: true } : {}) } : {}),
  };
}

function humanize(slug: string): string {
  const t = slug.replace(/_/g, " ").trim();
  return t ? t[0]!.toUpperCase() + t.slice(1) : t;
}

/** An offering's stance card: the offering, the agent's precise stance as the Suggestion, its role as a line. */
export function stanceItem(row: ChoiceRow, element: ElementRow | undefined): DeckItem {
  const s = stanceOf(row.value);
  const v = isJsonRecord(row.value) ? (row.value as Record<string, Json>) : {};
  const role = typeof v.primary_role === "string" && v.primary_role.trim() ? humanize(v.primary_role) : null;
  return {
    id: STANCE_PREFIX + row.id,
    text: choiceText(row.value),
    kicker: element?.name ?? "Offering stance",
    tag: ORIGIN_TAG[row.origin] ?? row.origin,
    suggested: s?.answer ?? null,
    ...(s ? { suggestedLabel: s.label } : {}),
    ...(row.opinion_reason?.trim() ? { reason: row.opinion_reason.trim() } : {}),
    ...(role ? { fields: [{ label: "Role", value: role }] } : {}),
    answers: STANCE_KEY,
  };
}

/** The offering a stance row is about, by name (its value's words), for one card per offering. */
export function stanceKey(row: ChoiceRow): string {
  return choiceText(row.value).trim().toLowerCase();
}

/** The person's stance answers about an agent's stance row: their own rows naming it (`answer_to`). */
export function stanceAnswersOf(aiId: string, rows: readonly ChoiceRow[]): ChoiceRow[] {
  return rows.filter((r) => r.origin === "said" && isJsonRecord(r.value) && (r.value as Record<string, Json>).answer_to === aiId);
}

/** The person's own answers that are still live (chosen or parked, never superseded): the ones a new answer withdraws. */
export function ownLiveAnswers(answers: readonly ChoiceRow[], personId: string | null | undefined): ChoiceRow[] {
  if (!personId) return [];
  return answers.filter((a) => a.decision !== "superseded" && a.created_by === personId);
}

/** A stance card's answer: the person's live answer row (chosen first, newest), else not sure when parked. */
export function answerOfStance(ai: ChoiceRow, answers: readonly ChoiceRow[]): StanceAnswer | "not_sure" | null {
  const live = [...answers].filter((r) => r.decision === "chosen" || r.decision === "superseded").sort((a, b) => (a.decision === "chosen" ? -1 : 0) - (b.decision === "chosen" ? -1 : 0) || b.created_at.localeCompare(a.created_at));
  const s = live[0] ? stanceOf(live[0].value) : null;
  if (s) return s.answer;
  return ai.decision === "parked" ? "not_sure" : null;
}

/** An audience category on the brand: its row ("who" / "cares_about"), its name, and the brand's answer row if any. */
export interface AudienceCard {
  row: string;
  rowLabel: string;
  name: string;
  choice: ChoiceRow | null;
}

export function audienceId(row: string, name: string): string {
  return `${AUDIENCE_PREFIX}${row}:${name.toLowerCase()}`;
}

export function audienceItem(card: AudienceCard): DeckItem {
  return {
    id: audienceId(card.row, card.name),
    text: card.name,
    kicker: card.rowLabel,
    tag: card.choice ? (ORIGIN_TAG[card.choice.origin] ?? card.choice.origin) : ORIGIN_TAG.ai!,
    suggested: null,
    answers: CHOICE_KEY,
  };
}

/** The deck's category state: each audience category the brand answered, by name, with its row. */
export function categoryState(cards: readonly AudienceCard[]): Record<string, DeckCategory> {
  const out: Record<string, DeckCategory> = {};
  for (const c of cards) {
    const a = c.choice ? answerOfChoice(c.choice) : null;
    if (a) out[c.name] = { name: c.name, answer: a, row: c.row };
  }
  return out;
}

/** The part screen's chip rows: each audience row with the categories known for it. */
export function categoryRows(rows: readonly { slug: string; name: string }[], known: readonly { name: string; row: string }[]): DeckCategoryRow[] {
  return rows.map((r) => ({ id: r.slug, label: r.name, categories: [...new Set(known.filter((k) => k.row === r.slug).map((k) => k.name))] }));
}

export function findingItem(item: FocusItem): DeckItem {
  const s = item.suggestion?.choice;
  const suggested = s === "ours" || s === "preferred" || s === "alias" || s === "correct" ? "confirm" : s === "not_us" ? "reject" : null;
  // A logo card is the picture, never its address: one picture per card, in the deck's own media slot.
  const picture = item.kind === "logo" ? logoImageOf(item) : null;
  return {
    id: FINDING_PREFIX + item.key,
    text: item.kind === "logo" ? "" : item.kind === "web" ? (item.title ?? item.value) : item.value,
    ...(picture ? { media: { src: picture, alt: item.label, shape: "wide" as const } } : {}),
    kicker: item.label,
    ...(item.source ? { tag: item.source } : {}),
    suggested,
    ...(item.detail?.trim() ? { reason: item.detail.trim() } : item.suggestion?.reason ? { reason: item.suggestion.reason } : {}),
    answers: findingKey(item.kind),
  };
}

/** Choice cards in a stable order: by the element's place in the Foundation, then oldest first. */
export function orderChoices(rows: readonly ChoiceRow[], elements: ReadonlyMap<string, ElementRow>): ChoiceRow[] {
  const pos = (r: ChoiceRow) => elements.get(r.element_id)?.position ?? Number.MAX_SAFE_INTEGER;
  return [...rows].sort((a, b) => pos(a) - pos(b) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

/**
 * The deck's order, kept for the whole sitting: ids already shown keep their place (a card answered stays done where
 * it was, so undo brings it back in place); anything new joins at the end in `fresh` order. Ids no longer present
 * (withdrawn, deleted) drop out.
 */
export function keepOrder(previous: readonly string[], present: ReadonlySet<string>, fresh: readonly string[]): string[] {
  const kept = previous.filter((id) => present.has(id));
  const seen = new Set(kept);
  return [...kept, ...fresh.filter((id) => !seen.has(id) && present.has(id))];
}

/** A said word-row as the deck part it answers: its span, the person's call on it, and the categories it is tagged with. */
export interface WordRow {
  id: string;
  of: string;
  start: number;
  end: number;
  answer: Placement | null;
  categories?: readonly string[];
}

/** A choice card's parts as stored: its seeds, with every span the person answered or tagged laid over. */
export function partsFor(seeded: readonly DeckPart[], words: readonly WordRow[]): DeckPart[] | null {
  if (!words.length) return null;
  const out: DeckPart[] = seeded.filter((p) => !words.some((w) => !(w.end < p.start || w.start > p.end)));
  for (const w of words) {
    const seed = seeded.find((p) => p.start === w.start && p.end === w.end);
    out.push({ start: w.start, end: w.end, categories: w.categories ?? seed?.categories ?? [], suggested: seed?.suggested ?? null, answer: w.answer });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** What a parts change asks of the database: new spans to save, spans to re-place, and the person's words to withdraw. */
export interface PartsPlan {
  create: { start: number; end: number; answer: Placement | null; categories: string[] }[];
  change: { id: string; answer: Placement | null }[];
  withdraw: string[];
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * A span is saved as the person's own row when they answered it or tagged it differently from its seed. A changed
 * answer re-places the row; changed tags replace it (withdraw + save).
 */
export function planParts(next: readonly DeckPart[], words: readonly WordRow[], seeded: readonly DeckPart[] = []): PartsPlan {
  const plan: PartsPlan = { create: [], change: [], withdraw: [] };
  const seedCats = (p: Pick<DeckPart, "start" | "end">) => seeded.find((x) => x.start === p.start && x.end === p.end)?.categories ?? [];
  const recreate = new Set<string>();
  for (const w of words) {
    const p = next.find((x) => x.start === w.start && x.end === w.end);
    if (!p) plan.withdraw.push(w.id);
    else if (w.categories !== undefined && !sameSet(p.categories, w.categories)) {
      plan.withdraw.push(w.id);
      recreate.add(`${p.start}:${p.end}`);
    } else if ((isPlacement(p.answer) ? p.answer : null) !== w.answer) plan.change.push({ id: w.id, answer: isPlacement(p.answer) ? p.answer : null });
  }
  for (const p of next) {
    const answer = isPlacement(p.answer) ? p.answer : null;
    const tagged = !sameSet(p.categories, seedCats(p));
    const stored = words.some((w) => w.start === p.start && w.end === p.end);
    if (stored && !recreate.has(`${p.start}:${p.end}`)) continue;
    if (!answer && !tagged) continue;
    plan.create.push({ start: p.start, end: p.end, answer, categories: [...p.categories] });
  }
  return plan;
}

/** The counts a person (and a page agent) sees: how many cards, how many answered. */
export function deckCounts(
  items: readonly DeckItem[],
  state: DeckState,
): { total: number; answered: number; stances: number; audience: number; choices: number; findings: number } {
  return {
    total: items.length,
    answered: items.filter((i) => state.answers[i.id]).length,
    stances: items.filter((i) => i.id.startsWith(STANCE_PREFIX)).length,
    audience: items.filter((i) => i.id.startsWith(AUDIENCE_PREFIX)).length,
    choices: items.filter((i) => i.id.startsWith(CHOICE_PREFIX)).length,
    findings: items.filter((i) => i.id.startsWith(FINDING_PREFIX)).length,
  };
}

/** What the decide door answered (only `restored` is read here). */
export interface DecideOutcome {
  restored?: readonly string[];
}

export type DecideAction = Placement | "shortlist" | "retract" | "withdraw";

/** The doors a deck change is written through, and what the binding knows (the hook passes the real ones; tests fakes). */
export interface DeckDoors {
  decide: (choiceId: string, action: DecideAction) => Promise<DecideOutcome | void>;
  correct: (choiceId: string, value: Record<string, Json>, action: Placement | null) => Promise<unknown>;
  /** A brand's answer about an audience category (added when new); its category's id. */
  audience: (row: string, name: string, action: Placement | "retract" | null, origin: "said" | "team") => Promise<{ category_id: string }>;
  answerFinding: (itemId: string, answer: FindingAnswer | null) => Promise<void>;
  /** The person's word rows on a candidate, as stored. */
  wordsOf: (choiceId: string) => readonly WordRow[];
  /** The card's words (for the text of an answered span). */
  textOf: (itemId: string) => string;
  /** The card's seeded parts (the curator's word check). */
  seedsOf?: (itemId: string) => readonly DeckPart[];
  /** The signed-in person: a stance answer withdraws only THEIR earlier answer (the door refuses anyone else's). */
  personId?: string | null;
  /** A stance card's agent row, and the person's live answer rows about it. */
  stanceOf?: (aiId: string) => { ai: ChoiceRow; answers: readonly ChoiceRow[] } | null;
  /** An audience card: its row, name and whether it is a suggestion nobody answered yet. */
  audienceOf?: (itemId: string) => { row: string; name: string; suggested: boolean } | null;
  /** The row an audience category name lives in, and its id (null when not yet a category). */
  categoryOf?: (name: string) => { row: string; id: string | null } | null;
  /** The items, the state before these ops and the chosen row of each pick group (for the pick and its follow-ups). */
  items?: readonly DeckItem[];
  before?: DeckState;
  chosenInGroup?: Record<string, string | null>;
}

function isFindingAnswer(v: string | null): v is FindingAnswer {
  return v === "confirm" || v === "reject" || v === "not_sure";
}

const choiceIdOf = (itemId: string) => itemId.slice(CHOICE_PREFIX.length);

/**
 * Every deck op, in order, through its one door:
 * - a stance answer becomes the person's own A3 row (their OWN earlier answer is withdrawn first, which restores what
 *   it had replaced; a colleague's answer is superseded by the new one in the database); not sure parks the agent's row;
 * - an audience answer (card or category op) goes through the audience door;
 * - a choice answer is placed (or retracted when taken back); a pick card is shortlisted, declined or parked; the pick
 *   chooses (switching it shortlists the previous pick back first); a group answered down to one "could be it" picks
 *   it, and undoing that un-picks it;
 * - a parts change becomes the person's own words (answer and categories);
 * - a finding answer goes to Smart Add.
 */
export async function applyDeckOps(ops: readonly DeckOp[], doors: DeckDoors): Promise<void> {
  const chosen: Record<string, string | null> = { ...(doors.chosenInGroup ?? {}) };
  const touched = new Set<string>();
  const groupOf = (itemId: string) => doors.items?.find((i) => i.id === itemId)?.group;

  const pick = async (group: string, itemId: string | null) => {
    const current = chosen[group] ?? null;
    const target = itemId ? choiceIdOf(itemId) : null;
    if (current === target) return;
    let restored: readonly string[] = [];
    if (current) {
      const out = await doors.decide(current, "shortlist");
      restored = (out && out.restored) || [];
      chosen[group] = null;
    }
    if (target) {
      if (!restored.includes(target)) await doors.decide(target, "lead");
      chosen[group] = target;
    }
  };

  for (const op of ops) {
    if (op.kind === "answer") {
      if (op.itemId.startsWith(STANCE_PREFIX)) {
        const aiId = op.itemId.slice(STANCE_PREFIX.length);
        const st = doors.stanceOf?.(aiId);
        if (!st) throw new Error("This stance is no longer on the brand.");
        // Only the person's OWN live answer is withdrawn (web.brand_choice_decide refuses another person's words); a
        // colleague's answer is superseded by the new one in the database (single per offering, REVIEW3 I2).
        for (const a of ownLiveAnswers(st.answers, doors.personId)) await doors.decide(a.id, "withdraw");
        if (op.answer === "not_sure") {
          if (st.ai.decision !== "parked") await doors.decide(aiId, "not_sure");
        } else {
          if (st.ai.decision === "parked") await doors.decide(aiId, "retract");
          if (op.answer !== null) {
            if (!isStanceAnswer(op.answer)) throw new Error(`A stance cannot be "${op.answer}".`);
            await doors.correct(aiId, { stance: op.answer, offering: choiceText(st.ai.value), answer_to: aiId }, op.answer === "grow" ? "lead" : "support");
          }
        }
      } else if (op.itemId.startsWith(AUDIENCE_PREFIX)) {
        const a = doors.audienceOf?.(op.itemId);
        if (!a) throw new Error("This audience category is no longer on the brand.");
        if (op.answer !== null && !isPlacement(op.answer)) throw new Error(`An audience category cannot be "${op.answer}".`);
        // The person's answer is their own words, even on a suggested category (the door refuses origin ai).
        await doors.audience(a.row, a.name, op.answer ?? "retract", "said");
      } else if (op.itemId.startsWith(CHOICE_PREFIX)) {
        const id = choiceIdOf(op.itemId);
        const group = groupOf(op.itemId);
        if (group) {
          if (op.answer !== null && op.answer !== "shortlist" && op.answer !== "not_us" && op.answer !== "not_sure") {
            throw new Error(`A pick card cannot be "${op.answer}".`);
          }
          await doors.decide(id, op.answer ?? "retract");
          if (chosen[group] === id && op.answer !== "shortlist") chosen[group] = null;
          touched.add(group);
        } else {
          await doors.decide(id, isPlacement(op.answer) ? op.answer : "retract");
        }
      } else if (op.itemId.startsWith(FINDING_PREFIX)) {
        if (op.answer !== null && !isFindingAnswer(op.answer)) throw new Error(`A finding cannot be answered "${op.answer}".`);
        await doors.answerFinding(op.itemId, op.answer);
      } else {
        throw new Error(`Unknown card ${op.itemId}.`);
      }
    } else if (op.kind === "pick") {
      if (!doors.items?.some((i) => i.group === op.group)) throw new Error("This deck has no pick for that group.");
      await pick(op.group, op.itemId);
    } else if (op.kind === "category") {
      const known = doors.categoryOf?.(op.name);
      const row = op.row ?? known?.row ?? "who";
      await doors.audience(row, op.name, op.remove ? "retract" : isPlacement(op.answer) ? op.answer : op.answer === null ? "retract" : null, "said");
    } else {
      if (!op.itemId.startsWith(CHOICE_PREFIX)) throw new Error("Only a brand candidate's words can be marked.");
      const choiceId = choiceIdOf(op.itemId);
      const tokens = tokenize(doors.textOf(op.itemId));
      const plan = planParts(op.parts, doors.wordsOf(choiceId), doors.seedsOf?.(op.itemId) ?? []);
      for (const id of plan.withdraw) await doors.decide(id, "withdraw");
      for (const c of plan.change) await doors.decide(c.id, c.answer ?? "retract");
      for (const c of plan.create) {
        const ids: string[] = [];
        for (const name of c.categories) {
          const known = doors.categoryOf?.(name);
          ids.push(known?.id ?? (await doors.audience(known?.row ?? "who", name, null, "said")).category_id);
        }
        await doors.correct(
          choiceId,
          { text: tokens.slice(c.start, c.end + 1).join(" "), part_of: choiceId, start: c.start, end: c.end, categories: c.categories, category_ids: ids },
          c.answer,
        );
      }
    }
  }

  // A pick group answered down to exactly one "could be it" picks it; taking that back un-picks it.
  if (touched.size && doors.items && doors.before) {
    const next = applyOps(doors.before, ops);
    for (const group of touched) {
      const members = doors.items.filter((i) => i.group === group);
      const all = members.every((i) => next.answers[i.id]);
      const yes = members.filter((i) => next.answers[i.id] === "shortlist");
      if (all && yes.length === 1) await pick(group, yes[0]!.id);
      else if (!all && chosen[group] && members.some((i) => choiceIdOf(i.id) === chosen[group])) await pick(group, null);
    }
  }
}
