// features/notes/hooks/useNotes.ts

import { useCallback, useEffect, useState } from 'react';
import { fetchNotes } from '../service/notesService';
import type { Note } from '../types';

/**
 * Hook to fetch and manage all notes
 */
export function useNotes() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const loadNotes = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await fetchNotes();
            setNotes(data);
        } catch (err) {
            setError(err as Error);
            console.error('Error loading notes:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadNotes();
    }, [loadNotes]);

    const refreshNotes = useCallback(() => {
        loadNotes();
    }, [loadNotes]);

    return {
        notes,
        isLoading,
        error,
        refreshNotes,
        setNotes, // For optimistic updates
    };
}

