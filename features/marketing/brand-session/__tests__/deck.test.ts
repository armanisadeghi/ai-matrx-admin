import { seedParts, type DeckOp } from "@ai-matrx/design-system/swipe-deck";
import {
  CHOICE_PREFIX,
  FINDING_PREFIX,
  answerOfChoice,
  applyDeckOps,
  choiceItem,
  choiceText,
  findingItem,
  keepOrder,
  orderChoices,
  partsFor,
  planParts,
  smartAddAnswer,
  type ChoiceRow,
  type DeckDoors,
  type ElementRow,
  type WordRow,
} from "../deck";
import type { FocusItem } from "@/features/marketing/smart-add/validate/queue";

const row = (over: Partial<ChoiceRow> = {}): ChoiceRow => ({
  id: "c1",
  brand_id: "b1",
  element_id: "e-tag",
  value: { text: "Free e-waste drop-off for everyone" },
  origin: "ai",
  recommended_placement: "support",
  opinion_reason: "Draws households, not companies",
  word_signals: [{ word: "free", verdict: "not_us" }, { word: "drop-off", verdict: "support" }, { word: "everyone" }],
  decision: "open",
  placement: null,
  decided_by: null,
  decided_at: null,
  decision_reason: null,
  organization_id: "o1",
  created_at: "2026-10-22T00:00:00Z",
  ...over,
});

const tagline: ElementRow = { id: "e-tag", name: "Tagline", slug: "h6_tagline", position: 40, cardinality: "single" };

function fakeDoors(words: WordRow[] = [], text = "Free e-waste drop-off for everyone") {
  const calls: string[] = [];
  const doors: DeckDoors = {
    decide: async (id, action) => {
      calls.push(`decide ${id} ${action}`);
    },
    correct: async (id, value, action) => {
      calls.push(`correct ${id} "${value.text}" ${value.start}-${value.end} ${action}`);
    },
    answerFinding: async (id, answer) => {
      calls.push(`finding ${id} ${answer}`);
    },
    wordsOf: () => words,
    textOf: () => text,
  };
  return { calls, doors };
}

