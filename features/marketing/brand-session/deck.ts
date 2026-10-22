/**
 * The brand session deck — pure (no I/O). Turns the brand's open candidates (`web.brand_choice`) and its findings
 * waiting for a confirm (`web.discovered_item`, built by Smart Add's own queue) into the canonical swipe deck's
 * items and state, and maps each deck answer back to the one door it is written through.
 *
 *   choice card   right lead · up support · left not_us · down not_sure   → web.brand_choice_decide
 *                 a part (hold a word) answered                           → web.brand_choice_correct (origin said)
 *   finding card  right confirm · left reject · down not_sure             → Smart Add persistAnswer (not_sure: nothing)
 *
 * Where a chosen value belongs: common-docs projects/brand-discovery/DATA-MODEL.md § Where a chosen value belongs.
 */

import { tokenize, type DeckItem, type DeckKeyOverride, type DeckOp, type DeckPart, type DeckPartSeed, type DeckState } from "@ai-matrx/design-system/swipe-deck";
import type { Json } from "@/types/database.types";
import { isJsonRecord } from "@/features/marketing/types";
import type { Answer, FocusItem } from "@/features/marketing/smart-add/validate/queue";

export const CHOICE_PREFIX = "choice:";
export const FINDING_PREFIX = "finding:";

/** A choice card's four answers: the decide door's actions, by direction. */
export type Placement = "lead" | "support" | "not_us" | "not_sure";
export const PLACEMENTS: readonly Placement[] = ["lead", "support", "not_us", "not_sure"];

