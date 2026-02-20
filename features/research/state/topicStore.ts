import { createStore } from 'zustand';
import type { ResearchTopic, ResearchProgress } from '../types';
import type { StreamEvent } from '@/types/python-generated/stream-events';

export interface TopicStoreState {
    topicId: string;
    topic: ResearchTopic | null;
    progress: ResearchProgress | null;
    isLoading: boolean;
    error: string | null;

    debugEvents: StreamEvent[];
    activeStreamName: string | null;
}

export interface TopicStoreActions {
    setTopic: (topic: ResearchTopic | null) => void;
    setProgress: (progress: ResearchProgress | null) => void;
    setIsLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    pushDebugEvents: (events: StreamEvent[], streamName: string) => void;
    clearDebugEvents: () => void;
}

export type TopicStore = TopicStoreState & TopicStoreActions;

export function createTopicStore(topicId: string) {
    return createStore<TopicStore>()((set) => ({
        topicId,
        topic: null,
        progress: null,
        isLoading: true,
        error: null,
        debugEvents: [],
        activeStreamName: null,

        setTopic: (topic) => set({ topic }),
        setProgress: (progress) => set({ progress }),
        setIsLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        pushDebugEvents: (events, streamName) =>
            set((state) => ({
                debugEvents: [...state.debugEvents, ...events],
                activeStreamName: streamName,
            })),
        clearDebugEvents: () =>
            set({ debugEvents: [], activeStreamName: null }),
    }));
}
