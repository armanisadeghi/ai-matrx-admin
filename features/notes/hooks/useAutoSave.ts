// features/notes/hooks/useAutoSave.ts
"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { updateNote } from '../service/notesService';
import type { UpdateNoteInput } from '../types';

interface UseAutoSaveOptions {
    noteId: string | null;
    /** The current updated_at from the server for optimistic locking */
    currentUpdatedAt?: string | null;
    debounceMs?: number;
    onSaveSuccess?: () => void;
    onSaveError?: (error: Error) => void;
    onConflict?: () => void;
}

/**
 * Hook to handle auto-save with debouncing and dirty state tracking
 */
export function useAutoSave({
    noteId,
    currentUpdatedAt,
    debounceMs = 1000,
    onSaveSuccess,
    onSaveError,
    onConflict,
}: UseAutoSaveOptions) {
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingUpdatesRef = useRef<UpdateNoteInput>({});
    // Keep a stable ref to the current updated_at to use in async callbacks.
    // This is set to the incoming server value when the editor is clean, and is
    // updated after each successful save so the next save uses the latest timestamp.
    const currentUpdatedAtRef = useRef<string | null | undefined>(currentUpdatedAt);
    // Use a ref for isDirty so the sync effect below can read it synchronously
    const isDirtyRef = useRef(false);

    useEffect(() => {
        isDirtyRef.current = isDirty;
    }, [isDirty]);

    // Sync ref when currentUpdatedAt changes — but only when the editor is clean.
    // While the user has unsaved edits we must keep the pre-edit timestamp so the
    // optimistic lock check on save uses the correct baseline.
    useEffect(() => {
        if (!isDirtyRef.current) {
            currentUpdatedAtRef.current = currentUpdatedAt;
        }
    }, [currentUpdatedAt]);

    /**
     * Mark the note as dirty (has unsaved changes)
     */
    const markDirty = useCallback(() => {
        setIsDirty(true);
    }, []);

    /**
     * Queue an update to be saved
     */
    const queueUpdate = useCallback((updates: UpdateNoteInput) => {
        // Merge updates
        pendingUpdatesRef.current = {
            ...pendingUpdatesRef.current,
            ...updates,
        };
        markDirty();
    }, [markDirty]);

    /**
     * Actually save the updates
     */
    const saveNow = useCallback(async () => {
        if (!noteId || Object.keys(pendingUpdatesRef.current).length === 0) {
            return;
        }

        const updatesSnapshot = { ...pendingUpdatesRef.current };
        // Capture the expected timestamp for optimistic locking at the moment of save
        const expectedAt = currentUpdatedAtRef.current ?? undefined;

        try {
            setIsSaving(true);
            const saved = await updateNote(noteId, updatesSnapshot, expectedAt);
            // Advance the lock baseline to the timestamp returned by the server,
            // so the next save doesn't re-use the pre-edit timestamp.
            if (saved?.updated_at) {
                currentUpdatedAtRef.current = saved.updated_at;
            }
            pendingUpdatesRef.current = {};
            setIsDirty(false);
            setLastSaved(new Date());
            onSaveSuccess?.();
        } catch (error) {
            const err = error as Error;
            if (err.message?.startsWith('CONFLICT:')) {
                // Another session modified this note — surface the conflict
                console.warn('Note save conflict detected for', noteId);
                onConflict?.();
            } else {
                console.error('Error saving note:', err);
                onSaveError?.(err);
            }
        } finally {
            setIsSaving(false);
        }
    }, [noteId, onSaveSuccess, onSaveError, onConflict]);

    /**
     * Schedule a save with debouncing
     */
    const scheduleSave = useCallback(() => {
        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Schedule new save
        saveTimeoutRef.current = setTimeout(() => {
            saveNow();
        }, debounceMs);
    }, [saveNow, debounceMs]);

    /**
     * Update the note with auto-save
     */
    const updateWithAutoSave = useCallback((updates: UpdateNoteInput) => {
        queueUpdate(updates);
        scheduleSave();
    }, [queueUpdate, scheduleSave]);

    /**
     * Force immediate save (useful for blur events, etc.)
     */
    const forceSave = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
        saveNow();
    }, [saveNow]);

    // Save immediately when noteId changes (tab switch) if there are pending updates
    useEffect(() => {
        return () => {
            // On cleanup (note changing or unmounting), save pending updates immediately
            const currentNoteId = noteId;
            const pendingUpdates = { ...pendingUpdatesRef.current };
            
            if (currentNoteId && Object.keys(pendingUpdates).length > 0) {
                // Clear timeout to prevent duplicate save
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                    saveTimeoutRef.current = null;
                }
                
                // Synchronous save - we don't await but trigger it immediately
                updateNote(currentNoteId, pendingUpdates).catch(err => {
                    console.error('Error saving note on unmount/switch:', err);
                });
                
                // Clear pending updates
                pendingUpdatesRef.current = {};
            }
        };
    }, [noteId]); // Runs when noteId changes

    return {
        isDirty,
        isSaving,
        lastSaved,
        updateWithAutoSave,
        forceSave,
        markDirty,
    };
}


