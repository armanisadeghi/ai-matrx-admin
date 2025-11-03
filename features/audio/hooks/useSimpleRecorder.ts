/**
 * Simple Audio Recorder Hook
 * 
 * Lightweight hook for recording audio without IndexedDB storage
 * Optimized for quick transcription use cases
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseSimpleRecorderProps {
  onRecordingComplete?: (blob: Blob) => void;
  onError?: (error: string) => void;
}

export function useSimpleRecorder({
  onRecordingComplete,
  onError,
}: UseSimpleRecorderProps = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }

    chunksRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Optimal for Whisper (will be downsampled to 16KHz anyway)
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Determine best MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        onRecordingComplete?.(blob);
        cleanup();
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000;
        setDuration(Math.floor(elapsed));
      }, 100);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      console.error('Recording error:', err);
      onError?.(errorMessage);
      cleanup();
    }
  }, [cleanup, onRecordingComplete, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      const pauseDuration = Date.now() - startTimeRef.current - pausedTimeRef.current;
      pausedTimeRef.current += pauseDuration;
      
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000;
        setDuration(Math.floor(elapsed));
      }, 100);
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setAudioBlob(null);
  }, [cleanup]);

  return {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    reset,
  };
}

