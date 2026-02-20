'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useResearchApi } from '../hooks/useResearchApi';
import * as service from '../service';
import type { ResearchTopic, ResearchProgress } from '../types';
import type { StreamEvent } from '@/types/python-generated/stream-events';

// ============================================================================
// Stream Debug Bus
// Context-level raw event bus so StreamDebugOverlay can receive events from
// any stream running anywhere in the research feature tree.
// ============================================================================

interface StreamDebugBus {
    events: StreamEvent[];
    activeStreamName: string | null;
    pushEvents: (events: StreamEvent[], streamName: string) => void;
    clearEvents: () => void;
}

const StreamDebugContext = createContext<StreamDebugBus | null>(null);

export function useStreamDebug(): StreamDebugBus {
    const ctx = useContext(StreamDebugContext);
    if (!ctx) throw new Error('useStreamDebug must be used within a TopicProvider');
    return ctx;
}

// ============================================================================
// Topic Context
// ============================================================================

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

    // Stream debug bus state
    const [debugEvents, setDebugEvents] = useState<StreamEvent[]>([]);
    const [activeStreamName, setActiveStreamName] = useState<string | null>(null);

    const pushEvents = useCallback((events: StreamEvent[], streamName: string) => {
        setActiveStreamName(streamName);
        setDebugEvents(prev => [...prev, ...events]);
    }, []);

    const clearEvents = useCallback(() => {
        setDebugEvents([]);
        setActiveStreamName(null);
    }, []);

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
        <StreamDebugContext.Provider value={{ events: debugEvents, activeStreamName, pushEvents, clearEvents }}>
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
        </StreamDebugContext.Provider>
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
