'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useResearchApi } from '../hooks/useResearchApi';
import type { ResearchState, ResearchConfig, ResearchProgress } from '../types';

interface ResearchContextValue {
    projectId: string;
    state: ResearchState | null;
    config: ResearchConfig | null;
    progress: ResearchProgress | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

const ResearchContext = createContext<ResearchContextValue | null>(null);

interface ResearchProviderProps {
    projectId: string;
    children: ReactNode;
}

export function ResearchProvider({ projectId, children }: ResearchProviderProps) {
    const api = useResearchApi();
    const [state, setState] = useState<ResearchState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            setError(null);
            const response = await api.getResearchState(projectId);
            const data = await response.json();
            setState(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [api, projectId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return (
        <ResearchContext.Provider value={{
            projectId,
            state,
            config: state?.config ?? null,
            progress: state?.progress ?? null,
            isLoading,
            error,
            refresh,
        }}>
            {children}
        </ResearchContext.Provider>
    );
}

export function useResearchContext() {
    const ctx = useContext(ResearchContext);
    if (!ctx) {
        throw new Error('useResearchContext must be used within a ResearchProvider');
    }
    return ctx;
}
