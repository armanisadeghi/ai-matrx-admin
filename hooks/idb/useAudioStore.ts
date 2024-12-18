'use client';

import { useState, useCallback } from 'react';
import { Recording, RecordingChunk, RecordingStatus, AsyncResult } from '@/types/audioRecording.types';
import { audioStore } from '@/lib/idb/stores/audio-store';

interface StoreResult<T> {
    data?: T | null;
    error?: string | null;
}

export function useAudioStore() {
    const [loadingOps, setLoadingOps] = useState<string[]>([]);

    const withLoading = useCallback(async <T>(
        opId: string,
        operation: () => AsyncResult<T>
    ): Promise<StoreResult<T>> => {
        if (!loadingOps.includes(opId)) {
            setLoadingOps(prev => [...prev, opId]);
        }

        try {
            const result = await operation();
            return {
                data: result.data,
                error: result.error?.message
            };
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : 'Operation failed'
            };
        } finally {
            setLoadingOps(prev => prev.filter(id => id !== opId));
        }
    }, [loadingOps]);

    const isLoading = useCallback((opId?: string) => {
        return opId ? loadingOps.includes(opId) : loadingOps.length > 0;
    }, [loadingOps]);

    // Recording operations
    const createRecording = useCallback(async (data: Partial<Omit<Recording, 'id'>>) => {
        return withLoading('create', () => audioStore.createRecording(data));
    }, [withLoading]);

    const getRecording = useCallback(async (id: number) => {
        return withLoading(`get-${id}`, () => audioStore.getRecording(id));
    }, [withLoading]);

    const getAllRecordings = useCallback(async () => {
        return withLoading('getAll', () => audioStore.getAllRecordings());
    }, [withLoading]);

    const updateRecording = useCallback(async (id: number, changes: Partial<Recording>) => {
        return withLoading(`update-${id}`, () => audioStore.updateRecording(id, changes));
    }, [withLoading]);

    const deleteRecording = useCallback(async (id: number) => {
        return withLoading(`delete-${id}`, () => audioStore.deleteRecording(id));
    }, [withLoading]);

    const getRecordingsByStatus = useCallback(async (status: RecordingStatus) => {
        return withLoading(`status-${status}`, () => audioStore.getRecordingsByStatus(status));
    }, [withLoading]);

    // Chunk operations
    const saveChunk = useCallback(async (chunk: Omit<RecordingChunk, 'id'>) => {
        return withLoading(`chunk-save-${chunk.recording_id}-${chunk.chunk_index}`,
            () => audioStore.saveChunk(chunk));
    }, [withLoading]);

    const getRecordingChunks = useCallback(async (recordingId: number) => {
        return withLoading(`chunks-${recordingId}`,
            () => audioStore.getRecordingChunks(recordingId));
    }, [withLoading]);

    const getRecordingWithChunks = useCallback(async (recordingId: number) => {
        return withLoading(`recording-chunks-${recordingId}`,
            () => audioStore.getRecordingWithChunks(recordingId));
    }, [withLoading]);

    const updateRecordingStatus = useCallback(async (
        id: number,
        status: RecordingStatus,
        additionalData?: Partial<Recording>
    ) => {
        return withLoading(`status-update-${id}`,
            () => audioStore.updateRecordingStatus(id, status, additionalData));
    }, [withLoading]);

    return {
        // Loading state
        isLoading,

        // Recording operations
        createRecording,
        getRecording,
        getAllRecordings,
        updateRecording,
        deleteRecording,
        getRecordingsByStatus,

        // Chunk operations
        saveChunk,
        getRecordingChunks,
        getRecordingWithChunks,
        updateRecordingStatus
    };
}