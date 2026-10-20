/**
 * AN EDITED QUIZ KEEPS ITS OPTIONS WHERE THE PERSON SEES THEM (review 2026-10-19 #16).
 * Editing through Controls re-dealt every question with a fresh shuffle (3,4,5 → 5,4,3 → 4,5,3).
 * Break it names: re-dealing with initializeQuizState → "keeps the screen order" red.
 */
import { initializeQuizState, redealEditedQuiz } from "./quiz-utils";
import type { OriginalQuestion } from "./quiz-types";

const q = (options: string[], correctAnswer: number, id = 1): OriginalQuestion =>
  ({ id, question: `Q${id}`, options, correctAnswer, explanation: "" }) as OriginalQuestion;

describe("redealEditedQuiz", () => {
  it("keeps the screen order across many edits", () => {
    let state = initializeQuizState([q(["3", "4", "5"], 1)]);
    const first = state.randomizedQuestions[0]!.options.join(",");
    for (let i = 0; i < 20; i++) {
      state = redealEditedQuiz(state, [q(["3", "4", "5"], i % 3)]);
      expect(state.randomizedQuestions[0]!.options.join(",")).toBe(first);
    }
  });
  it("tracks the right answer by its new place, and -1 when there is none", () => {
    const start = initializeQuizState([q(["a", "b", "c"], 0)]);
    const shown = start.randomizedQuestions[0]!.options;
    const next = redealEditedQuiz(start, [q(["a", "b", "c"], 2)]).randomizedQuestions[0]!;
    expect(next.options[next.correctAnswerIndex]).toBe("c");
    expect(next.options).toEqual(shown);
    const none = redealEditedQuiz(start, [q(["a", "b", "c"], null as unknown as number)]).randomizedQuestions[0]!;
    expect(none.correctAnswerIndex).toBe(-1);
  });
  it("a renamed option keeps its slot; a new option joins at the end; a removed one leaves", () => {
    const start = initializeQuizState([q(["a", "b", "c"], 0)]);
    const shown = start.randomizedQuestions[0]!.options;
    const renamed = redealEditedQuiz(start, [q(["a", "B!", "c"], 0)]).randomizedQuestions[0]!.options;
    expect(renamed).toEqual(shown.map((o) => (o === "b" ? "B!" : o)));
    const grown = redealEditedQuiz(start, [q(["a", "b", "c", "d"], 0)]).randomizedQuestions[0]!.options;
    expect(grown).toEqual([...shown, "d"]);
    const shrunk = redealEditedQuiz(start, [q(["a", "c"], 0)]).randomizedQuestions[0]!.options;
    expect(shrunk).toEqual(shown.filter((o) => o !== "b"));
  });
});
