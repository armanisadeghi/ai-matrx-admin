/**
 * Combined Recording and Transcription Hook
 * 
 * High-level hook that combines recording and transcription
 * Perfect for components that need both functionalities
 */

'use client';

import { useState, useCallback } from 'react';
import { useSimpleRecorder } from './useSimpleRecorder';
import { useAudioTranscription } from './useAudioTranscription';
import { TranscriptionOptions, TranscriptionResult } from '../types';

export interface UseRecordAndTranscribeProps {
  onTranscriptionComplete?: (result: TranscriptionResult) => void;
  onError?: (error: string, errorCode?: string) => void;
  autoTranscribe?: boolean; // Automatically transcribe when recording stops
  transcriptionOptions?: TranscriptionOptions;
}

export function useRecordAndTranscribe({
  onTranscriptionComplete,
  onError,
  autoTranscribe = true,
  transcriptionOptions,
}: UseRecordAndTranscribeProps = {}) {
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  // Transcription hook
  const {
    transcribe,
    isTranscribing,
    error: transcriptionError,
    result: transcriptionResult,
    reset: resetTranscription,
  } = useAudioTranscription();

  // Handle recording complete
  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    setRecordedBlob(blob);
    
    if (autoTranscribe) {
      try {
        const result = await transcribe(blob, transcriptionOptions);
        if (result.success) {
          onTranscriptionComplete?.(result);
        } else {
          onError?.(result.error || 'Transcription failed', 'TRANSCRIPTION_FAILED');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Transcription failed';
        onError?.(errorMsg, 'TRANSCRIPTION_ERROR');
      }
    }
  }, [autoTranscribe, transcribe, transcriptionOptions, onTranscriptionComplete, onError]);

  // Recording hook
  const {
    isRecording,
    isPaused,
    duration,
    audioLevel,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    reset: resetRecording,
  } = useSimpleRecorder({
    onRecordingComplete: handleRecordingComplete,
    onError,
  });

  // Manual transcription (if autoTranscribe is false)
  const manualTranscribe = useCallback(async () => {
    if (recordedBlob) {
      try {
        const result = await transcribe(recordedBlob, transcriptionOptions);
        if (result.success) {
          onTranscriptionComplete?.(result);
        } else {
          onError?.(result.error || 'Transcription failed', 'TRANSCRIPTION_FAILED');
        }
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Transcription failed';
        onError?.(errorMsg, 'TRANSCRIPTION_ERROR');
        return null;
      }
    }
    return null;
  }, [recordedBlob, transcribe, transcriptionOptions, onTranscriptionComplete, onError]);

  // Combined reset
  const reset = useCallback(() => {
    resetRecording();
    resetTranscription();
    setRecordedBlob(null);
  }, [resetRecording, resetTranscription]);

  // Determine overall state
  const isProcessing = isRecording || isTranscribing;
  const error = transcriptionError;

  return {
    // Recording state
    isRecording,
    isPaused,
    duration,
    audioLevel,
    
    // Transcription state
    isTranscribing,
    transcriptionResult,
    
    // Combined state
    isProcessing,
    error,
    recordedBlob,
    
    // Recording actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    
    // Transcription actions
    manualTranscribe,
    
    // Combined actions
    reset,
  };
}

