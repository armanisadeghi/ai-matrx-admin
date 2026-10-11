// features/education/tutor/seeds.ts
//
// The ONE place a study surface turns "the thing in view" into a tutor seed
// for AskTutorButton / AskTutorPanel. Each builder names what the learner is
// looking at, so the tutor opens already knowing the card, question, deck or
// document — and, after a miss, what the learner said vs. what was right.
//
// Pure functions; no React.

import type { TutorGroundingSeed } from "./grounding";

/** Long documents are cut so the seed stays a focused grounding slice. */
const MAX_DOCUMENT_CHARS = 8000;
/** A deck seed lists at most this many cards. */
const MAX_DECK_CARDS = 40;

function clip(text: string, max: number): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max)}\n…(truncated)` : t;
}

/** One flashcard. Before the learner answers, ask the tutor to guide, not reveal. */
export function flashcardTutorSeed({
  front,
  back,
  topic,
  learnerAnswer,
  answered,
}: {
  front: string;
  back: string;
  topic?: string | null;
  learnerAnswer?: string | null;
  answered: boolean;
}): TutorGroundingSeed {
  const lines = [`Front: "${front}"`, `Back: "${back}"`];
  if (topic) lines.push(`Topic: ${topic}`);
  if (answered && learnerAnswer != null && learnerAnswer !== "") {
    lines.push(`The learner answered: "${learnerAnswer}"`);
  }
  if (!answered) {
    lines.push(
      "The learner has not answered yet — guide their recall; do not give the answer unless they ask for it.",
    );
  }
  return { title: "This flashcard the learner is studying", material: lines.join("\n") };
}

/** An answered question — the "Ask why" seed (missed unless `wasCorrect`). */
export function missedQuestionTutorSeed({
  question,
  learnerAnswer,
  correctAnswer,
  explanation,
  wasCorrect = false,
}: {
  question: string;
  learnerAnswer?: string | null;
  correctAnswer?: string | null;
  explanation?: string | null;
  wasCorrect?: boolean;
}): TutorGroundingSeed {
  const lines = [`Question: ${question}`];
  lines.push(
    `The learner answered: ${learnerAnswer && learnerAnswer.trim() !== "" ? `"${learnerAnswer}"` : "(no answer)"}`,
  );
  if (correctAnswer) lines.push(`Correct answer: "${correctAnswer}"`);
  if (explanation) lines.push(`Explanation given: ${explanation}`);
  lines.push(
    wasCorrect
      ? "The learner got this right — deepen their understanding of why."
      : "Explain why the learner's answer was wrong and how to get it right.",
  );
  return {
    title: wasCorrect ? "A question the learner answered" : "A question the learner missed",
    material: lines.join("\n"),
  };
}

/** A question the learner is answering now (nothing revealed). */
export function openQuestionTutorSeed({
  question,
  options,
}: {
  question: string;
  options?: string[];
}): TutorGroundingSeed {
  const lines = [`Question: ${question}`];
  if (options && options.length > 0) {
    lines.push(`Options: ${options.map((o) => `"${o}"`).join(", ")}`);
  }
  lines.push(
    "The learner is answering this now — help them reason; do not give the answer unless they ask for it.",
  );
  return { title: "The question the learner is on", material: lines.join("\n") };
}

/** A whole deck (Match, Play live). */
export function deckTutorSeed(
  name: string,
  cards: { front: string; back: string }[],
): TutorGroundingSeed {
  const shown = cards.slice(0, MAX_DECK_CARDS);
  const lines = shown.map((c) => `- "${c.front}" → "${c.back}"`);
  if (cards.length > shown.length) {
    lines.push(`…and ${cards.length - shown.length} more cards`);
  }
  return { title: `The deck "${name}"`, material: lines.join("\n") };
}

/** A document the learner is reading (summary, notes, kit). */
export function documentTutorSeed(kind: string, title: string, text: string): TutorGroundingSeed {
  return {
    title: `The ${kind} "${title}"`,
    material: clip(text, MAX_DOCUMENT_CHARS),
  };
}
