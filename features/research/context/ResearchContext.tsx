'use client';

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useStore } from 'zustand';
import * as service from '../service';
import { createTopicStore, type TopicStore, type TopicStoreInitialData } from '../state/topicStore';
import type { ResearchTopic, ResearchProgress } from '../types';
import type { StreamEvent } from '@/types/python-generated/stream-events';

type TopicStoreInstance = ReturnType<typeof createTopicStore>;

const TopicStoreContext = createContext<TopicStoreInstance | null>(null);

function useTopicStore<T>(selector: (state: TopicStore) => T): T {
    const store = useContext(TopicStoreContext);
    if (!store) throw new Error('useTopicStore must be used within a TopicProvider');
    return useStore(store, selector);
}

// ============================================================================
// Selector hooks — components subscribe to exactly what they need
// ============================================================================

export function useTopicId(): string {
    return useTopicStore((s) => s.topicId);
}

export function useTopicData(): { topic: ResearchTopic | null; isLoading: boolean; error: string | null } {
    return useTopicStore((s) => ({ topic: s.topic, isLoading: s.isLoading, error: s.error }));
}

export function useTopicProgress(): ResearchProgress | null {
    return useTopicStore((s) => s.progress);
}

// ============================================================================
// Stream Debug — selector hooks
// ============================================================================

export interface StreamDebugBus {
    events: StreamEvent[];
    activeStreamName: string | null;
    pushEvents: (events: StreamEvent[], streamName: string) => void;
    clearEvents: () => void;
}

export function useStreamDebug(): StreamDebugBus {
    const events = useTopicStore((s) => s.debugEvents);
    const activeStreamName = useTopicStore((s) => s.activeStreamName);
    const pushEvents = useTopicStore((s) => s.pushDebugEvents);
    const clearEvents = useTopicStore((s) => s.clearDebugEvents);
    return { events, activeStreamName, pushEvents, clearEvents };
}

// ============================================================================
// Refresh function — needs access to the store and the API hook
// ============================================================================

const RefreshContext = createContext<(() => Promise<void>) | null>(null);

function useRefresh(): () => Promise<void> {
    const ctx = useContext(RefreshContext);
    if (!ctx) throw new Error('useRefresh must be used within a TopicProvider');
    return ctx;
}

// ============================================================================
// Backward-compatible hook — returns the same shape as the old Context
// ============================================================================

interface TopicContextValue {
    topicId: string;
    topic: ResearchTopic | null;
    progress: ResearchProgress | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useTopicContext(): TopicContextValue {
    const topicId = useTopicStore((s) => s.topicId);
    const topic = useTopicStore((s) => s.topic);
    const progress = useTopicStore((s) => s.progress);
    const isLoading = useTopicStore((s) => s.isLoading);
    const error = useTopicStore((s) => s.error);
    const refresh = useRefresh();
    return { topicId, topic, progress, isLoading, error, refresh };
}

// ============================================================================
// Provider — thin wrapper that initializes the store and triggers the fetch
// ============================================================================

interface TopicProviderProps {
    topicId: string;
    initialData?: TopicStoreInitialData;
    children: ReactNode;
}

export function TopicProvider({ topicId, initialData, children }: TopicProviderProps) {
    const storeRef = useRef<TopicStoreInstance | null>(null);
    if (!storeRef.current) {
        storeRef.current = createTopicStore(topicId, initialData);
    }
    const store = storeRef.current;

    const refreshRef = useRef(async () => {
        const s = store.getState();
        const hadInitialData = s.topic != null;
        try {
            if (!hadInitialData) s.setError(null);
            const topicData = await service.getTopic(s.topicId);
            s.setTopic(topicData);

            const overview = await service.getTopicOverview(s.topicId);
            if (overview) {
                s.setProgress(overview);
            }
        } catch (err) {
            if (!hadInitialData) {
                s.setError((err as Error).message ?? '');
            }
        } finally {
            s.setIsLoading(false);
        }
    });

    useEffect(() => {
        refreshRef.current();
    }, [topicId]);

    return (
        <TopicStoreContext.Provider value={store}>
            <RefreshContext.Provider value={refreshRef.current}>
                {children}
            </RefreshContext.Provider>
        </TopicStoreContext.Provider>
    );
}

/** @deprecated Use TopicProvider and useTopicContext instead */
export const ResearchProvider = TopicProvider;
/** @deprecated Use useTopicContext instead */
export const useResearchContext = useTopicContext;
