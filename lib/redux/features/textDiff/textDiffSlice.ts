// lib/redux/features/textDiff/textDiffSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/lib/redux/store';
import type {
    TextDiffState,
    DiffSession,
    ParsedDiff,
    DiffStatus,
} from './types';

const initialState: TextDiffState = {
    sessions: {},
};

const textDiffSlice = createSlice({
    name: 'textDiff',
    initialState,
    reducers: {
        // Initialize a session for a note
        initializeSession: (
            state,
            action: PayloadAction<{ noteId: string; content: string }>
        ) => {
            const { noteId, content } = action.payload;
            state.sessions[noteId] = {
                noteId,
                isDirty: false,
                pendingDiffs: {},
                allDiffIds: [],
                acceptedDiffIds: [],
                rejectedDiffIds: [],
                originalContent: content,
                currentContent: content,
                lastProcessedAt: null,
            };
        },

        // Add diffs to a session
        addDiffs: (
            state,
            action: PayloadAction<{ noteId: string; diffs: ParsedDiff[] }>
        ) => {
            const { noteId, diffs } = action.payload;
            const session = state.sessions[noteId];

            if (!session) return;

            diffs.forEach((diff) => {
                session.pendingDiffs[diff.id] = diff;
                if (!session.allDiffIds.includes(diff.id)) {
                    session.allDiffIds.push(diff.id);
                }
            });

            session.lastProcessedAt = new Date().toISOString();
        },

        // Update a single diff
        updateDiff: (
            state,
            action: PayloadAction<{
                noteId: string;
                diffId: string;
                updates: Partial<ParsedDiff>;
            }>
        ) => {
            const { noteId, diffId, updates } = action.payload;
            const session = state.sessions[noteId];

            if (!session || !session.pendingDiffs[diffId]) return;

            session.pendingDiffs[diffId] = {
                ...session.pendingDiffs[diffId],
                ...updates,
            };
        },

        // Accept a single diff
        acceptDiff: (
            state,
            action: PayloadAction<{ noteId: string; diffId: string }>
        ) => {
            const { noteId, diffId } = action.payload;
            const session = state.sessions[noteId];

            if (!session) return;

            const diff = session.pendingDiffs[diffId];
            if (!diff) return;

            diff.status = 'accepted';

            if (!session.acceptedDiffIds.includes(diffId)) {
                session.acceptedDiffIds.push(diffId);
            }

            // Remove from rejected if it was there
            session.rejectedDiffIds = session.rejectedDiffIds.filter(
                (id) => id !== diffId
            );

            session.isDirty = true;
        },

        // Reject a single diff
        rejectDiff: (
            state,
            action: PayloadAction<{ noteId: string; diffId: string }>
        ) => {
            const { noteId, diffId } = action.payload;
            const session = state.sessions[noteId];

            if (!session) return;

            const diff = session.pendingDiffs[diffId];
            if (!diff) return;

            diff.status = 'rejected';

            if (!session.rejectedDiffIds.includes(diffId)) {
                session.rejectedDiffIds.push(diffId);
            }

            // Remove from accepted if it was there
            session.acceptedDiffIds = session.acceptedDiffIds.filter(
                (id) => id !== diffId
            );
        },

        // Accept all diffs
        acceptAllDiffs: (
            state,
            action: PayloadAction<{ noteId: string }>
        ) => {
            const { noteId } = action.payload;
            const session = state.sessions[noteId];

            if (!session) return;

            session.allDiffIds.forEach((diffId) => {
                const diff = session.pendingDiffs[diffId];
                if (diff && diff.status === 'pending') {
                    diff.status = 'accepted';
                    if (!session.acceptedDiffIds.includes(diffId)) {
                        session.acceptedDiffIds.push(diffId);
                    }
                }
            });

            session.rejectedDiffIds = [];
            session.isDirty = true;
        },

        // Reject all diffs
        rejectAllDiffs: (
            state,
            action: PayloadAction<{ noteId: string }>
        ) => {
            const { noteId } = action.payload;
            const session = state.sessions[noteId];

            if (!session) return;

            session.allDiffIds.forEach((diffId) => {
                const diff = session.pendingDiffs[diffId];
                if (diff && diff.status === 'pending') {
                    diff.status = 'rejected';
                    if (!session.rejectedDiffIds.includes(diffId)) {
                        session.rejectedDiffIds.push(diffId);
                    }
                }
            });

            session.acceptedDiffIds = [];
        },

        // Update current content (after applying diffs)
        updateCurrentContent: (
            state,
            action: PayloadAction<{ noteId: string; content: string }>
        ) => {
            const { noteId, content } = action.payload;
            const session = state.sessions[noteId];

            if (!session) return;

            session.currentContent = content;
        },

        // Mark session as saved (clears isDirty)
        markSaved: (state, action: PayloadAction<{ noteId: string }>) => {
            const { noteId } = action.payload;
            const session = state.sessions[noteId];

            if (!session) return;

            session.isDirty = false;
            session.originalContent = session.currentContent;
        },

        // Clear all diffs (after save or discard)
        clearDiffs: (state, action: PayloadAction<{ noteId: string }>) => {
            const { noteId } = action.payload;
            const session = state.sessions[noteId];

            if (!session) return;

            session.pendingDiffs = {};
            session.allDiffIds = [];
            session.acceptedDiffIds = [];
            session.rejectedDiffIds = [];
            session.lastProcessedAt = null;
        },

        // Reset session to original content
        resetSession: (state, action: PayloadAction<{ noteId: string }>) => {
            const { noteId } = action.payload;
            const session = state.sessions[noteId];

            if (!session) return;

            session.currentContent = session.originalContent;
            session.isDirty = false;
            session.pendingDiffs = {};
            session.allDiffIds = [];
            session.acceptedDiffIds = [];
            session.rejectedDiffIds = [];
            session.lastProcessedAt = null;
        },

        // Remove a session
        removeSession: (state, action: PayloadAction<{ noteId: string }>) => {
            const { noteId } = action.payload;
            delete state.sessions[noteId];
        },
    },
});

