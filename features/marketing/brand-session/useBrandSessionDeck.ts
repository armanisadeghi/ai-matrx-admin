"use client";

/**
 * The brand session deck as a SwipeDeckBinding: the canonical `@ai-matrx/design-system/swipe-deck` draws it and
 * persists every change through `apply` (optimistic, rolled back with the database's own sentence). Any screen
 * the design session builds binds the same way: `binding` in, `snapshot` out for the page agent.
 *
 * The cards of a sitting, in this order: each offering's stance (one card per offering, from the role proposer's A3
 * rows), the brand's audience categories (its own and the ones the word checks name), the brand's OPEN candidates
 * (taglines and one-liners as pick-one groups), then the findings waiting for a confirm; a stable order kept for the
 * whole sitting (an answered card stays where it was, so undo brings it back in place; a candidate a run
 * writes meanwhile joins at the end). Truth comes from the database: a choice card's answer is its row's decision; the
 * query lives under the brand's query key, so `useLiveBrand`'s realtime refresh re-reads it when anything changes.
 */

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { seedParts, type DeckCategoryRow, type DeckItem, type DeckOp, type DeckPart, type DeckState, type SwipeDeckBinding } from "@ai-matrx/design-system/swipe-deck";

import { extractErrorMessage } from "@/utils/errors";
import { marketingKeys } from "@/features/marketing/data/hooks";
import type { MarketingBrand } from "@/features/marketing/types";
import { persistAnswer, type Persisted } from "@/features/marketing/smart-add/validate/persist";
import type { FocusItem } from "@/features/marketing/smart-add/validate/queue";
import { reportAnswerNotSaved } from "@/features/marketing/smart-add/validate/notSaved";
import {
  AUDIENCE_PREFIX,
  CHOICE_PREFIX,
  FINDING_PREFIX,
  PICK_ELEMENTS,
  STANCE_ELEMENT,
  STANCE_PREFIX,
  answerOfChoice,
  answerOfPick,
  answerOfStance,
  applyDeckOps,
  audienceId,
  audienceItem,
  categoryRows,
  categoryState,
  choiceItem,
  deckCounts,
  findingItem,
  isPickElement,
  keepOrder,
  orderChoices,
  partsFor,
  smartAddAnswer,
  stanceAnswersOf,
  stanceItem,
  stanceKey,
  suggestedCategories,
  type AudienceCard,
  type ChoiceRow,
  type FindingAnswer,
} from "./deck";
import { answerAudience, correctChoice, decideChoice, loadSession, proposeRewording, type SessionData } from "./service";

export const sessionDeckKey = (brandId: string) => [...marketingKeys.root, "brand", brandId, "session-deck"] as const;

interface FindingAnswered {
  answer: FindingAnswer;
  persisted: Persisted | null;
}

/** What the page agent reads: the card in focus and where the sitting stands. */
export interface SessionSnapshot {
  current: {
    card_id: string;
    kind: "stance" | "audience" | "choice" | "finding";
    element: string | null;
    candidate: string;
    suggestion: string | null;
    reason: string | null;
    origin: string | null;
  } | null;
  counts: { total: number; answered: number; stances: number; audience: number; choices: number; findings: number };
}

const kindOf = (id: string): "stance" | "audience" | "choice" | "finding" =>
  id.startsWith(STANCE_PREFIX) ? "stance" : id.startsWith(AUDIENCE_PREFIX) ? "audience" : id.startsWith(CHOICE_PREFIX) ? "choice" : "finding";

const isAudienceRow = (c: ChoiceRow) => !!c.value && typeof c.value === "object" && !Array.isArray(c.value) && typeof (c.value as Record<string, unknown>).category_id === "string";
const isWordRow = (c: ChoiceRow) => !!c.value && typeof c.value === "object" && !Array.isArray(c.value) && "part_of" in (c.value as Record<string, unknown>);
const isStanceAnswerRow = (c: ChoiceRow) => c.origin === "said" && !!c.value && typeof c.value === "object" && !Array.isArray(c.value) && "answer_to" in (c.value as Record<string, unknown>);

