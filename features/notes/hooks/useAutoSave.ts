// features/notes/hooks/useAutoSave.ts
"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { updateNote } from '../service/notesService';
import type { UpdateNoteInput } from '../types';

interface UseAutoSaveOptions {
    noteId: string | null;
    debounceMs?: number;
    onSaveSuccess?: () => void;
    onSaveError?: (error: Error) => void;
}

/**
 * Hook to handle auto-save with debouncing and dirty state tracking
 */
export function useAutoSave({
    noteId,
    debounceMs = 1000,
    onSaveSuccess,
    onSaveError,
}: UseAutoSaveOptions) {
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingUpdatesRef = useRef<UpdateNoteInput>({});

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

        try {
            setIsSaving(true);
            await updateNote(noteId, pendingUpdatesRef.current);
            pendingUpdatesRef.current = {};
            setIsDirty(false);
            setLastSaved(new Date());
            onSaveSuccess?.();
        } catch (error) {
            console.error('Error saving note:', error);
            onSaveError?.(error as Error);
        } finally {
            setIsSaving(false);
        }
    }, [noteId, onSaveSuccess, onSaveError]);

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

