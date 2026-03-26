/**
 * Combined Recording and Transcription Hook
 *
 * Thin wrapper around useChunkedRecordAndTranscribe that provides
 * backward-compatible API for all existing consumers.
 *
 * - `streaming: true` (default): 10-second chunks, real-time transcript
 * - `streaming: false`: single-shot transcription after recording stops
 *
 * Both modes share the same IndexedDB safety net and error handling.
 */

'use client';

import { useChunkedRecordAndTranscribe, UseChunkedRecordAndTranscribeProps } from './useChunkedRecordAndTranscribe';
import { TranscriptionOptions, TranscriptionResult } from '../types';
import { AUDIO_LIMITS } from '../constants';

export interface UseRecordAndTranscribeProps {
  onTranscriptionComplete?: (result: TranscriptionResult) => void;
  onChunkTranscribed?: (chunkText: string, accumulatedText: string) => void;
  onChunkError?: (chunkIndex: number, error: string) => void;
  onError?: (error: string, errorCode?: string) => void;
  autoTranscribe?: boolean;
  streaming?: boolean;
  transcriptionOptions?: TranscriptionOptions;
}

const SINGLE_SHOT_CHUNK_MS = 30 * 60 * 1000;

export function useRecordAndTranscribe({
  onTranscriptionComplete,
  onChunkTranscribed,
  onChunkError,
  onError,
  autoTranscribe = true,
  streaming = true,
  transcriptionOptions,
}: UseRecordAndTranscribeProps = {}) {
  const chunkDurationMs = streaming
    ? AUDIO_LIMITS.CHUNK_DURATION_MS
    : SINGLE_SHOT_CHUNK_MS;

  const chunkedProps: UseChunkedRecordAndTranscribeProps = {
    onTranscriptionComplete: autoTranscribe ? onTranscriptionComplete : undefined,
    onChunkTranscribed: streaming ? onChunkTranscribed : undefined,
    onChunkError,
    onError,
    chunkDurationMs,
    transcriptionOptions,
  };

  const {
    isRecording,
    isTranscribing,
    isPaused,
    duration,
    audioLevel,
    liveTranscript,
    failedChunkCount,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    reset,
  } = useChunkedRecordAndTranscribe(chunkedProps);

  return {
    isRecording,
    isPaused,
    duration,
    audioLevel,
    isTranscribing,
    liveTranscript,
    failedChunkCount,
    isProcessing: isRecording || isTranscribing,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    reset,
  };
}
