/**
 * Learn mode's stage machine: recognize (multiple choice) → recall (typed) →
 * mastered. A miss comes back later in the same round; a missed recall drops
 * the card back to multiple choice.
 */
import {
  LEARN_MISS_OFFSET,
  answerLearn,
  currentLearnItem,
  dealRound,
  isAllMastered,
  isRoundOver,
  learnCounts,
  startLearn,
  type LearnState,
} from "../learnQueue";

const ids = ["a", "b", "c", "d", "e", "f"];

function answerAll(state: LearnState, correct: boolean): LearnState {
  let s = state;
  while (!isRoundOver(s)) s = answerLearn(s, correct);
  return s;
}

describe("learn queue stages", () => {
  it("a correct multiple-choice answer promotes the card to typed recall", () => {
    let s = dealRound(startLearn(ids), 3);
    expect(currentLearnItem(s)).toEqual({ cardId: "a", stage: "choice" });
    s = answerLearn(s, true);
    expect(s.stages.a).toBe("typed");
    expect(s.roundCorrect).toBe(1);
    // Not asked again this round — it comes back typed next round.
    expect(s.queue.filter((q) => q.cardId === "a")).toHaveLength(1);
    s = answerAll(s, true);
    s = dealRound(s, 3);
    expect(s.queue.slice(0, 3)).toEqual([
      { cardId: "a", stage: "typed" },
      { cardId: "b", stage: "typed" },
      { cardId: "c", stage: "typed" },
    ]);
  });

  it("a wrong multiple-choice answer comes back later in the same round", () => {
    let s = dealRound(startLearn(ids), 5);
    s = answerLearn(s, false);
    expect(s.stages.a).toBe("choice");
    expect(s.queue[1 + LEARN_MISS_OFFSET]).toEqual({ cardId: "a", stage: "choice" });
    expect(s.roundMissed).toEqual(["a"]);
  });

  it("a wrong typed answer goes back to multiple choice later in the round", () => {
    let s = dealRound(startLearn(ids), 2);
    s = answerAll(s, true); // a, b → typed
    s = dealRound(s, 2);
    expect(currentLearnItem(s)).toEqual({ cardId: "a", stage: "typed" });
    s = answerLearn(s, false);
    expect(s.stages.a).toBe("choice");
    // Round had 2 questions; the miss is appended after b.
    expect(s.queue).toEqual([
      { cardId: "a", stage: "typed" },
      { cardId: "b", stage: "typed" },
      { cardId: "a", stage: "choice" },
    ]);
    expect(isRoundOver(s)).toBe(false);
  });

  it("a card is mastered only after a correct typed answer", () => {
    let s = dealRound(startLearn(["a"]), 1);
    s = answerLearn(s, true);
    expect(s.stages.a).toBe("typed");
    expect(isAllMastered(s)).toBe(false);
    s = dealRound(s, 1);
    s = answerLearn(s, true);
    expect(s.stages.a).toBe("mastered");
    expect(isAllMastered(s)).toBe(true);
    expect(learnCounts(s)).toEqual({ choice: 0, typed: 0, mastered: 1 });
  });

  it("a card missed twice waits for the next round, so the round ends", () => {
    let s = dealRound(startLearn(["a", "b"]), 2);
    s = answerAll(s, false);
    expect(s.queue.map((q) => q.cardId)).toEqual(["a", "b", "a", "b"]);
    expect(isRoundOver(s)).toBe(true);
    expect(s.roundMissed).toEqual(["a", "b"]);
    expect(s.roundCorrect).toBe(0);
  });

  it("rounds skip mastered cards and size 0 deals every open card", () => {
    let s = dealRound(startLearn(["a", "b", "c"], new Set(["a"])), 0);
    expect(s.queue.map((q) => q.stage)).toEqual(["typed", "choice", "choice"]);
    s = answerAll(s, true);
    s = dealRound(s, 0);
    expect(s.roundCardIds).toEqual(["b", "c"]);
  });
});
