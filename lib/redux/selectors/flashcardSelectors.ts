// selectors/flashcardSelectors.ts

import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store.types";

const selectFlashcardsRecord = (state: RootState) =>
  state.flashcardChat.flashcards;

/** Memoized — stable array reference when the flashcards record is unchanged. */
const selectAllFlashcards = createSelector([selectFlashcardsRecord], (record) =>
  Object.values(record),
);

const selectCurrentIndex = (state: RootState) =>
  state.flashcardChat.currentIndex;

const selectActiveFlashcard = createSelector(
  [selectAllFlashcards, selectCurrentIndex],
  (flashcards, currentIndex) => {
    if (currentIndex >= 0 && currentIndex < flashcards.length) {
      return flashcards[currentIndex];
    }
    return null;
  },
);

// Select all flashcard data (without chat history)
const selectAllFlashcardData = createSelector(
  [selectAllFlashcards],
  (flashcards) => flashcards.map(({ chat, ...rest }) => rest),
);

// Select chat history for the active flashcard
const selectActiveFlashcardChat = createSelector(
  [selectActiveFlashcard],
  (activeFlashcard) => (activeFlashcard ? activeFlashcard.chat : []),
);

// Select total correct and incorrect counts
const selectPerformanceCounts = createSelector(
  [selectAllFlashcards],
  (flashcards) => ({
    totalCorrect: flashcards.reduce((sum, card) => sum + card.correctCount, 0),
    totalIncorrect: flashcards.reduce(
      (sum, card) => sum + card.incorrectCount,
      0,
    ),
    totalCount: flashcards.length,
  }),
);

// Select a specific flashcard by ID
const selectFlashcardById = (id: string) => (state: RootState) =>
  state.flashcardChat.flashcards[id] || null;

export {
  selectAllFlashcards,
  selectCurrentIndex,
  selectActiveFlashcard,
  selectAllFlashcardData,
  selectActiveFlashcardChat,
  selectPerformanceCounts,
  selectFlashcardById,
};
