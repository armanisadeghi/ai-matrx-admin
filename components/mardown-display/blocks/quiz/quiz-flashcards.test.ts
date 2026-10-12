import { makeQuizDeck, quizToFlashcards } from "./quiz-flashcards";

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

describe("one deck per quiz", () => {
  const quiz = { title: "Cells", contentHash: "abc123", questions: [q()] };
  it("creates the deck the first time and opens the same one every time after", async () => {
    const store: Record<string, { id: string }> = {};
    const deps = {
      find: async (_s: string, id: string) => ({ data: store[id] ?? null, error: null }),
      create: jest.fn(async (input: { metadata: Record<string, unknown> }) => {
        const deck = { id: "deck-1" };
        store[String(input.metadata.source_id)] = deck;
        return { data: { set: deck }, error: null };
      }),
    };
    const first = await makeQuizDeck(quiz, deps);
    const second = await makeQuizDeck(quiz, deps);
    expect(first).toMatchObject({ ok: true, deckId: "deck-1", created: true, cardCount: 1 });
    expect(second).toMatchObject({ ok: true, deckId: "deck-1", created: false });
    expect(deps.create).toHaveBeenCalledTimes(1);
  });
  it("says so when there is nothing to turn into cards", async () => {
    const r = await makeQuizDeck({ ...quiz, questions: [] }, { find: async () => ({ data: null, error: null }), create: jest.fn() });
    expect(r.ok).toBe(false);
  });
});
