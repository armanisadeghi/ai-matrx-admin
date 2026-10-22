import { seedParts, type DeckOp } from "@ai-matrx/design-system/swipe-deck";
import {
  AUDIENCE_PREFIX,
  CHOICE_PREFIX,
  FINDING_PREFIX,
  STANCE_PREFIX,
  answerOfPick,
  answerOfStance,
  audienceId,
  stanceItem,
  suggestedCategories,
  wordSeeds,
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
  ownLiveAnswers,
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

const tagline: ElementRow = { id: "e-tag", name: "Known for", slug: "b2_unique_attributes", position: 40, cardinality: "many" };
const realTagline: ElementRow = { id: "e-h6", name: "Tagline", slug: "h6_tagline", position: 50, cardinality: "single" };
const stanceEl: ElementRow = { id: "e-a3", name: "Offering stance", slug: "a3_offering_stance", position: 2, cardinality: "single_per_subject" };

function fakeDoors(words: WordRow[] = [], text = "Free e-waste drop-off for everyone") {
  const calls: string[] = [];
  const doors: DeckDoors = {
    decide: async (id, action) => {
      calls.push(`decide ${id} ${action}`);
    },
    correct: async (id, value, action) => {
      calls.push(`correct ${id} "${value.text}" ${value.start}-${value.end} ${action}`);
    },
    audience: async (row, name, action, origin) => {
      calls.push(`audience ${row} ${name} ${action} ${origin}`);
      return { category_id: `cat-${name}` };
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
    expect(item.kicker).toBe("Known for");
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
    // Found candidates carry their words as claim or offering; never shown as raw JSON.
    expect(choiceText({ claim: "Family owned since 1982" })).toBe("Family owned since 1982");
    expect(choiceText({ offering: "Roof repair" })).toBe("Roof repair");
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

  it("a logo finding shows the picture, not its address as text", () => {
    const logo = { key: "L1", kind: "logo", label: "Logo", value: "https://site.com/logo.png", title: null, source: "Website", detail: null, suggestion: null } as unknown as FocusItem;
    const item = findingItem(logo);
    expect(item.media).toEqual({ src: "https://site.com/logo.png", alt: "Logo", shape: "wide" });
    expect(item.text).toBe("");
    const own = { ...logo, imageUrl: "https://cdn.site.com/m.svg", value: "Logo" } as unknown as FocusItem;
    expect(findingItem(own).media?.src).toBe("https://cdn.site.com/m.svg");
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
    expect(plan).toEqual({ create: [{ start: 4, end: 4, answer: "not_us", categories: [] }], change: [{ id: "w1", answer: "lead" }], withdraw: ["w2"] });
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
    await expect(applyDeckOps([{ kind: "pick", group: "g", itemId: null }], doors)).rejects.toThrow(/no pick/);
    await expect(applyDeckOps([{ kind: "answer", itemId: `${FINDING_PREFIX}k1`, answer: "lead" }], doors)).rejects.toThrow(/cannot be answered/);
  });

  it("a stance card shows the agent's precise stance as the Suggestion, leaning to its merged swipe", () => {
    const item = stanceItem(row({ id: "s1", element_id: "e-a3", value: { offering: "E-waste drop-off", stance: "accept", primary_role: "traffic_builder" }, word_signals: [] }), stanceEl);
    expect(item.id).toBe(`${STANCE_PREFIX}s1`);
    expect(item.text).toBe("E-waste drop-off");
    expect(item.suggested).toBe("sustain_or_accept");
    expect(item.suggestedLabel).toBe("Accept");
    expect(item.answers?.right?.label).toBe("Grow");
    expect(item.answers?.up?.label).toBe("Sustain or Accept");
    expect(item.answers?.left?.label).toBe("Sunset or Refuse");
    expect(item.fields).toEqual([{ label: "Role", value: "Traffic builder" }]);
    // The role proposer's rows carry no stance today: no Suggestion is ever invented.
    expect(stanceItem(row({ value: { offering: "X", primary_role: "feeder" } }), stanceEl).suggested).toBeNull();
  });

  it("a stance answer is the person's own row; answering again withdraws it first; not sure parks the agent's row", async () => {
    const ai = row({ id: "s1", element_id: "e-a3", value: { offering: "Drop-off" } });
    const mine = row({ id: "m1", origin: "said", decision: "chosen", placement: "support", created_by: "me", value: { stance: "sustain_or_accept", offering: "Drop-off", answer_to: "s1" } });
    expect(answerOfStance(ai, [mine])).toBe("sustain_or_accept");
    expect(answerOfStance({ ...ai, decision: "parked" }, [])).toBe("not_sure");
    const { calls, doors } = fakeDoors();
    doors.personId = "me";
    doors.stanceOf = () => ({ ai, answers: [mine] });
    await applyDeckOps([{ kind: "answer", itemId: `${STANCE_PREFIX}s1`, answer: "grow" }], doors);
    expect(calls).toEqual(["decide m1 withdraw", 'correct s1 "undefined" undefined-undefined lead']);
    calls.length = 0;
    doors.stanceOf = () => ({ ai, answers: [] });
    await applyDeckOps([{ kind: "answer", itemId: `${STANCE_PREFIX}s1`, answer: "not_sure" }], doors);
    expect(calls).toEqual(["decide s1 not_sure"]);
    calls.length = 0;
    doors.stanceOf = () => ({ ai: { ...ai, decision: "parked" }, answers: [] });
    await applyDeckOps([{ kind: "answer", itemId: `${STANCE_PREFIX}s1`, answer: null }], doors);
    expect(calls).toEqual(["decide s1 retract"]);
  });

  it("a second editor answers a stance a colleague answered: only their OWN answer is withdrawn, the colleague's is left to the database to supersede", async () => {
    // REVIEW3 I2: the door refuses to withdraw another person's words (42501), so withdrawing every live answer made
    // person B's answer fail on a shared brand.
    const ai = row({ id: "s1", element_id: "e-a3", value: { offering: "Drop-off" } });
    const theirs = row({ id: "t1", origin: "said", decision: "chosen", placement: "lead", created_by: "colleague", value: { stance: "grow", offering: "Drop-off", answer_to: "s1" } });
    const mineOld = row({ id: "m0", origin: "said", decision: "superseded", placement: "support", created_by: "me", value: { stance: "sunset_or_refuse", offering: "Drop-off", answer_to: "s1" } });
    const { calls, doors } = fakeDoors();
    doors.decide = async (id, action) => {
      if (action === "withdraw" && id !== "m0" && id !== "m1") throw new Error("brand_choice_decide: only your own words (origin said) can be withdrawn");
      calls.push(`decide ${id} ${action}`);
    };
    doors.personId = "me";
    doors.stanceOf = () => ({ ai, answers: [theirs, mineOld] });
    await applyDeckOps([{ kind: "answer", itemId: `${STANCE_PREFIX}s1`, answer: "sustain_or_accept" }], doors);
    expect(calls).toEqual(['correct s1 "undefined" undefined-undefined support']);
    // Clearing withdraws nothing of the colleague's either.
    calls.length = 0;
    await applyDeckOps([{ kind: "answer", itemId: `${STANCE_PREFIX}s1`, answer: null }], doors);
    expect(calls).toEqual([]);
    // Unknown person: withdraw nothing rather than someone else's words.
    expect(ownLiveAnswers([theirs], null)).toEqual([]);
  });

  it("taglines are a pick: could be it shortlists, the pick chooses, switching shortlists the old pick back first", async () => {
    const t1 = choiceItem(row({ id: "t1", element_id: "e-h6", recommended_placement: "lead" }), realTagline);
    const t2 = choiceItem(row({ id: "t2", element_id: "e-h6" }), realTagline);
    expect(t1.group).toBe("h6_tagline");
    expect(t1.answers?.right?.id).toBe("shortlist");
    expect(t1.answers?.up).toBeNull();
    expect(t1.suggested).toBe("shortlist");
    expect(t1.pickSuggested).toBe(true);
    expect(answerOfPick({ decision: "chosen" })).toBe("shortlist");
    expect(answerOfPick({ decision: "superseded" })).toBe("shortlist");
    const { calls, doors } = fakeDoors();
    doors.items = [t1, t2];
    doors.chosenInGroup = { h6_tagline: "t1" };
    await applyDeckOps([{ kind: "pick", group: "h6_tagline", itemId: t2.id }], doors);
    expect(calls).toEqual(["decide t1 shortlist", "decide t2 lead"]);
    // Switching back: t2 shortlisted restores t1 (it had replaced it), so t1 is not chosen twice.
    calls.length = 0;
    doors.chosenInGroup = { h6_tagline: "t2" };
    doors.decide = async (id, action) => {
      calls.push(`decide ${id} ${action}`);
      return id === "t2" ? { restored: ["t1"] } : {};
    };
    await applyDeckOps([{ kind: "pick", group: "h6_tagline", itemId: t1.id }], doors);
    expect(calls).toEqual(["decide t2 shortlist"]);
  });

  it("a group answered down to one could-be-it picks it; undoing that answer un-picks it", async () => {
    const t1 = choiceItem(row({ id: "t1", element_id: "e-h6" }), realTagline);
    const t2 = choiceItem(row({ id: "t2", element_id: "e-h6" }), realTagline);
    const { calls, doors } = fakeDoors();
    doors.items = [t1, t2];
    doors.before = { answers: { [t1.id]: "shortlist" }, picks: {}, parts: {}, categories: {} };
    doors.chosenInGroup = { h6_tagline: null };
    await applyDeckOps([{ kind: "answer", itemId: t2.id, answer: "not_us" }], doors);
    expect(calls).toEqual(["decide t2 not_us", "decide t1 lead"]);
    calls.length = 0;
    doors.before = { answers: { [t1.id]: "shortlist", [t2.id]: "not_us" }, picks: { h6_tagline: t1.id }, parts: {}, categories: {} };
    doors.chosenInGroup = { h6_tagline: "t1" };
    await applyDeckOps([{ kind: "answer", itemId: t2.id, answer: null }], doors);
    expect(calls).toEqual(["decide t2 retract", "decide t1 shortlist"]);
  });

  it("audience: a card answer and a category answer go through the audience door, a new one in its row", async () => {
    const { calls, doors } = fakeDoors();
    doors.audienceOf = () => ({ row: "who", name: "households", suggested: true });
    doors.categoryOf = (name) => (name === "IT directors" ? { row: "who", id: "c-it" } : null);
    await applyDeckOps(
      [
        { kind: "answer", itemId: audienceId("who", "households"), answer: "not_us" },
        { kind: "answer", itemId: audienceId("who", "households"), answer: null },
        { kind: "category", name: "audit trail", answer: "lead", row: "cares_about" },
        { kind: "category", name: "IT directors", answer: "support" },
        { kind: "category", name: "audit trail", answer: null, remove: true },
      ],
      doors,
    );
    expect(calls).toEqual([
      "audience who households not_us said",
      "audience who households retract said",
      "audience cares_about audit trail lead said",
      "audience who IT directors support said",
      "audience who audit trail retract said",
    ]);
    expect(audienceId("who", "Households").startsWith(AUDIENCE_PREFIX)).toBe(true);
  });

  it("word checks carry their categories (who a word attracts), and those become audience suggestions", () => {
    expect(wordSeeds([{ word: "Free", attracts: "bargain-seeking households", verdict: "not_us" }])).toEqual([
      { phrase: "Free", suggested: "not_us", categories: ["bargain-seeking households"] },
    ]);
    const rows = [row({ word_signals: [{ word: "audit", categories: [{ name: "proof", row: "cares_about" }, "IT leads"] }, { word: "Free", attracts: "households" }] })];
    expect(suggestedCategories(rows)).toEqual([
      { name: "proof", row: "cares_about" },
      { name: "IT leads", row: "who" },
      { name: "households", row: "who" },
    ]);
  });

  it("a word tagged with a new category adds it first, then saves the person's words with the tags", async () => {
    const { calls, doors } = fakeDoors();
    doors.categoryOf = (name) => (name === "households" ? { row: "who", id: "c-h" } : null);
    await applyDeckOps([{ kind: "parts", itemId: `${CHOICE_PREFIX}c1`, parts: [{ start: 0, end: 0, categories: ["households", "price"], suggested: null, answer: null }] }], doors);
    expect(calls).toEqual(["audience who price null said", 'correct c1 "Free" 0-0 null']);
  });
});