export const CHOICE_KEY: DeckKeyOverride = {
  right: { id: "lead", label: "Lead with it", tone: "success", rank: 3 },
  up: { id: "support", label: "Ours, not the face", tone: "info", rank: 2 },
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
    const t = value.text;
    if (typeof t === "string" && t.trim()) return t;
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

function isPlacement(v: unknown): v is Placement {
  return typeof v === "string" && (PLACEMENTS as readonly string[]).includes(v);
}

/** The curator's word check, offered as the card's parts (each word leans to its verdict when it names a placement). */
export function wordSeeds(signals: Json): DeckPartSeed[] {
  if (!Array.isArray(signals)) return [];
  const out: DeckPartSeed[] = [];
  for (const s of signals) {
    if (!isJsonRecord(s) || typeof s.word !== "string" || !s.word.trim()) continue;
    out.push({ phrase: s.word, suggested: isPlacement(s.verdict) ? s.verdict : null });
  }
  return out;
}

export function choiceItem(row: ChoiceRow, element: ElementRow | undefined): DeckItem {
  const suggested = isPlacement(row.recommended_placement) ? row.recommended_placement : null;
  return {
    id: CHOICE_PREFIX + row.id,
    text: choiceText(row.value),
    kicker: element?.name ?? "Brand element",
    tag: ORIGIN_TAG[row.origin] ?? row.origin,
    suggested,
    ...(row.opinion_reason?.trim() ? { reason: row.opinion_reason.trim() } : {}),
    parts: wordSeeds(row.word_signals),
    answers: CHOICE_KEY,
  };
}

export function findingItem(item: FocusItem): DeckItem {
  const s = item.suggestion?.choice;
  const suggested = s === "ours" || s === "preferred" || s === "alias" || s === "correct" ? "confirm" : s === "not_us" ? "reject" : null;
  return {
    id: FINDING_PREFIX + item.key,
    text: item.kind === "web" ? (item.title ?? item.value) : item.value,
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

/** A said word-row as the deck part it answers. */
export interface WordRow {
  id: string;
  of: string;
  start: number;
  end: number;
  answer: Placement | null;
}

/** A choice card's parts as stored: its seeds, with every span the person answered in their own words laid over. */
export function partsFor(seeded: readonly DeckPart[], words: readonly WordRow[]): DeckPart[] | null {
  if (!words.length) return null;
  const out: DeckPart[] = seeded.filter((p) => !words.some((w) => !(w.end < p.start || w.start > p.end)));
  for (const w of words) {
    const seed = seeded.find((p) => p.start === w.start && p.end === w.end);
    out.push({ start: w.start, end: w.end, categories: seed?.categories ?? [], suggested: seed?.suggested ?? null, answer: w.answer });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** What a parts change asks of the database: new spans to save, spans to re-place, and the person's words to withdraw. */
export interface PartsPlan {
  create: { start: number; end: number; answer: Placement }[];
  change: { id: string; answer: Placement | null }[];
  withdraw: string[];
}

export function planParts(next: readonly DeckPart[], words: readonly WordRow[]): PartsPlan {
  const plan: PartsPlan = { create: [], change: [], withdraw: [] };
  for (const w of words) {
    const p = next.find((x) => x.start === w.start && x.end === w.end);
    if (!p) plan.withdraw.push(w.id);
    else if ((isPlacement(p.answer) ? p.answer : null) !== w.answer) plan.change.push({ id: w.id, answer: isPlacement(p.answer) ? p.answer : null });
  }
  for (const p of next) {
    if (!isPlacement(p.answer)) continue;
    if (words.some((w) => w.start === p.start && w.end === p.end)) continue;
    plan.create.push({ start: p.start, end: p.end, answer: p.answer });
  }
  return plan;
}

/** The counts a person (and a page agent) sees: how many cards, how many answered. */
export function deckCounts(items: readonly DeckItem[], state: DeckState): { total: number; answered: number; choices: number; findings: number } {
  return {
    total: items.length,
    answered: items.filter((i) => state.answers[i.id]).length,
    choices: items.filter((i) => i.id.startsWith(CHOICE_PREFIX)).length,
    findings: items.filter((i) => i.id.startsWith(FINDING_PREFIX)).length,
  };
}

/** The doors a deck change is written through (the hook passes the real ones; tests pass fakes). */
export interface DeckDoors {
  decide: (choiceId: string, action: Placement | "retract" | "withdraw") => Promise<unknown>;
  correct: (choiceId: string, value: { text: string; part_of: string; start: number; end: number }, action: Placement) => Promise<unknown>;
  answerFinding: (itemId: string, answer: FindingAnswer | null) => Promise<void>;
  /** The person's word rows on a candidate, as stored. */
  wordsOf: (choiceId: string) => readonly WordRow[];
  /** The card's words (for the text of an answered span). */
  textOf: (itemId: string) => string;
}

function isFindingAnswer(v: string | null): v is FindingAnswer {
  return v === "confirm" || v === "reject" || v === "not_sure";
}

/**
 * Every deck op, in order, through its one door: a choice answer is placed (or retracted when the answer is taken
 * back), a finding answer goes to Smart Add, a parts change becomes the person's own words. Picks and categories
 * are not part of this deck and are refused, never dropped.
 */
export async function applyDeckOps(ops: readonly DeckOp[], doors: DeckDoors): Promise<void> {
  for (const op of ops) {
    if (op.kind === "answer") {
      if (op.itemId.startsWith(CHOICE_PREFIX)) {
        await doors.decide(op.itemId.slice(CHOICE_PREFIX.length), isPlacement(op.answer) ? op.answer : "retract");
      } else if (op.itemId.startsWith(FINDING_PREFIX)) {
        if (op.answer !== null && !isFindingAnswer(op.answer)) throw new Error(`A finding cannot be answered "${op.answer}".`);
        await doors.answerFinding(op.itemId, op.answer);
      } else {
        throw new Error(`Unknown card ${op.itemId}.`);
      }
    } else if (op.kind === "parts") {
      if (!op.itemId.startsWith(CHOICE_PREFIX)) throw new Error("Only a brand candidate's words can be marked.");
      const choiceId = op.itemId.slice(CHOICE_PREFIX.length);
      const tokens = tokenize(doors.textOf(op.itemId));
      const plan = planParts(op.parts, doors.wordsOf(choiceId));
      for (const id of plan.withdraw) await doors.decide(id, "withdraw");
      for (const c of plan.change) await doors.decide(c.id, c.answer ?? "retract");
      for (const c of plan.create) {
        await doors.correct(choiceId, { text: tokens.slice(c.start, c.end + 1).join(" "), part_of: choiceId, start: c.start, end: c.end }, c.answer);
      }
    } else {
      throw new Error("This deck has no picks or categories.");
    }
  }
}
