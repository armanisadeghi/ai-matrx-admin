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
