"use client";

/**
 * The brand session deck as a SwipeDeckBinding: the canonical `@ai-matrx/design-system/swipe-deck` draws it and
 * persists every change through `apply` (optimistic, rolled back with the database's own sentence). Any screen
 * the design session builds binds the same way: `binding` in, `snapshot` out for the page agent.
 *
 * The cards of a sitting: the findings waiting for a confirm, then the brand's OPEN candidates, in a stable order
 * kept for the whole sitting (an answered card stays where it was, so undo brings it back in place; a candidate a run
 * writes meanwhile joins at the end). Truth comes from the database: a choice card's answer is its row's decision; the
 * query lives under the brand's query key, so `useLiveBrand`'s realtime refresh re-reads it when anything changes.
 */

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { seedParts, type DeckItem, type DeckOp, type DeckPart, type DeckState, type SwipeDeckBinding } from "@ai-matrx/design-system/swipe-deck";

import { extractErrorMessage } from "@/utils/errors";
import { marketingKeys } from "@/features/marketing/data/hooks";
import type { MarketingBrand } from "@/features/marketing/types";
import { persistAnswer, type Persisted } from "@/features/marketing/smart-add/validate/persist";
import type { FocusItem } from "@/features/marketing/smart-add/validate/queue";
import { reportAnswerNotSaved } from "@/features/marketing/smart-add/validate/notSaved";
import {
  CHOICE_PREFIX,
  FINDING_PREFIX,
  answerOfChoice,
  applyDeckOps,
  choiceItem,
  deckCounts,
  findingItem,
  keepOrder,
  orderChoices,
  partsFor,
  smartAddAnswer,
  type ChoiceRow,
  type FindingAnswer,
} from "./deck";
import { correctChoice, decideChoice, loadSession, proposeRewording, type SessionData } from "./service";

export const sessionDeckKey = (brandId: string) => [...marketingKeys.root, "brand", brandId, "session-deck"] as const;

interface FindingAnswered {
  answer: FindingAnswer;
  persisted: Persisted | null;
}

/** What the page agent reads: the card in focus and where the sitting stands. */
export interface SessionSnapshot {
  current: {
    card_id: string;
    kind: "choice" | "finding";
    element: string | null;
    candidate: string;
    suggestion: string | null;
    reason: string | null;
    origin: string | null;
  } | null;
  counts: { total: number; answered: number; choices: number; findings: number };
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

  const choiceRows = new Map<string, ChoiceRow>((data?.choices ?? []).map((c) => [CHOICE_PREFIX + c.id, c]));
  const elementMap = new Map((data?.elements ?? []).map((e) => [e.id, e]));

  useEffect(() => {
    if (!data) return;
    const pending = data.findings.map((f) => [FINDING_PREFIX + f.key, f] as const);
    setShownFindings((cur) => {
      const next = new Map(cur);
      for (const [id, f] of pending) next.set(id, f);
      return next;
    });
    const words = new Set([...data.words.values()].flat().map((w) => w.id));
    const open = orderChoices(
      data.choices.filter((c) => c.decision === "open" && !words.has(c.id)),
      new Map(data.elements.map((e) => [e.id, e])),
    );
    const fresh = [...pending.map(([id]) => id), ...open.map((c) => CHOICE_PREFIX + c.id)];
    setOrder((prev) => {
      const present = new Set<string>([
        ...fresh,
        ...prev.filter((id) => (id.startsWith(CHOICE_PREFIX) ? data.choices.some((c) => CHOICE_PREFIX + c.id === id) : true)),
      ]);
      return keepOrder(prev, present, fresh);
    });
  }, [data]);

  const items: DeckItem[] = [];
  for (const id of order) {
    if (id.startsWith(CHOICE_PREFIX)) {
      const row = choiceRows.get(id);
      if (row) items.push(choiceItem(row, elementMap.get(row.element_id)));
    } else {
      const f = shownFindings.get(id);
      if (f) items.push(findingItem(f));
    }
  }

  const answers: Record<string, string> = {};
  const parts: Record<string, readonly DeckPart[]> = {};
  for (const item of items) {
    if (item.id.startsWith(CHOICE_PREFIX)) {
      const row = choiceRows.get(item.id);
      const a = row ? answerOfChoice(row) : null;
      if (a) answers[item.id] = a;
      const stored = row ? partsFor(seedParts(item), data?.words.get(row.id) ?? []) : null;
      if (stored) parts[item.id] = stored;
    } else {
      const a = findingAnswers.get(item.id);
      if (a) answers[item.id] = a.answer;
    }
  }
  const state: DeckState = { answers, picks: {}, parts, categories: {} };

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
    await applyDeckOps(ops, {
      decide: decideChoice,
      correct: correctChoice,
      answerFinding: applyFinding,
      wordsOf: (choiceId) => data?.words.get(choiceId) ?? [],
      textOf: (itemId) => items.find((i) => i.id === itemId)?.text ?? "",
    });
    await refresh();
  };

  const binding: SwipeDeckBinding = {
    status: query.isError ? "error" : data && (order.length > 0 || (data.findings.length === 0 && !data.choices.some((c) => c.decision === "open"))) ? "ready" : "loading",
    error: query.isError ? extractErrorMessage(query.error) : null,
    items,
    state,
    apply,
  };

  const currentItem = items.find((i) => !state.answers[i.id]) ?? null;
  const currentRow = currentItem ? (choiceRows.get(currentItem.id) ?? null) : null;
  const snapshot: SessionSnapshot = {
    current: currentItem
      ? {
          card_id: currentItem.id,
          kind: currentItem.id.startsWith(CHOICE_PREFIX) ? "choice" : "finding",
          element: currentItem.kicker ?? null,
          candidate: currentItem.text,
          suggestion: currentItem.suggested ?? null,
          reason: currentItem.reason ?? null,
          origin: currentRow?.origin ?? null,
        }
      : null,
    counts: deckCounts(items, state),
  };

  /** The page agent's one write: a reworded candidate for the card in focus, left open for the person. */
  const proposeForCurrent = async (text: string) => {
    if (!currentRow) throw new Error("The card in focus is not a brand candidate.");
    const words = text.trim();
    if (!words) throw new Error("A rewording needs words.");
    await proposeRewording(currentRow.id, words);
    await refresh();
  };

  // Nothing waiting at all: the page says so instead of drawing an empty deck.
  const empty = Boolean(data) && items.length === 0 && !data?.findings.length && !data?.choices.some((c) => c.decision === "open");
  return { binding, snapshot, proposeForCurrent, empty };
}
