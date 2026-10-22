/**
 * Microphone Button Component
 * 
 * Simple, reusable microphone button with recording state visualization
 * Can be used anywhere in the app for quick voice input
 */

'use client';

import React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

export interface MicrophoneButtonProps {
  isRecording?: boolean;
  isProcessing?: boolean;
  disabled?: boolean;
  /** Tone while idle; recording always reads as `danger`. */
  variant?: 'primary' | 'outline' | 'quiet';
  onClick?: () => void;
  className?: string;
  tooltip?: string;
  showLabel?: boolean;
}

export function MicrophoneButton({
  isRecording = false,
  isProcessing = false,
  disabled = false,
  variant = 'quiet',
  onClick,
  className,
  tooltip,
  showLabel = false,
}: MicrophoneButtonProps) {
  
  // Determine icon based on state
  const Icon = isProcessing ? Loader2 : isRecording ? MicOff : Mic;
  
  const title =
    tooltip || (isRecording ? 'Stop recording' : isProcessing ? 'Processing...' : 'Start recording');
  const glyph = <Icon className={isProcessing ? 'animate-spin' : undefined} />;
  const tone = isRecording && !isProcessing ? 'danger' : variant;

  return showLabel ? (
    <Button
      type="button"
      variant={tone}
      icon={glyph}
      onClick={onClick}
      disabled={disabled || isProcessing}
      className={className}
      title={title}
    >
      {isProcessing ? 'Processing...' : isRecording ? 'Recording' : 'Record'}
    </Button>
  ) : (
    <Button
      type="button"
      variant={tone}
      icon={glyph}
      onClick={onClick}
      disabled={disabled || isProcessing}
      className={className}
      title={title}
      aria-label={title}
    />
  );
}