/** The cards a sitting starts with, in deck order: stances, audience, lines and picks, findings. */
function freshIds(data: SessionData): string[] {
  const elements = new Map(data.elements.map((e) => [e.id, e]));
  const stanceEl = data.elements.find((e) => e.slug === STANCE_ELEMENT);
  // Stances: one card per offering, the newest open agent row, unless the offering already has the person's answer.
  const answered = new Set(
    data.choices.filter((c) => isStanceAnswerRow(c) && c.decision === "chosen").map((c) => stanceKey(c)),
  );
  const stanceRows = new Map<string, ChoiceRow>();
  for (const c of data.choices) {
    if (c.element_id !== stanceEl?.id || c.origin === "said" || c.decision !== "open") continue;
    const key = stanceKey(c);
    if (answered.has(key)) continue;
    const have = stanceRows.get(key);
    if (!have || c.created_at > have.created_at) stanceRows.set(key, c);
  }
  const stances = orderChoices([...stanceRows.values()], elements).map((c) => STANCE_PREFIX + c.id);
  const rows = new Map(data.audienceRows.map((r) => [r.slug, r.name]));
  const audience: string[] = [];
  for (const c of data.choices) {
    if (!isAudienceRow(c) || c.decision !== "open") continue;
    const v = c.value as Record<string, unknown>;
    if (typeof v.text === "string") audience.push(audienceId(typeof v.row === "string" ? v.row : "who", v.text));
  }
  const lines = data.choices.filter((c) => c.decision === "open" && !isAudienceRow(c) && !isWordRow(c) && c.element_id !== stanceEl?.id);
  const named = new Set(data.choices.filter(isAudienceRow).map((c) => String((c.value as Record<string, unknown>).text ?? "").toLowerCase()));
  for (const sug of suggestedCategories(lines)) {
    if (!named.has(sug.name.toLowerCase()) && rows.has(sug.row)) audience.push(audienceId(sug.row, sug.name));
  }
  const choiceIds = orderChoices(lines, elements).map((c) => CHOICE_PREFIX + c.id);
  return [...stances, ...audience, ...choiceIds, ...data.findings.map((f) => FINDING_PREFIX + f.key)];
}

