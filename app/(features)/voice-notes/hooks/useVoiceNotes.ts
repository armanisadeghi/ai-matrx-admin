'use client';

import {Recording, RecordingChunk} from '@/types/audioRecording.types';
import {useState, useCallback, useEffect, useRef} from 'react';
import {useReactMediaRecorder, StatusMessages} from 'react-media-recorder';
import {useAudioStore} from "@/hooks/idb/useAudioStore";

const format = require('format-duration');

interface UseVoiceNotesProps {
    video?: boolean;
    onRecordingStart?: () => void;
    onRecordingStop?: (recording: Recording) => void;
    audioConstraints?: MediaTrackConstraints;
}

interface UseVoiceNotesReturn {
    // Recording state
    isRecording: boolean;
    isPaused: boolean;
    isMuted: boolean;
    duration: number;
    formattedDuration: string;
    status: StatusMessages;
    error: string | null;
    previewStream: MediaStream | null;

    // Recording controls
    startRecording: () => Promise<void>;
    pauseRecording: () => void;
    resumeRecording: () => void;
    stopRecording: () => Promise<void>;
    muteRecording: () => void;
    unmuteRecording: () => void;

    // Data management
    recordings: Recording[];
    currentRecording: Recording | null;
    loading: boolean;

    // Playback
    play: (recordingId: number) => Promise<void>;
    pause: () => void;
    stop: () => void;
    seek: (time: number) => void;
    refreshRecordings: () => Promise<void>;
    deleteRecording: (id: number) => Promise<void>;
}

