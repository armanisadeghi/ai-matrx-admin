/**
 * Voice Input Button Component
 * 
 * Complete voice input button with recording and transcription
 * Includes all states: idle, recording, transcribing
 */

'use client';

import React, { useCallback, useState } from 'react';
import { AudioLines } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRecordAndTranscribe } from '../hooks';
import { TranscriptionResult } from '../types';
import { MicrophoneButton } from './MicrophoneButton';
import { TranscriptionLoader } from './TranscriptionLoader';
import { RecordingIndicator } from './RecordingIndicator';

export interface VoiceInputButtonProps {
  onTranscriptionComplete: (text: string) => void;
  onError?: (error: string) => void;
  variant?: 'button' | 'inline';
  buttonText?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export function VoiceInputButton({
  onTranscriptionComplete,
  onError,
  variant = 'inline',
  buttonText = 'Explain it Instead',
  size = 'md',
  className,
  disabled = false,
}: VoiceInputButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle transcription completion
  const handleTranscriptionComplete = useCallback((result: TranscriptionResult) => {
    if (result.success && result.text) {
      onTranscriptionComplete(result.text);
      setIsExpanded(false);
    }
  }, [onTranscriptionComplete]);

  // Handle errors
  const handleError = useCallback((error: string) => {
    console.error('Voice input error:', error);
    onError?.(error);
    setIsExpanded(false);
  }, [onError]);

  // Recording and transcription hook
  const {
    isRecording,
    isTranscribing,
    duration,
    audioLevel,
    startRecording,
    stopRecording,
  } = useRecordAndTranscribe({
    onTranscriptionComplete: handleTranscriptionComplete,
    onError: handleError,
    autoTranscribe: true,
  });

  // Handle button click
  const handleClick = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else if (!isTranscribing) {
      setIsExpanded(true);
      await startRecording();
    }
  }, [isRecording, isTranscribing, startRecording, stopRecording]);

  // Inline microphone icon variant
  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center', className)}>
        {isTranscribing ? (
          <TranscriptionLoader duration={duration} size={size} />
        ) : isRecording ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <RecordingIndicator 
              duration={duration} 
              audioLevel={audioLevel}
              size={size}
              color="blue"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={stopRecording}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 h-7 px-2 text-xs"
            >
              Stop
            </Button>
          </div>
        ) : (
          <MicrophoneButton
            size="icon"
            onClick={handleClick}
            disabled={disabled}
            className={className}
          />
        )}
      </div>
    );
  }

  // Button variant with text
  return (
    <div className={cn('flex items-center', className)}>
      {isTranscribing ? (
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-4 sm:py-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <TranscriptionLoader duration={duration} size={size} />
        </div>
      ) : isRecording || isExpanded ? (
        <div className="flex items-center gap-1.5 sm:gap-3 px-2 py-1 sm:px-4 sm:py-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <RecordingIndicator 
            duration={duration} 
            audioLevel={audioLevel}
            size={size} 
            showPulse={isRecording}
            color="blue"
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={stopRecording}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 h-7 px-2 text-xs"
          >
            <span className="sm:hidden">Stop</span>
            <span className="hidden sm:inline">Stop Recording</span>
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className={cn(
            'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white',
            size === 'sm' && 'h-8 text-xs',
            size === 'md' && 'h-9 text-sm',
            size === 'lg' && 'h-10 text-base'
          )}
        >
          <AudioLines className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      )}
    </div>
  );
}

