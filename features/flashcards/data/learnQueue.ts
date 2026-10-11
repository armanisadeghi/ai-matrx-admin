// features/flashcards/data/learnQueue.ts
//
// Learn mode's staged queue (Quizlet Learn parity). Every card climbs two
// stages: RECOGNIZE (multiple choice, built by Test's buildQuizQuestions) then
// RECALL (typed, graded on meaning by Write's grader). A card is mastered only
// when it is answered correctly in the harder format. Study happens in short
// rounds; a miss in the round puts the card back a few questions later, and a
// missed recall drops it back to multiple choice.
//
// Pure — no React, no I/O. The surface records every answer through the one
// study write path (useFlashcardStudy.grade) and steps this machine.

/** Where a card sits on its way to mastery. */
export type LearnStage = "choice" | "typed" | "mastered";

/** One question in the current round: a card, asked in one format. */
export interface LearnItem {
  cardId: string;
  stage: Exclude<LearnStage, "mastered">;
}

export interface LearnState {
  /** Every deck card, in the order rounds draw from. */
  order: string[];
  stages: Record<string, LearnStage>;
  /** The current round's questions; misses are re-inserted later. */
  queue: LearnItem[];
  /** Index of the question on screen; `queue.length` = round over. */
  position: number;
  /** 1-based round number (0 before the first deal). */
  round: number;
  /** Cards dealt into this round. */
  roundCardIds: string[];
  /** Cards missed at least once this round. */
  roundMissed: string[];
  /** Questions answered right this round. */
  roundCorrect: number;
}

/** How many questions later a missed card comes back in the same round. */
export const LEARN_MISS_OFFSET = 3;
/** Most times one card is asked in a round — a card missed again waits for
 *  the next round, so a struggling learner's round still ends. */
export const LEARN_MAX_ASKS_PER_ROUND = 2;

/**
 * A fresh Learn run over `cardIds` (already in the order rounds should draw
 * them). `typedOnly` cards have no multiple-choice question (a deck too small
 * for distractors) and start at recall.
 */
export function startLearn(
  cardIds: readonly string[],
  typedOnly: ReadonlySet<string> = new Set(),
): LearnState {
  const stages: Record<string, LearnStage> = {};
  for (const id of cardIds) stages[id] = typedOnly.has(id) ? "typed" : "choice";
  return {
    order: [...cardIds],
    stages,
    queue: [],
    position: 0,
    round: 0,
    roundCardIds: [],
    roundMissed: [],
    roundCorrect: 0,
  };
}

/**
 * Deal the next round: up to `size` unmastered cards (`0` = all), cards already
 * at recall first so a learner finishes what they started, then new ones.
 */
export function dealRound(state: LearnState, size: number): LearnState {
  const open = state.order.filter((id) => state.stages[id] !== "mastered");
  const recall = open.filter((id) => state.stages[id] === "typed");
  const recognize = open.filter((id) => state.stages[id] === "choice");
  const ordered = [...recall, ...recognize];
  const picked = size > 0 ? ordered.slice(0, size) : ordered;
  return {
    ...state,
    queue: picked.map((cardId) => ({
      cardId,
      stage: state.stages[cardId] === "typed" ? "typed" : "choice",
    })),
    position: 0,
    round: state.round + 1,
    roundCardIds: picked,
    roundMissed: [],
    roundCorrect: 0,
  };
}

/** The question on screen, or null between rounds. */
export function currentLearnItem(state: LearnState): LearnItem | null {
  return state.queue[state.position] ?? null;
}

/**
 * Step past the current question.
 * - choice right → promoted to recall (asked typed next round)
 * - choice wrong → asked again as choice later in this round
 * - typed right  → mastered
 * - typed wrong  → back to choice, asked again later in this round
 * A card is asked at most LEARN_MAX_ASKS_PER_ROUND times per round.
 */
export function answerLearn(state: LearnState, correct: boolean): LearnState {
  const item = currentLearnItem(state);
  if (!item) return state;
  const stages = { ...state.stages };
  const queue = [...state.queue];
  let roundMissed = state.roundMissed;

  if (correct) {
    stages[item.cardId] = item.stage === "choice" ? "typed" : "mastered";
  } else {
    stages[item.cardId] = "choice";
    const asked = queue.filter((q) => q.cardId === item.cardId).length;
    if (asked < LEARN_MAX_ASKS_PER_ROUND) {
      const insertAt = Math.min(state.position + 1 + LEARN_MISS_OFFSET, queue.length);
      queue.splice(insertAt, 0, { cardId: item.cardId, stage: "choice" });
    }
    if (!roundMissed.includes(item.cardId)) {
      roundMissed = [...roundMissed, item.cardId];
    }
  }
  return {
    ...state,
    stages,
    queue,
    position: state.position + 1,
    roundMissed,
    roundCorrect: state.roundCorrect + (correct ? 1 : 0),
  };
}

/**
 * Apply a typed answer's meaning verdict that landed AFTER the learner moved
 * on. The learner never waits on the check: Continue steps the machine with a
 * provisional grade (the spelling match), and this reconciles it when the
 * verdict returns. A late "right" masters the card and drops its unasked
 * re-ask; a late "wrong" sends it back to multiple choice for a LATER round.
 * Round counts change only while that round is still the current one.
 */
export function settleTypedVerdict(
  state: LearnState,
  verdict: { cardId: string; round: number; provisionalCorrect: boolean; correct: boolean },
): LearnState {
  const { cardId, round, provisionalCorrect, correct } = verdict;
  if (provisionalCorrect === correct || !(cardId in state.stages)) return state;
  const sameRound = state.round === round;
  const stages = { ...state.stages };
  if (correct) {
    stages[cardId] = "mastered";
    const queue = state.queue.filter((q, i) => i < state.position || q.cardId !== cardId);
    return {
      ...state,
      stages,
      queue,
      roundMissed: sameRound ? state.roundMissed.filter((id) => id !== cardId) : state.roundMissed,
      roundCorrect: sameRound ? state.roundCorrect + 1 : state.roundCorrect,
    };
  }
  if (stages[cardId] === "mastered") stages[cardId] = "choice";
  return {
    ...state,
    stages,
    roundMissed:
      sameRound && !state.roundMissed.includes(cardId)
        ? [...state.roundMissed, cardId]
        : state.roundMissed,
    roundCorrect: sameRound ? Math.max(0, state.roundCorrect - 1) : state.roundCorrect,
  };
}

/** True when every question in the round has been answered. */
export function isRoundOver(state: LearnState): boolean {
  return state.round > 0 && state.position >= state.queue.length;
}

export function isAllMastered(state: LearnState): boolean {
  return (
    state.order.length > 0 &&
    state.order.every((id) => state.stages[id] === "mastered")
  );
}

/** Cards per stage, for the between-rounds progress view. */
export function learnCounts(state: LearnState): Record<LearnStage, number> {
  const counts: Record<LearnStage, number> = { choice: 0, typed: 0, mastered: 0 };
  for (const id of state.order) counts[state.stages[id]] += 1;
  return counts;
}
