import { useState, useCallback, useRef, useEffect } from 'react';
import { useAudioStore } from '@/hooks/idb/useAudioStore';
import { Recording } from '@/types/audioRecording.types';

const format = require('format-duration');

interface UseRecorderProps {
    onRecordingStart?: () => void;
    onRecordingStop?: (recording: Recording) => void;
    audioConstraints?: MediaTrackConstraints;
}

interface DirectUseRecorderReturn {
    isRecording: boolean;
    isPaused: boolean;
    duration: number;
    formattedDuration: string;
    error: string | null;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<void>;
    pauseRecording: () => Promise<void>;
    resumeRecording: () => Promise<void>;
    currentRecording: Recording | null;
    previewStream: MediaStream | null;
    loading: boolean;
    status: 'inactive' | 'recording' | 'paused';
    hasStream: boolean;
    initializeStream: () => Promise<void>;
    releaseStream: () => void;
}

export function DirectUseRecorder({
                                onRecordingStart,
                                onRecordingStop,
                                audioConstraints
                            }: UseRecorderProps = {}): DirectUseRecorderReturn {
    const audioStore = useAudioStore();
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
    const [currentRecording, setCurrentRecording] = useState<Recording | null>(null);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<'inactive' | 'recording' | 'paused'>('inactive');
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

    const durationInterval = useRef<NodeJS.Timeout | null>(null);
    const chunkInterval = useRef<NodeJS.Timeout | null>(null);

    const clearIntervals = useCallback(() => {
        if (durationInterval.current) {
            clearInterval(durationInterval.current);
            durationInterval.current = null;
        }
        if (chunkInterval.current) {
            clearInterval(chunkInterval.current);
            chunkInterval.current = null;
        }
    }, []);

    const initializeStream = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    ...audioConstraints,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000,
                }
            });
            setStream(mediaStream);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to initialize audio stream');
            throw err;
        }
    }, [audioConstraints]);

    const releaseStream = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    const createRecorder = useCallback(() => {
        if (!stream) return null;

        const mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            setError('Unsupported audio format');
            return null;
        }

        const mediaRecorder = new MediaRecorder(stream, {
            mimeType,
            audioBitsPerSecond: 128000
        });

        mediaRecorder.ondataavailable = async (event) => {
            if (event.data.size > 0) {
                setAudioChunks(prev => [...prev, event.data]);

                if (currentRecording?.id) {
                    try {
                        await audioStore.saveChunk({
                            recording_id: currentRecording.id,
                            chunk_index: Date.now(),
                            blob: event.data,
                            timestamp: new Date()
                        });
                    } catch (err) {
                        console.error('Failed to save chunk:', err);
                    }
                }
            }
        };

        return mediaRecorder;
    }, [stream, currentRecording?.id, audioStore]);

    const startRecording = useCallback(async () => {
        try {
            if (!stream) {
                await initializeStream();
            }

            const mediaRecorder = createRecorder();
            if (!mediaRecorder) {
                throw new Error('Failed to create media recorder');
            }

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
            if (result.error) throw new Error(result.error);
            if (!result.data) throw new Error('Failed to create recording');

            const recordingResult = await audioStore.getRecording(result.data);
            if (recordingResult.error) throw new Error(recordingResult.error);
            if (!recordingResult.data) throw new Error('Failed to fetch created recording');

            setCurrentRecording(recordingResult.data);
            setAudioChunks([]);
            setDuration(0);
            setStatus('recording');

            mediaRecorder.start(1000); // Capture in 1-second chunks
            setRecorder(mediaRecorder);

            durationInterval.current = setInterval(() => {
                setDuration(d => d + 1);
            }, 1000);

            onRecordingStart?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start recording');
        }
    }, [stream, createRecorder, audioStore, initializeStream, onRecordingStart]);

    const stopRecording = useCallback(async () => {
        if (!recorder || !currentRecording?.id) return;

        try {
            clearIntervals();
            recorder.stop();
            setStatus('inactive');

            const finalBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
            const finalSize = finalBlob.size;

            await audioStore.updateRecordingStatus(currentRecording.id, 'completed', {
                duration,
                updated_at: new Date(),
                size: finalSize
            });

            onRecordingStop?.(currentRecording);

            setCurrentRecording(null);
            setDuration(0);
            setAudioChunks([]);
            setRecorder(null);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to stop recording');
        }
    }, [recorder, currentRecording, audioStore, duration, audioChunks, clearIntervals, onRecordingStop]);

    const pauseRecording = useCallback(async () => {
        if (!recorder || !currentRecording?.id) return;

        try {
            recorder.pause();
            setStatus('paused');
            clearIntervals();
            await audioStore.updateRecordingStatus(currentRecording.id, 'paused');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to pause recording');
        }
    }, [recorder, currentRecording, audioStore, clearIntervals]);

    const resumeRecording = useCallback(async () => {
        if (!recorder || !currentRecording?.id) return;

        try {
            recorder.resume();
            setStatus('recording');

            durationInterval.current = setInterval(() => {
                setDuration(d => d + 1);
            }, 1000);

            await audioStore.updateRecordingStatus(currentRecording.id, 'recording');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to resume recording');
        }
    }, [recorder, currentRecording, audioStore]);

    useEffect(() => {
        return () => {
            clearIntervals();
            releaseStream();
        };
    }, [clearIntervals, releaseStream]);

    return {
        isRecording: status === 'recording',
        isPaused: status === 'paused',
        duration,
        formattedDuration: format(duration * 1000),
        error,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        currentRecording,
        previewStream: stream,
        loading: audioStore.isLoading(),
        status,
        hasStream: !!stream,
        initializeStream,
        releaseStream
    };
}