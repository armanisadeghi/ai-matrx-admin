// features/notes/hooks/useTextDiff.ts

'use client';

import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import {
    initializeSession,
    addDiffs,
    acceptDiff,
    rejectDiff,
    acceptAllDiffs,
    updateDiff,
    updateCurrentContent,
    markSaved,
    clearDiffs,
    resetSession,
    selectSession,
    selectIsDirty,
    selectPendingDiffs,
    selectAcceptedDiffs,
    selectCurrentContent,
} from '@/lib/redux/features/textDiff';
import {
    parseAIResponse,
    validateDiff,
    processDiffsMatchInfo,
    applyMultipleDiffs,
} from '@/lib/redux/features/textDiff';
import type { ParsedDiff } from '@/lib/redux/features/textDiff';
import { useNotes } from '@/features/notes/context/NotesContext';

interface UseTextDiffOptions {
    noteId: string;
    content: string;
    onContentChange?: (content: string) => void;
}

export function useTextDiff({ noteId, content, onContentChange }: UseTextDiffOptions) {
    const dispatch = useAppDispatch();
    const { updateNote } = useNotes();

    const session = useAppSelector((state) => selectSession(state, noteId));
    const isDirty = useAppSelector((state) => selectIsDirty(state, noteId));
    const pendingDiffs = useAppSelector((state) => selectPendingDiffs(state, noteId));
    const acceptedDiffs = useAppSelector((state) => selectAcceptedDiffs(state, noteId));
    const currentContent = useAppSelector((state) => selectCurrentContent(state, noteId));

    // Initialize session when noteId or content changes
    useEffect(() => {
        if (!session) {
            dispatch(initializeSession({ noteId, content }));
        }
    }, [noteId, content, session, dispatch]);

    /**
     * Parse AI response and add diffs to the session
     */
    const processAIResponse = useCallback(
        (aiResponse: string) => {
            try {
                // Parse the AI response to extract diffs
                const diffs = parseAIResponse(aiResponse);

                if (diffs.length === 0) {
                    console.warn('No diffs found in AI response');
                    return { success: false, message: 'No diffs found in response' };
                }

                // Validate each diff
                const validDiffs: ParsedDiff[] = [];
                const invalidDiffs: Array<{ diff: ParsedDiff; error: string }> = [];

                diffs.forEach((diff) => {
                    const validation = validateDiff(diff);
                    if (validation.valid) {
                        validDiffs.push(diff);
                    } else {
                        invalidDiffs.push({ diff, error: validation.error || 'Unknown error' });
                    }
                });

                if (validDiffs.length === 0) {
                    console.error('All diffs failed validation:', invalidDiffs);
                    return {
                        success: false,
                        message: 'All diffs failed validation',
                        invalidDiffs,
                    };
                }

                // Process match info for valid diffs
                const diffsWithMatchInfo = processDiffsMatchInfo(content, validDiffs);

                // Add diffs to Redux
                dispatch(addDiffs({ noteId, diffs: diffsWithMatchInfo }));

                return {
                    success: true,
                    message: `Processed ${validDiffs.length} diffs`,
                    validCount: validDiffs.length,
                    invalidCount: invalidDiffs.length,
                };
            } catch (error) {
                console.error('Error processing AI response:', error);
                return {
                    success: false,
                    message: 'Error parsing AI response',
                    error,
                };
            }
        },
        [noteId, content, dispatch]
    );

    /**
     * Accept a single diff and apply it
     */
    const acceptSingleDiff = useCallback(
        (diffId: string) => {
            const diff = pendingDiffs.find((d) => d.id === diffId);
            if (!diff) return;

            // Apply the diff to get new content
            const result = applyMultipleDiffs(currentContent || content, [diff]);

            if (result.success) {
                dispatch(acceptDiff({ noteId, diffId }));
                dispatch(updateCurrentContent({ noteId, content: result.newContent }));

                if (onContentChange) {
                    onContentChange(result.newContent);
                }
            } else {
                // Mark diff as error
                dispatch(
                    updateDiff({
                        noteId,
                        diffId,
                        updates: {
                            status: 'error',
                            error: result.failedDiffs[0]?.error || 'Failed to apply diff',
                        },
                    })
                );
            }
        },
        [noteId, pendingDiffs, currentContent, content, dispatch, onContentChange]
    );

    /**
     * Accept all diffs and apply them
     */
    const acceptAll = useCallback(async () => {
        const pendingOnly = pendingDiffs.filter((d) => d.status === 'pending');

        if (pendingOnly.length === 0) {
            return { success: false, message: 'No pending diffs to accept' };
        }

        // Apply all diffs
        const result = applyMultipleDiffs(currentContent || content, pendingOnly);

        if (result.success || result.appliedDiffs.length > 0) {
            // Mark all as accepted
            dispatch(acceptAllDiffs({ noteId }));
            dispatch(updateCurrentContent({ noteId, content: result.newContent }));

            if (onContentChange) {
                onContentChange(result.newContent);
            }

            // Auto-save to NotesContext
            try {
                await updateNote(noteId, {
                    content: result.newContent,
                    metadata: {
                        lastChangeType: 'ai_accept_all',
                        lastChangeMetadata: {
                            diffCount: result.appliedDiffs.length,
                            acceptedDiffs: result.appliedDiffs,
                        },
                    },
                });

                dispatch(markSaved({ noteId }));

                return {
                    success: true,
                    message: `Applied and saved ${result.appliedDiffs.length} diffs`,
                    failedCount: result.failedDiffs.length,
                };
            } catch (error) {
                console.error('Failed to save after accepting all:', error);
                return {
                    success: false,
                    message: 'Diffs applied but save failed',
                    error,
                };
            }
        } else {
            return {
                success: false,
                message: 'Failed to apply diffs',
                failedDiffs: result.failedDiffs,
            };
        }
    }, [noteId, pendingDiffs, currentContent, content, dispatch, onContentChange, updateNote]);

    /**
     * Save current changes manually
     */
    const saveChanges = useCallback(async () => {
        if (!isDirty) {
            return { success: true, message: 'No changes to save' };
        }

        const contentToSave = currentContent || content;

        try {
            const acceptedDiffCount = acceptedDiffs.length;

            await updateNote(noteId, {
                content: contentToSave,
                metadata: {
                    lastChangeType:
                        acceptedDiffCount > 0 ? 'ai_accept_partial' : 'manual',
                    lastChangeMetadata:
                        acceptedDiffCount > 0
                            ? {
                                  diffCount: acceptedDiffCount,
                                  acceptedDiffs: acceptedDiffs.map((d) => d.id),
                              }
                            : {},
                },
            });

            dispatch(markSaved({ noteId }));
            dispatch(clearDiffs({ noteId }));

            return {
                success: true,
                message: 'Changes saved successfully',
            };
        } catch (error) {
            console.error('Failed to save changes:', error);
            return {
                success: false,
                message: 'Failed to save changes',
                error,
            };
        }
    }, [noteId, isDirty, currentContent, content, acceptedDiffs, dispatch, updateNote]);

    /**
     * Discard all changes and reset to original
     */
    const discardChanges = useCallback(() => {
        dispatch(resetSession({ noteId }));
        if (onContentChange) {
            onContentChange(content);
        }
    }, [noteId, content, dispatch, onContentChange]);

    return {
        // State
        session,
        isDirty,
        pendingDiffs,
        acceptedDiffs,
        currentContent: currentContent || content,

        // Actions
        processAIResponse,
        acceptSingleDiff,
        acceptAll,
        saveChanges,
        discardChanges,
        rejectDiff: (diffId: string) => dispatch(rejectDiff({ noteId, diffId })),
    };
}