export const {
    initializeSession,
    addDiffs,
    updateDiff,
    acceptDiff,
    rejectDiff,
    acceptAllDiffs,
    rejectAllDiffs,
    updateCurrentContent,
    markSaved,
    clearDiffs,
    resetSession,
    removeSession,
} = textDiffSlice.actions;

// Selectors
export const selectSession = (state: RootState, noteId: string): DiffSession | undefined =>
    state.textDiff.sessions[noteId];

export const selectIsDirty = (state: RootState, noteId: string): boolean =>
    state.textDiff.sessions[noteId]?.isDirty ?? false;

export const selectPendingDiffs = (state: RootState, noteId: string): ParsedDiff[] => {
    const session = state.textDiff.sessions[noteId];
    if (!session) return [];

    return session.allDiffIds.map((id) => session.pendingDiffs[id]).filter(Boolean);
};

export const selectAcceptedDiffs = (state: RootState, noteId: string): ParsedDiff[] => {
    const session = state.textDiff.sessions[noteId];
    if (!session) return [];

    return session.acceptedDiffIds.map((id) => session.pendingDiffs[id]).filter(Boolean);
};

export const selectRejectedDiffs = (state: RootState, noteId: string): ParsedDiff[] => {
    const session = state.textDiff.sessions[noteId];
    if (!session) return [];

    return session.rejectedDiffIds.map((id) => session.pendingDiffs[id]).filter(Boolean);
};

export const selectDiffById = (
    state: RootState,
    noteId: string,
    diffId: string
): ParsedDiff | undefined => state.textDiff.sessions[noteId]?.pendingDiffs[diffId];

export const selectCurrentContent = (state: RootState, noteId: string): string =>
    state.textDiff.sessions[noteId]?.currentContent ?? '';

export const selectOriginalContent = (state: RootState, noteId: string): string =>
    state.textDiff.sessions[noteId]?.originalContent ?? '';

export const selectHasPendingDiffs = (state: RootState, noteId: string): boolean => {
    const session = state.textDiff.sessions[noteId];
    if (!session) return false;

    return session.allDiffIds.some(
        (id) => session.pendingDiffs[id]?.status === 'pending'
    );
};

export default textDiffSlice.reducer;
