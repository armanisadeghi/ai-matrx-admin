/**
 * Review 4 F5: the same quiz showed Oslo/Rome/Paris, then Paris/Oslo/Rome, then Oslo/Paris/Rome, then
 * Rome/Oslo/Paris — the options were re-shuffled on every mount. A quiz is shuffled once: the same
 * question always deals the same order, and the right answer still follows its option.
 */
import { randomizeQuestion } from "./quiz-utils";

const q = (id: number, question: string, options: string[], correctAnswer = 0) => ({ id, question, options, correctAnswer, explanation: "" });

describe("quiz option order is stable across renders", () => {
  const capital = q(1, "Capital of France?", ["Paris", "Oslo", "Rome"], 0);

  it("deals the same order every time for the same question", () => {
    const first = randomizeQuestion(capital).options;
    for (let i = 0; i < 25; i++) expect(randomizeQuestion(capital).options).toEqual(first);
  });

  it("still tracks the right answer through the shuffle", () => {
    const dealt = randomizeQuestion(capital);
    expect(dealt.options[dealt.correctAnswerIndex]).toBe("Paris");
    expect(dealt.shuffleMap.map((i) => capital.options[i])).toEqual(dealt.options);
  });

  it("still shuffles (some questions are dealt out of their written order)", () => {
    const moved = Array.from({ length: 12 }, (_, i) => q(i + 1, `Question ${i + 1}?`, ["A", "B", "C", "D"])).filter(
      (question) => randomizeQuestion(question).options.join() !== "A,B,C,D",
    );
    expect(moved.length).toBeGreaterThan(6);
  });
});
