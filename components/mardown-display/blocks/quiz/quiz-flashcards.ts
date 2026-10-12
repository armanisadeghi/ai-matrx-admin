/**
 * A quiz in an answer becomes a real flashcard deck: each question is a card, the right answer
 * (and the explanation, when there is one) is its back. Saved through the platform's one deck
 * writer (`fcService.createSetWithCards`) — the same deck the flashcard sets and the canvas make,
 * so it is studied, scheduled and kept like any other deck.
 */
import type { NewCardInput } from "@/features/flashcards/data/types";
import type { OriginalQuestion } from "./quiz-types";

export function quizToFlashcards(questions: ReadonlyArray<OriginalQuestion>): NewCardInput[] {
  const cards: NewCardInput[] = [];
  for (const q of questions) {
    const front = (q.question ?? "").trim();
    const right = (q.options ?? [])[q.correctAnswer];
    const answer = typeof right === "string" ? right.trim() : "";
    if (!front || !answer) continue;
    const explanation = (q.explanation ?? "").trim();
    cards.push({ front, back: explanation ? `${answer}\n\n${explanation}` : answer });
  }
  return cards;
}

export const QUIZ_DECK_SOURCE = "quiz_block";

export interface QuizDeckDeps {
  find: (system: string, id: string) => Promise<{ data: { id: string } | null; error: string | null }>;
  create: (
    input: { name: string; metadata: Record<string, unknown> },
    cards: NewCardInput[],
  ) => Promise<{ data: { set: { id: string } } | null; error: string | null }>;
}

/**
 * One deck per quiz: asking again for the same quiz (same questions, whoever clicks, whenever)
 * returns the deck that already exists instead of making a duplicate.
 */
export async function makeQuizDeck(
  quiz: { title: string; contentHash: string; questions: ReadonlyArray<OriginalQuestion> },
  deps: QuizDeckDeps,
): Promise<{ ok: true; deckId: string; created: boolean; cardCount: number } | { ok: false; error: string }> {
  const existing = await deps.find(QUIZ_DECK_SOURCE, quiz.contentHash);
  if (existing.data) return { ok: true, deckId: existing.data.id, created: false, cardCount: 0 };
  const cards = quizToFlashcards(quiz.questions);
  if (cards.length === 0) return { ok: false, error: "This quiz has no question with a readable answer to turn into cards." };
  const res = await deps.create(
    { name: quiz.title || "Quiz", metadata: { source_system: QUIZ_DECK_SOURCE, source_id: quiz.contentHash } },
    cards,
  );
  if (!res.data) return { ok: false, error: res.error ?? "The flashcards could not be saved." };
  return { ok: true, deckId: res.data.set.id, created: true, cardCount: cards.length };
}
