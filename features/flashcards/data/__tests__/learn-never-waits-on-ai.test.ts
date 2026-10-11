/**
 * Learn never makes a learner wait on the meaning check (table stakes):
 * an answer that matches after normalisation is correct instantly with no AI
 * call, and a verdict that lands after the learner moved on is applied to the
 * card's stage then — never by holding Continue.
 */
import { answersMatch } from "../../utils/textSimilarity";
import {
  answerLearn,
  currentLearnItem,
  dealRound,
  settleTypedVerdict,
  startLearn,
  type LearnState,
} from "../learnQueue";

function atRecall(ids: string[]): LearnState {
  // Deal every card straight into recall (typed-only deck).
  return dealRound(startLearn(ids, new Set(ids)), 0);
}

describe("answersMatch — the instant, no-AI correct", () => {
  it("ignores case, whitespace, punctuation and accents", () => {
    expect(answersMatch("  Café   Olé! ", "cafe ole")).toBe(true);
    expect(answersMatch("Mitochondria.", "mitochondria")).toBe(true);
    expect(answersMatch("naïve", "Naive")).toBe(true);
  });
  it("ignores markdown emphasis on the card's answer", () => {
    expect(answersMatch("photosynthesis", "**Photosynthesis**")).toBe(true);
  });
  it("is not a fuzzy match", () => {
    expect(answersMatch("mitochondrion", "mitochondria")).toBe(false);
    expect(answersMatch("", "anything")).toBe(false);
  });
});

describe("settleTypedVerdict — a late meaning verdict", () => {
  it("a late wrong verdict demotes a provisionally mastered card to multiple choice for a later round", () => {
    let s = atRecall(["a", "b", "c"]);
    const round = s.round;
    s = answerLearn(s, true); // a: provisional correct → mastered
    expect(s.stages.a).toBe("mastered");
    s = settleTypedVerdict(s, { cardId: "a", round, provisionalCorrect: true, correct: false });
    expect(s.stages.a).toBe("choice");
    // Not asked again this round — it waits for a later one.
    expect(s.queue.map((q) => q.cardId)).toEqual(["a", "b", "c"]);
    expect(s.roundMissed).toEqual(["a"]);
    expect(s.roundCorrect).toBe(0);
  });

  it("a late correct verdict masters a card the provisional grade sent back, dropping its re-ask", () => {
    let s = atRecall(["a", "b", "c"]);
    const round = s.round;
    s = answerLearn(s, false); // a: provisional miss → back to choice, re-asked later
    expect(s.queue.some((q, i) => i > 0 && q.cardId === "a")).toBe(true);
    s = settleTypedVerdict(s, { cardId: "a", round, provisionalCorrect: false, correct: true });
    expect(s.stages.a).toBe("mastered");
    expect(s.queue.map((q) => q.cardId)).toEqual(["a", "b", "c"]);
    expect(s.roundMissed).toEqual([]);
    expect(s.roundCorrect).toBe(1);
    expect(currentLearnItem(s)).toEqual({ cardId: "b", stage: "typed" });
  });

  it("a verdict from an earlier round changes the stage only", () => {
    let s = atRecall(["a", "b"]);
    const round = s.round;
    s = answerLearn(s, true);
    s = answerLearn(s, true);
    s = dealRound(s, 0); // nothing open → empty round 2
    s = settleTypedVerdict(s, { cardId: "a", round, provisionalCorrect: true, correct: false });
    expect(s.stages.a).toBe("choice");
    expect(s.roundMissed).toEqual([]);
    expect(s.roundCorrect).toBe(0);
  });

  it("a verdict that agrees with the provisional grade changes nothing", () => {
    let s = atRecall(["a"]);
    const round = s.round;
    s = answerLearn(s, true);
    expect(settleTypedVerdict(s, { cardId: "a", round, provisionalCorrect: true, correct: true })).toBe(s);
  });
});
