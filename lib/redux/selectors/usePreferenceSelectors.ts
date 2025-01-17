import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/lib/redux/store';

// Base selector
export const selectUserPreferences = (state: RootState) => state.userPreferences;

// Module selectors
export const selectPlaygroundPreferences = createSelector(
  selectUserPreferences,
  (state) => state.playground
);

export const selectDisplayPreferences = createSelector(
  selectUserPreferences,
  (state) => state.display
);

export const selectVoicePreferences = createSelector(
  selectUserPreferences,
  (state) => state.voice
);

export const selectAssistantPreferences = createSelector(
  selectUserPreferences,
  (state) => state.assistant
);

export const selectEmailPreferences = createSelector(
  selectUserPreferences,
  (state) => state.email
);

export const selectVideoConferencePreferences = createSelector(
  selectUserPreferences,
  (state) => state.videoConference
);

export const selectPhotoEditingPreferences = createSelector(
  selectUserPreferences,
  (state) => state.photoEditing
);

export const selectImageGenerationPreferences = createSelector(
  selectUserPreferences,
  (state) => state.imageGeneration
);

export const selectTextGenerationPreferences = createSelector(
  selectUserPreferences,
  (state) => state.textGeneration
);

export const selectCodingPreferences = createSelector(
  selectUserPreferences,
  (state) => state.coding
);

export const selectFlashcardPreferences = createSelector(
  selectUserPreferences,
  (state) => state.flashcard
);