export function useVoiceNotes(
    {
        video = false,
        onRecordingStart,
        onRecordingStop,
        audioConstraints
    }: UseVoiceNotesProps = {}): UseVoiceNotesReturn {
    const audioStore = useAudioStore();

    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [currentRecording, setCurrentRecording] = useState<Recording | null>(null);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const durationInterval = useRef<number | null>(null);
    const lastChunkRef = useRef<Blob | null>(null);

    const {
        status,
        startRecording: startMediaRecording,
        stopRecording: stopMediaRecording,
        pauseRecording: pauseMediaRecording,
        resumeRecording: resumeMediaRecording,
        muteAudio: muteMediaRecording,
        unMuteAudio: unmuteMediaRecording,
        clearBlobUrl,
        mediaBlobUrl,
        isAudioMuted,
        previewStream,
    } = useReactMediaRecorder({
        audio: audioConstraints || true,
        video,
        onStart: () => {
            setError(null);
            onRecordingStart?.();
        },
        onStop: async (blobUrl, blob) => {
            lastChunkRef.current = blob;
            if (currentRecording?.id) {
                await handleDataAvailable(blob);
                onRecordingStop?.(currentRecording);
            }
        },
        mediaRecorderOptions: {
            audioBitsPerSecond: 128000,
            mimeType: 'audio/webm;codecs=opus'
        }
    });

    const handleDataAvailable = async (blob: Blob) => {
        if (!currentRecording?.id) return;

        const chunk: Omit<RecordingChunk, 'id'> = {
            recording_id: currentRecording.id,
            chunk_index: Date.now(),
            blob,
            timestamp: new Date()
        };

        try {
            const result = await audioStore.saveChunk(chunk);
            if (result.error) throw result.error;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save recording chunk');
        }
    };

    const refreshRecordings = useCallback(async () => {
        try {
            const result = await audioStore.getAllRecordings();
            if (result.error) throw result.error;
            if (result.data) {
                setRecordings(result.data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch recordings');
        }
    }, [audioStore]);

    useEffect(() => {
        refreshRecordings();
    }, [refreshRecordings]);

    const startRecording = useCallback(async () => {
        try {
            const newRecording: Partial<Recording> = {
                filename: `recording-${Date.now()}`,
                title: `Recording ${new Date().toLocaleString()}`,
                duration: 0,
                status: 'recording',
                created_at: new Date(),
                updated_at: new Date(),
                size: 0,
                recording_quality: {
                    sampleRate: 48000,
                    bitDepth: 16,
                    channels: 1
                }
            };

            const result = await audioStore.createRecording(newRecording);
            if (result.error) throw result.error;
            if (!result.data) throw new Error('Failed to create recording');

            const recordingResult = await audioStore.getRecording(result.data);
            if (recordingResult.error) throw recordingResult.error;
            if (!recordingResult.data) throw new Error('Failed to fetch created recording');

            setCurrentRecording(recordingResult.data);
            startMediaRecording();

            durationInterval.current = window.setInterval(() => {
                setDuration(d => d + 1);
            }, 1000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start recording');
        }
    }, [audioStore, startMediaRecording]);


    const stopRecording = useCallback(async () => {
        if (!currentRecording?.id) return;

        try {
            if (durationInterval.current !== null) {
                clearInterval(durationInterval.current);
                durationInterval.current = null; // Clear the interval reference
            }

            stopMediaRecording();

            const finalSize = lastChunkRef.current?.size ?? 0;
            await audioStore.updateRecordingStatus(currentRecording.id, 'completed', {
                duration,
                updated_at: new Date(),
                size: finalSize
            });

            setCurrentRecording(null);
            setDuration(0);
            lastChunkRef.current = null;
            await refreshRecordings();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to stop recording');
        }
    }, [audioStore, currentRecording, duration, stopMediaRecording, refreshRecordings]);

    const pauseRecording = useCallback(() => {
        if (!currentRecording?.id) return;

        if (durationInterval.current) {
            clearInterval(durationInterval.current);
        }
        pauseMediaRecording();
        audioStore.updateRecordingStatus(currentRecording.id, 'paused');
    }, [audioStore, currentRecording, pauseMediaRecording]);

    const resumeRecording = useCallback(() => {
        if (!currentRecording?.id) return;
        if (durationInterval.current !== null) {
            clearInterval(durationInterval.current);
        }
        durationInterval.current = window.setInterval(() => {
            setDuration(d => d + 1);
        }, 1000);

        resumeMediaRecording();
        audioStore.updateRecordingStatus(currentRecording.id, 'recording');
    }, [audioStore, currentRecording, resumeMediaRecording]);

    const play = useCallback(async (recordingId: number) => {
        try {
            const result = await audioStore.getRecordingWithChunks(recordingId);
            if (result.error) throw result.error;
            if (!result.data?.recording || !result.data?.chunks?.length) {
                throw new Error('No recording data found');
            }

            const chunks = result.data.chunks.map(chunk => chunk.blob);
            const audioBlob = new Blob(chunks, {type: 'audio/webm;codecs=opus'});
            const audioUrl = URL.createObjectURL(audioBlob);

            if (audioRef.current) {
                audioRef.current.src = audioUrl;
                await audioRef.current.play();
                setIsPlaying(true);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to play recording');
        }
    }, [audioStore]);

    const pause = useCallback(() => {
        if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    }, []);

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    }, []);

    const seek = useCallback((time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
        }
    }, []);

    const deleteRecording = useCallback(async (id: number) => {
        try {
            const result = await audioStore.deleteRecording(id);
            if (result.error) throw result.error;
            await refreshRecordings();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete recording');
        }
    }, [audioStore, refreshRecordings]);

    useEffect(() => {
        if (durationInterval.current) {
            clearInterval(durationInterval.current);
        }
        return () => {
            if (durationInterval.current) {
                clearInterval(durationInterval.current);
            }
            if (audioRef.current) {
                URL.revokeObjectURL(audioRef.current.src);
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        audioRef.current = new Audio();
        return () => {
            if (audioRef.current) {
                URL.revokeObjectURL(audioRef.current.src);
                audioRef.current = null;
            }
        };
    }, []);

    return {
        isRecording: status === 'recording',
        isPaused: status === 'paused',
        isMuted: isAudioMuted,
        duration,
        formattedDuration: format(duration * 1000),
        status,
        error,
        previewStream,
        startRecording,
        pauseRecording,
        resumeRecording,
        stopRecording,
        muteRecording: muteMediaRecording,
        unmuteRecording: unmuteMediaRecording,
        recordings,
        currentRecording,
        loading: audioStore.isLoading(),
        play,
        pause,
        stop,
        seek,
        refreshRecordings,
        deleteRecording
    };
}