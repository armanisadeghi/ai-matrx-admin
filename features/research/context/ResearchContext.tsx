'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useResearchApi } from '../hooks/useResearchApi';
import * as service from '../service';
import type { ResearchTopic, ResearchProgress } from '../types';

interface TopicContextValue {
    topicId: string;
    topic: ResearchTopic | null;
    progress: ResearchProgress | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

const TopicContext = createContext<TopicContextValue | null>(null);

interface TopicProviderProps {
    topicId: string;
    children: ReactNode;
}

export function TopicProvider({ topicId, children }: TopicProviderProps) {
    const api = useResearchApi();
    const apiRef = useRef(api);
    apiRef.current = api;

    const [topic, setTopic] = useState<ResearchTopic | null>(null);
    const [progress, setProgress] = useState<ResearchProgress | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            setError(null);

            const topicData = await service.getTopic(topicId);
            setTopic(topicData);

            if (topicData) {
                try {
                    const response = await apiRef.current.getTopicState(topicId);
                    const stateData = await response.json();
                    if (stateData?.progress) {
                        setProgress(stateData.progress);
                    }
                } catch {
                    // Progress from Python is optional; topic data from Supabase is primary
                }
            }
        } catch (err) {
            const msg = (err as Error).message ?? '';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, [topicId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return (
        <TopicContext.Provider value={{
            topicId,
            topic,
            progress,
            isLoading,
            error,
            refresh,
        }}>
            {children}
        </TopicContext.Provider>
    );
}

export function useTopicContext() {
    const ctx = useContext(TopicContext);
    if (!ctx) {
        throw new Error('useTopicContext must be used within a TopicProvider');
    }
    return ctx;
}

/** @deprecated Use TopicProvider and useTopicContext instead */
export const ResearchProvider = TopicProvider;
/** @deprecated Use useTopicContext instead */
export const useResearchContext = useTopicContext;
