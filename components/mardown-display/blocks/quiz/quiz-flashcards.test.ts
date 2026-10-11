import { quizToFlashcards } from "./quiz-flashcards";

const q = (over: Partial<Parameters<typeof quizToFlashcards>[0][number]> = {}) => ({
  id: 1,
  question: "Which organelle makes ATP?",
  options: ["Nucleus", "Mitochondrion", "Golgi apparatus"],
  correctAnswer: 1,
  explanation: "Oxidative phosphorylation happens on the inner membrane.",
  ...over,
});

describe("a quiz becomes flashcards", () => {
  it("makes the question the front and the right answer plus the explanation the back", () => {
    expect(quizToFlashcards([q()])).toEqual([
      {
        front: "Which organelle makes ATP?",
        back: "Mitochondrion\n\nOxidative phosphorylation happens on the inner membrane.",
      },
    ]);
  });

  it("keeps a bare answer when there is no explanation", () => {
    expect(quizToFlashcards([q({ explanation: "  " })])[0].back).toBe("Mitochondrion");
  });

  it("drops a question that has no readable question or no right answer instead of making a blank card", () => {
    expect(quizToFlashcards([q({ question: " " }), q({ correctAnswer: 9 }), q({ options: [] })])).toEqual([]);
  });
});
