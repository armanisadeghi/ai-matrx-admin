/**
 * features/transcript-studio/redux/selectors.ts
 *
 * Memoized selectors for the transcript studio.
 */

import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type { StudioSession } from "../types";

const selectScope = (state: RootState) => state.transcriptStudio;

export const selectFetchStatus = (state: RootState) =>
  state.transcriptStudio.fetchStatus;

export const selectFetchError = (state: RootState) =>
  state.transcriptStudio.fetchError;

export const selectActiveSessionId = (state: RootState) =>
  state.transcriptStudio.activeSessionId;

export const selectSessionsById = (state: RootState) =>
  state.transcriptStudio.byId;

export const selectAllSessions = createSelector(
  selectSessionsById,
  (byId): StudioSession[] =>
    Object.values(byId).sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
);

export const selectSessionById = (id: string | null) =>
  createSelector(selectSessionsById, (byId) =>
    id ? (byId[id] ?? null) : null,
  );

export const selectActiveSession = createSelector(
  [selectSessionsById, selectActiveSessionId],
  (byId, activeId) => (activeId ? (byId[activeId] ?? null) : null),
);

export const selectSessionUi = (id: string | null) => (state: RootState) =>
  id ? (state.transcriptStudio.ui[id] ?? null) : null;

export const selectActiveSessionUi = (state: RootState) => {
  const id = state.transcriptStudio.activeSessionId;
  return id ? (state.transcriptStudio.ui[id] ?? null) : null;
};

export const selectCursorTime = (sessionId: string | null) =>
  (state: RootState): number => {
    if (!sessionId) return 0;
    return state.transcriptStudio.ui[sessionId]?.cursorTime ?? 0;
  };

export const selectLeaderColumn = (sessionId: string | null) =>
  (state: RootState) => {
    if (!sessionId) return null;
    return state.transcriptStudio.ui[sessionId]?.leaderColumn ?? null;
  };

void selectScope; // reserved — fuller scope-getter once we add per-column buffers
