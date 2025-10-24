// features/transcripts/context/TranscriptsContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/utils/supabase/client';
import type { Transcript, CreateTranscriptInput, UpdateTranscriptInput } from '../types';
import * as transcriptsService from '../service/transcriptsService';

interface TranscriptsContextType {
    transcripts: Transcript[];
    isLoading: boolean;
    activeTranscript: Transcript | null;
    setActiveTranscript: (transcript: Transcript | null) => void;
    createTranscript: (input: CreateTranscriptInput) => Promise<Transcript>;
    updateTranscript: (id: string, updates: UpdateTranscriptInput) => Promise<void>;
    deleteTranscript: (id: string) => Promise<void>;
    copyTranscript: (id: string) => Promise<void>;
    refreshTranscripts: () => Promise<void>;
}

const TranscriptsContext = createContext<TranscriptsContextType | undefined>(undefined);

export function TranscriptsProvider({ children }: { children: ReactNode }) {
    const [transcripts, setTranscripts] = useState<Transcript[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTranscript, setActiveTranscript] = useState<Transcript | null>(null);

    // Fetch all transcripts
    const fetchAllTranscripts = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await transcriptsService.fetchTranscripts();
            setTranscripts(data);

            // If no active transcript and we have transcripts, set the first one
            if (!activeTranscript && data.length > 0) {
                setActiveTranscript(data[0]);
            }
        } catch (error) {
            console.error('Error fetching transcripts:', error);
        } finally {
            setIsLoading(false);
        }
    }, [activeTranscript]);

    // Initial load
    useEffect(() => {
        fetchAllTranscripts();
    }, []);

    // Set up real-time subscription
    useEffect(() => {
        const channel = supabase
            .channel('transcripts-changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'transcripts' },
                () => {
                    fetchAllTranscripts();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchAllTranscripts]);

    // Create transcript
    const createTranscript = useCallback(async (input: CreateTranscriptInput): Promise<Transcript> => {
        const newTranscript = await transcriptsService.createTranscript(input);
        setTranscripts(prev => [newTranscript, ...prev]);
        setActiveTranscript(newTranscript);
        return newTranscript;
    }, []);

    // Update transcript
    const updateTranscript = useCallback(async (id: string, updates: UpdateTranscriptInput): Promise<void> => {
        const updated = await transcriptsService.updateTranscript(id, updates);
        
        setTranscripts(prev => 
            prev.map(t => t.id === id ? updated : t)
        );
        
        if (activeTranscript?.id === id) {
            setActiveTranscript(updated);
        }
    }, [activeTranscript]);

    // Delete transcript
    const deleteTranscript = useCallback(async (id: string): Promise<void> => {
        await transcriptsService.deleteTranscript(id);
        
        setTranscripts(prev => prev.filter(t => t.id !== id));
        
        if (activeTranscript?.id === id) {
            setActiveTranscript(transcripts[0] || null);
        }
    }, [activeTranscript, transcripts]);

    // Copy transcript
    const copyTranscript = useCallback(async (id: string): Promise<void> => {
        const copied = await transcriptsService.copyTranscript(id);
        setTranscripts(prev => [copied, ...prev]);
        setActiveTranscript(copied);
    }, []);

    // Refresh transcripts
    const refreshTranscripts = useCallback(async (): Promise<void> => {
        await fetchAllTranscripts();
    }, [fetchAllTranscripts]);

    const value: TranscriptsContextType = {
        transcripts,
        isLoading,
        activeTranscript,
        setActiveTranscript,
        createTranscript,
        updateTranscript,
        deleteTranscript,
        copyTranscript,
        refreshTranscripts,
    };

    return (
        <TranscriptsContext.Provider value={value}>
            {children}
        </TranscriptsContext.Provider>
    );
}

export function useTranscriptsContext() {
    const context = useContext(TranscriptsContext);
    if (!context) {
        throw new Error('useTranscriptsContext must be used within TranscriptsProvider');
    }
    return context;
}

