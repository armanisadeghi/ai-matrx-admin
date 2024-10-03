// selectors/flashcardSelectors.ts

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@/lib/redux/store';


export const selectAllFlashcards = (state: RootState) => Object.values(state.flashcardChat.flashcards);
export const selectCurrentIndex = (state: RootState) => state.flashcardChat.currentIndex;

export const selectActiveFlashcard = createSelector(
    [selectAllFlashcards, selectCurrentIndex],
    (flashcards, currentIndex) => {
        if (currentIndex >= 0 && currentIndex < flashcards.length) {
            return flashcards[currentIndex];
        }
        return null;
    }
);

// Select all flashcard data (without chat history)
export const selectAllFlashcardData = createSelector(
    [selectAllFlashcards],
    (flashcards) => flashcards.map(({ chat, ...rest }) => rest)
);

// Select chat history for the active flashcard
export const selectActiveFlashcardChat = createSelector(
    [selectActiveFlashcard],
    (activeFlashcard) => activeFlashcard ? activeFlashcard.chat : []
);

// Select total correct and incorrect counts
export const selectPerformanceCounts = createSelector(
    [selectAllFlashcards],
    (flashcards) => ({
        totalCorrect: flashcards.reduce((sum, card) => sum + card.correctCount, 0),
        totalIncorrect: flashcards.reduce((sum, card) => sum + card.incorrectCount, 0),
        totalCount: flashcards.length, // Added total count of flashcards
    })
);

// Select a specific flashcard by ID
export const selectFlashcardById = (id: string) =>
    (state: RootState) => state.flashcardChat.flashcards[id] || null;