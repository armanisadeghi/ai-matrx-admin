/**
 * Voice-Enabled Textarea Component
 * 
 * Textarea with built-in copy and voice input capabilities
 * Icons appear on hover or focus for a clean interface
 * 
 * @official-component
 */

'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Copy, Check, Mic, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useRecordAndTranscribe } from '@/features/audio/hooks';
import { TranscriptionResult } from '@/features/audio/types';

export interface VoiceTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onTranscriptionComplete?: (text: string) => void;
  onTranscriptionError?: (error: string) => void;
  appendTranscript?: boolean; // If true, appends to existing text; if false, replaces
  autoGrow?: boolean;
  minHeight?: number;
  maxHeight?: number;
  wrapperClassName?: string;
}

export const VoiceTextarea = React.forwardRef<HTMLTextAreaElement, VoiceTextareaProps>(
  (
    {
      className,
      wrapperClassName,
      onTranscriptionComplete,
      onTranscriptionError,
      appendTranscript = true,
      autoGrow = false,
      minHeight,
      maxHeight,
      value,
      onChange,
      disabled,
      ...props
    },
    ref
  ) => {
    const [hasCopied, setHasCopied] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isAudioAvailable, setIsAudioAvailable] = useState(true);
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

    // Check if audio is available
    useEffect(() => {
      const checkAudioAvailability = async () => {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setIsAudioAvailable(false);
            return;
          }
          // Just check if we can enumerate devices, don't actually request permission yet
          await navigator.mediaDevices.enumerateDevices();
          setIsAudioAvailable(true);
        } catch (error) {
          console.warn('Audio not available:', error);
          setIsAudioAvailable(false);
        }
      };
      checkAudioAvailability();
    }, []);

    // Auto-grow functionality
    useEffect(() => {
      if (!autoGrow || !textareaRef.current) return;

      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      
      let newHeight = textarea.scrollHeight;
      if (minHeight) newHeight = Math.max(newHeight, minHeight);
      if (maxHeight) newHeight = Math.min(newHeight, maxHeight);
      
      textarea.style.height = `${newHeight}px`;
    }, [value, autoGrow, minHeight, maxHeight]);

    // Handle transcription
    const handleTranscriptionComplete = useCallback((result: TranscriptionResult) => {
      if (result.success && result.text && textareaRef.current) {
        const currentValue = textareaRef.current.value;
        const newValue = appendTranscript && currentValue
          ? `${currentValue}\n${result.text}`
          : result.text;

        // Create synthetic event to trigger onChange
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value'
        )?.set;
        
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(textareaRef.current, newValue);
          const event = new Event('input', { bubbles: true });
          textareaRef.current.dispatchEvent(event);
        }

        onTranscriptionComplete?.(result.text);
      }
    }, [appendTranscript, onTranscriptionComplete]);

    // Handle transcription error
    const handleTranscriptionError = useCallback((error: string) => {
      console.error('Transcription error:', error);
      onTranscriptionError?.(error);
    }, [onTranscriptionError]);

    // Recording and transcription hook
    const {
      isRecording,
      isTranscribing,
      audioLevel,
      startRecording,
      stopRecording,
    } = useRecordAndTranscribe({
      onTranscriptionComplete: handleTranscriptionComplete,
      onError: handleTranscriptionError,
      autoTranscribe: true,
    });

    // Handle copy
    const handleCopy = async () => {
      const textareaValue = textareaRef?.current?.value || String(value || '');
      if (textareaValue) {
        await navigator.clipboard.writeText(textareaValue);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 450);
      }
    };

    // Handle voice click
    const handleVoiceClick = useCallback(async () => {
      if (isRecording) {
        stopRecording();
      } else if (!isTranscribing) {
        await startRecording();
      }
    }, [isRecording, isTranscribing, startRecording, stopRecording]);

    const showControls = (isFocused || isHovered) && !disabled;
    const isVoiceDisabled = !isAudioAvailable || disabled || isTranscribing;

    return (
      <div 
        className={cn("relative group", wrapperClassName)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <textarea
          ref={textareaRef}
          className={cn(
            "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-y pr-20 placeholder:text-neutral-500 dark:placeholder:text-neutral-400",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            autoGrow && "resize-none overflow-hidden",
            className
          )}
          style={{
            minHeight: minHeight ? `${minHeight}px` : undefined,
            maxHeight: maxHeight ? `${maxHeight}px` : undefined,
          }}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          {...props}
        />

        {/* Control Icons */}
        <div 
          className={cn(
            "absolute right-2 top-2 flex items-center gap-1 transition-opacity duration-200 z-10",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {/* Voice Button */}
          {isAudioAvailable && (
            <button
              type="button"
              onClick={handleVoiceClick}
              disabled={isVoiceDisabled}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                isRecording 
                  ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" 
                  : isTranscribing
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  : "hover:bg-muted",
                isVoiceDisabled && "opacity-50 cursor-not-allowed"
              )}
              aria-label={isRecording ? "Stop recording" : "Start voice input"}
            >
              {isTranscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mic 
                  className={cn(
                    "h-4 w-4",
                    isRecording 
                      ? "text-red-600 dark:text-red-400" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  style={
                    isRecording
                      ? {
                          filter: `drop-shadow(0 0 ${Math.min(audioLevel / 10, 8)}px currentColor)`,
                        }
                      : undefined
                  }
                />
              )}
            </button>
          )}

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 hover:bg-muted rounded-md transition-colors"
            aria-label="Copy to clipboard"
          >
            {hasCopied ? (
              <motion.div 
                initial={{ scale: 0.8 }} 
                animate={{ scale: 1 }} 
                exit={{ scale: 0.8 }} 
                className="text-green-500"
              >
                <Check className="h-4 w-4" />
              </motion.div>
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            )}
          </button>
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute left-2 bottom-2 flex items-center gap-1.5 px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded-md">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-2 h-2 bg-red-500 rounded-full"
            />
            <span className="text-xs text-red-600 dark:text-red-400 font-medium">
              Recording...
            </span>
          </div>
        )}

        {/* Transcribing Indicator */}
        {isTranscribing && !isRecording && (
          <div className="absolute left-2 bottom-2 flex items-center gap-1.5 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md">
            <Loader2 className="w-3 h-3 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Transcribing...
            </span>
          </div>
        )}
      </div>
    );
  }
);

VoiceTextarea.displayName = 'VoiceTextarea';