export function useBrandSessionDeck(brand: MarketingBrand) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: sessionDeckKey(brand.id), queryFn: () => loadSession(brand) });
  const data: SessionData | undefined = query.data;

  // The sitting's order and the findings it showed (an answered finding leaves the pending list but stays a card).
  const [order, setOrder] = useState<string[]>([]);
  const [shownFindings, setShownFindings] = useState<Map<string, FocusItem>>(new Map());
  const [findingAnswers, setFindingAnswers] = useState<Map<string, FindingAnswered>>(new Map());
  const brandRef = useRef(brand);

  const choices = data?.choices ?? [];
  const choiceRows = new Map<string, ChoiceRow>(choices.map((c) => [c.id, c]));
  const elementMap = new Map((data?.elements ?? []).map((e) => [e.id, e]));
  const elementBySlug = new Map((data?.elements ?? []).map((e) => [e.slug, e]));
  const stanceElement = elementBySlug.get(STANCE_ELEMENT);

  // The brand's audience: a card per category it has a candidate about, and per category a word check names.
  const rowLabel = new Map((data?.audienceRows ?? []).map((r) => [r.slug, r.name]));
  const audienceCards = new Map<string, AudienceCard>();
  for (const c of choices) {
    if (!isAudienceRow(c)) continue;
    const v = c.value as Record<string, unknown>;
    const row = typeof v.row === "string" ? v.row : "who";
    const name = typeof v.text === "string" ? v.text : "";
    if (name) audienceCards.set(audienceId(row, name), { row, rowLabel: rowLabel.get(row) ?? row, name, choice: c });
  }
  const lineRows = choices.filter((c) => c.decision === "open" && !isAudienceRow(c) && !isWordRow(c) && elementMap.get(c.element_id)?.slug !== STANCE_ELEMENT);
  for (const sug of suggestedCategories(lineRows)) {
    const id = audienceId(sug.row, sug.name);
    const taken = [...audienceCards.values()].some((a) => a.name.toLowerCase() === sug.name.toLowerCase());
    if (!taken && rowLabel.has(sug.row)) audienceCards.set(id, { row: sug.row, rowLabel: rowLabel.get(sug.row) ?? sug.row, name: sug.name, choice: null });
  }
  const knownCategories = [
    ...(data?.audienceCategories ?? []).map((c) => ({ name: c.name, row: c.row, id: c.id as string | null })),
    ...[...audienceCards.values()].map((a) => ({ name: a.name, row: a.row, id: null as string | null })),
  ];

  useEffect(() => {
    if (!data) return;
    const pending = data.findings.map((f) => [FINDING_PREFIX + f.key, f] as const);
    setShownFindings((cur) => {
      const next = new Map(cur);
      for (const [id, f] of pending) next.set(id, f);
      return next;
    });
    const fresh = freshIds(data);
    setOrder((prev) => {
      const ids = new Set(data.choices.map((c) => c.id));
      const present = new Set<string>([
        ...fresh,
        ...prev.filter((id) => {
          if (id.startsWith(CHOICE_PREFIX)) return ids.has(id.slice(CHOICE_PREFIX.length));
          if (id.startsWith(STANCE_PREFIX)) return ids.has(id.slice(STANCE_PREFIX.length));
          return true;
        }),
      ]);
      return keepOrder(prev, present, fresh);
    });
  }, [data]);

  const items: DeckItem[] = [];
  for (const id of order) {
    if (id.startsWith(STANCE_PREFIX)) {
      const row = choiceRows.get(id.slice(STANCE_PREFIX.length));
      if (row) items.push(stanceItem(row, stanceElement));
    } else if (id.startsWith(AUDIENCE_PREFIX)) {
      const card = audienceCards.get(id);
      if (card) items.push(audienceItem(card));
    } else if (id.startsWith(CHOICE_PREFIX)) {
      const row = choiceRows.get(id.slice(CHOICE_PREFIX.length));
      if (row) items.push(choiceItem(row, elementMap.get(row.element_id)));
    } else {
      const f = shownFindings.get(id);
      if (f) items.push(findingItem(f));
    }
  }

  const answers: Record<string, string> = {};
  const parts: Record<string, readonly DeckPart[]> = {};
  const picks: Record<string, string> = {};
  const chosenInGroup: Record<string, string | null> = {};
  for (const item of items) {
    if (item.id.startsWith(STANCE_PREFIX)) {
      const ai = choiceRows.get(item.id.slice(STANCE_PREFIX.length));
      const a = ai ? answerOfStance(ai, stanceAnswersOf(ai.id, choices)) : null;
      if (a) answers[item.id] = a;
    } else if (item.id.startsWith(AUDIENCE_PREFIX)) {
      const c = audienceCards.get(item.id)?.choice;
      const a = c ? answerOfChoice(c) : null;
      if (a) answers[item.id] = a;
    } else if (item.id.startsWith(CHOICE_PREFIX)) {
      const row = choiceRows.get(item.id.slice(CHOICE_PREFIX.length));
      if (!row) continue;
      const a = item.group ? answerOfPick(row) : answerOfChoice(row);
      if (a) answers[item.id] = a;
      if (item.group) {
        if (!(item.group in chosenInGroup)) chosenInGroup[item.group] = null;
        if (row.decision === "chosen") {
          picks[item.group] = item.id;
          chosenInGroup[item.group] = row.id;
        }
      }
      const stored = partsFor(seedParts(item), data?.words.get(row.id) ?? []);
      if (stored) parts[item.id] = stored;
    } else {
      const a = findingAnswers.get(item.id);
      if (a) answers[item.id] = a.answer;
    }
  }
  const state: DeckState = { answers, picks, parts, categories: categoryState([...audienceCards.values()]) };

  const refresh = () => queryClient.invalidateQueries({ queryKey: sessionDeckKey(brand.id) });

  const persistContext = () => ({
    organizationId: brandRef.current.organization_id,
    getBrand: () => brandRef.current,
    setBrand: (b: MarketingBrand) => {
      brandRef.current = b;
    },
    kinds: data?.kinds ?? [],
  });

  const applyFinding = async (itemId: string, answer: string | null) => {
    const item = shownFindings.get(itemId);
    if (!item) throw new Error("This finding is no longer on the brand.");
    const before = findingAnswers.get(itemId);
    // A finding answered again is first taken back, through the answer's own undo.
    if (before?.persisted) await before.persisted.undo();
    if (answer === null) {
      setFindingAnswers((m) => {
        const next = new Map(m);
        next.delete(itemId);
        return next;
      });
      return;
    }
    let persisted: Persisted | null = null;
    if (answer === "confirm" || answer === "reject") {
      try {
        persisted = await persistAnswer(persistContext(), item, smartAddAnswer(item.kind, answer));
      } catch (error) {
        throw new Error(reportAnswerNotSaved({ brandId: brand.id, item, answer: smartAddAnswer(item.kind, answer), value: item.value, error }));
      }
    }
    setFindingAnswers((m) => new Map(m).set(itemId, { answer: answer as FindingAnswer, persisted }));
  };

  const apply = async (ops: readonly DeckOp[]) => {
    try {
      await applyDeckOps(ops, {
        decide: decideChoice,
        correct: correctChoice,
        audience: (row, name, action, origin) => answerAudience(brand.id, row, name, action, origin),
        answerFinding: applyFinding,
        wordsOf: (choiceId) => data?.words.get(choiceId) ?? [],
        textOf: (itemId) => items.find((i) => i.id === itemId)?.text ?? "",
        seedsOf: (itemId) => {
          const item = items.find((i) => i.id === itemId);
          return item ? seedParts(item) : [];
        },
        stanceOf: (aiId) => {
          const ai = choiceRows.get(aiId);
          return ai ? { ai, answers: stanceAnswersOf(aiId, choices) } : null;
        },
        audienceOf: (itemId) => {
          const card = audienceCards.get(itemId);
          return card ? { row: card.row, name: card.name, suggested: !card.choice } : null;
        },
        categoryOf: (name) => {
          const k = knownCategories.find((c) => c.name.toLowerCase() === name.toLowerCase());
          return k ? { row: k.row, id: k.id } : null;
        },
        items,
        before: state,
        chosenInGroup,
      });
    } finally {
      await refresh();
    }
  };

  const binding: SwipeDeckBinding = {
    status: query.isError ? "error" : data && (order.length > 0 || freshIds(data).length === 0) ? "ready" : "loading",
    error: query.isError ? extractErrorMessage(query.error) : null,
    items,
    state,
    apply,
  };

  // What the deck needs beside its binding: the category rows on the part screen, and the pick-one groups.
  const groupLabels: Record<string, string> = {};
  for (const slug of PICK_ELEMENTS) {
    const el = elementBySlug.get(slug);
    if (el && isPickElement(el)) groupLabels[slug] = el.name;
  }
  const deckProps: { categoryRows: DeckCategoryRow[]; pickOne: readonly string[]; pickAnswer: string; groupLabels: Record<string, string> } = {
    categoryRows: categoryRows(data?.audienceRows ?? [], knownCategories),
    pickOne: PICK_ELEMENTS,
    pickAnswer: "shortlist",
    groupLabels,
  };

  const currentItem = items.find((i) => !state.answers[i.id]) ?? null;
  const currentRow = currentItem
    ? currentItem.id.startsWith(CHOICE_PREFIX)
      ? (choiceRows.get(currentItem.id.slice(CHOICE_PREFIX.length)) ?? null)
      : currentItem.id.startsWith(STANCE_PREFIX)
        ? (choiceRows.get(currentItem.id.slice(STANCE_PREFIX.length)) ?? null)
        : null
    : null;
  const snapshot: SessionSnapshot = {
    current: currentItem
      ? {
          card_id: currentItem.id,
          kind: kindOf(currentItem.id),
          element: currentItem.kicker ?? null,
          candidate: currentItem.text,
          suggestion: currentItem.suggestedLabel ?? currentItem.suggested ?? null,
          reason: currentItem.reason ?? null,
          origin: currentRow?.origin ?? null,
        }
      : null,
    counts: deckCounts(items, state),
  };

  /** The page agent's one write: a reworded candidate for the card in focus, left open for the person. */
  const proposeForCurrent = async (text: string) => {
    if (!currentRow || !currentItem?.id.startsWith(CHOICE_PREFIX)) throw new Error("The card in focus is not a brand candidate.");
    const words = text.trim();
    if (!words) throw new Error("A rewording needs words.");
    await proposeRewording(currentRow.id, words);
    await refresh();
  };

  // Nothing waiting at all: the page says so instead of drawing an empty deck.
  const empty = Boolean(data) && order.length === 0 && (data ? freshIds(data).length === 0 : false);
  return { binding, snapshot, proposeForCurrent, empty, deckProps };
}