describe("brand session deck", () => {
  it("a choice card asks where it belongs, leans to the curator's placement, and keeps the word check as parts", () => {
    const item = choiceItem(row(), tagline);
    expect(item.id).toBe(`${CHOICE_PREFIX}c1`);
    expect(item.kicker).toBe("Tagline");
    expect(item.suggested).toBe("support");
    expect(item.reason).toBe("Draws households, not companies");
    expect(item.answers?.right?.id).toBe("lead");
    expect(item.answers?.up?.id).toBe("support");
    expect(item.answers?.left?.id).toBe("not_us");
    expect(item.answers?.down?.id).toBe("not_sure");
    const parts = seedParts(item);
    expect(parts.map((p) => [p.start, p.end, p.suggested])).toEqual([[0, 0, "not_us"], [2, 2, "support"], [4, 4, null]]);
  });

  it("an unknown recommendation is never shown as a suggestion", () => {
    expect(choiceItem(row({ recommended_placement: null }), tagline).suggested).toBeNull();
  });

  it("the card's answer is the row's decision; a superseded value keeps where it was placed", () => {
    expect(answerOfChoice({ decision: "open", placement: null })).toBeNull();
    expect(answerOfChoice({ decision: "chosen", placement: "lead" })).toBe("lead");
    expect(answerOfChoice({ decision: "chosen", placement: "support" })).toBe("support");
    expect(answerOfChoice({ decision: "superseded", placement: "support" })).toBe("support");
    expect(answerOfChoice({ decision: "declined", placement: null })).toBe("not_us");
    expect(answerOfChoice({ decision: "parked", placement: null })).toBe("not_sure");
  });

  it("candidate words read from text, a string, or a list", () => {
    expect(choiceText({ text: "Hi" })).toBe("Hi");
    expect(choiceText("Hi")).toBe("Hi");
    expect(choiceText({ items: ["a", "b"] })).toBe("a · b");
  });

  it("a finding is confirmed or not, through Smart Add's own answers; a name is kept as an alias", () => {
    const fact = { key: "k1", kind: "fact", label: "Founded", value: "1990", title: null, source: "Website", detail: null, suggestion: { choice: "correct", relation_key: null, probability: null, reason: "On the about page" } } as unknown as FocusItem;
    const item = findingItem(fact);
    expect(item.id).toBe(`${FINDING_PREFIX}k1`);
    expect(item.suggested).toBe("confirm");
    expect(item.answers?.up).toBeNull();
    expect(item.answers?.right?.label).toBe("Correct");
    expect(smartAddAnswer("fact", "confirm")).toBe("correct");
    expect(smartAddAnswer("fact", "reject")).toBe("wrong");
    expect(smartAddAnswer("name", "confirm")).toBe("alias");
    expect(smartAddAnswer("account", "confirm")).toBe("ours");
    expect(smartAddAnswer("website", "reject")).toBe("not_us");
  });

  it("orders choices by the element's place, then oldest first", () => {
    const els = new Map<string, ElementRow>([
      ["e-tag", tagline],
      ["e-goal", { id: "e-goal", name: "Goals", slug: "a2_goals", position: 1, cardinality: "many" }],
    ]);
    const ordered = orderChoices([row({ id: "t" }), row({ id: "g2", element_id: "e-goal", created_at: "2026-10-23" }), row({ id: "g1", element_id: "e-goal" })], els);
    expect(ordered.map((r) => r.id)).toEqual(["g1", "g2", "t"]);
  });

  it("keeps the sitting's order: answered cards stay in place, new ones join the end, gone ones drop", () => {
    expect(keepOrder(["a", "b", "c"], new Set(["a", "c", "d"]), ["d", "a"])).toEqual(["a", "c", "d"]);
  });

  it("parts: the person's answered spans lay over the seeds", () => {
    const seeds = seedParts(choiceItem(row(), tagline));
    const words: WordRow[] = [{ id: "w1", of: "c1", start: 0, end: 0, answer: "not_us" }];
    const parts = partsFor(seeds, words);
    expect(parts?.find((p) => p.start === 0)?.answer).toBe("not_us");
    expect(parts?.length).toBe(3);
    expect(partsFor(seeds, [])).toBeNull();
  });

  it("plans a parts change: new answered spans saved, changed ones re-placed, removed ones withdrawn", () => {
    const words: WordRow[] = [
      { id: "w1", of: "c1", start: 0, end: 0, answer: "not_us" },
      { id: "w2", of: "c1", start: 2, end: 2, answer: "support" },
    ];
    const plan = planParts(
      [
        { start: 0, end: 0, categories: [], suggested: null, answer: "lead" },
        { start: 4, end: 4, categories: [], suggested: null, answer: "not_us" },
        { start: 3, end: 3, categories: [], suggested: null, answer: null },
      ],
      words,
    );
    expect(plan).toEqual({ create: [{ start: 4, end: 4, answer: "not_us" }], change: [{ id: "w1", answer: "lead" }], withdraw: ["w2"] });
  });

  it("every deck op goes through its one door; taking an answer back retracts", async () => {
    const { calls, doors } = fakeDoors([{ id: "w1", of: "c1", start: 0, end: 0, answer: "not_us" }]);
    const ops: DeckOp[] = [
      { kind: "answer", itemId: `${CHOICE_PREFIX}c1`, answer: "lead" },
      { kind: "answer", itemId: `${CHOICE_PREFIX}c1`, answer: null },
      { kind: "answer", itemId: `${FINDING_PREFIX}k1`, answer: "confirm" },
      { kind: "answer", itemId: `${FINDING_PREFIX}k1`, answer: null },
      { kind: "parts", itemId: `${CHOICE_PREFIX}c1`, parts: [{ start: 4, end: 4, categories: [], suggested: null, answer: "not_us" }] },
    ];
    await applyDeckOps(ops, doors);
    expect(calls).toEqual([
      "decide c1 lead",
      "decide c1 retract",
      "finding finding:k1 confirm",
      "finding finding:k1 null",
      "decide w1 withdraw",
      'correct c1 "everyone" 4-4 not_us',
    ]);
  });

  it("refuses what this deck does not do, never drops it", async () => {
    const { doors } = fakeDoors();
    await expect(applyDeckOps([{ kind: "pick", group: "g", itemId: null }], doors)).rejects.toThrow(/no picks/);
    await expect(applyDeckOps([{ kind: "answer", itemId: `${FINDING_PREFIX}k1`, answer: "lead" }], doors)).rejects.toThrow(/cannot be answered/);
  });
});
