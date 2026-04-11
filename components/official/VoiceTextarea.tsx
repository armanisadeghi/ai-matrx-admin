/**
 * Voice-Enabled Textarea Component
 *
 * Textarea with built-in copy and voice input capabilities
 * Icons appear on hover or focus for a clean interface
 *
 * **Built-in Protection:** Automatically warns users before unmounting
 * during active recording or transcription to prevent data loss.
 *
 * @official-component
 */

"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import { Copy, Check, Mic, Loader2, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useRecordAndTranscribe } from "@/features/audio/hooks";
import { TranscriptionResult } from "@/features/audio/types";
import { VoiceTroubleshootingModal } from "@/features/audio/components/VoiceTroubleshootingModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

/** Real HTMLTextAreaElement with optional expando methods set by VoiceTextarea. */
export interface VoiceTextareaElement extends HTMLTextAreaElement {
  requestClose?: () => void;
  isTranscribing?: () => boolean;
}

export interface VoiceTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onTranscriptionComplete?: (text: string) => void;
  onTranscriptionError?: (error: string) => void;
  appendTranscript?: boolean; // If true, appends to existing text; if false, replaces
  autoGrow?: boolean;
  minHeight?: number;
  maxHeight?: number;
  wrapperClassName?: string;
  onRequestClose?: () => void; // Called when it's safe to close/unmount (after user confirms or recording/transcription completes)
  protectTranscription?: boolean; // If true, prevents unmounting during recording/transcription with a warning modal (default: true)
}

export const VoiceTextarea = React.forwardRef<
  HTMLTextAreaElement,
  VoiceTextareaProps
>(
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
      onRequestClose,
      protectTranscription = true,
      ...props
    },
    ref,
  ) => {
    const [hasCopied, setHasCopied] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isAudioAvailable, setIsAudioAvailable] = useState(true);
    const [showTroubleshooting, setShowTroubleshooting] = useState(false);
    const [showTranscriptionWarning, setShowTranscriptionWarning] =
      useState(false);
    const [lastError, setLastError] = useState<{
      message: string;
      code: string;
    } | null>(null);
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef =
      (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;
    const closeRequestedRef = useRef(false);
    const preRecordingValueRef = useRef("");

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
          console.warn("Audio not available:", error);
          setIsAudioAvailable(false);
        }
      };
      checkAudioAvailability();
    }, []);

    // Auto-grow functionality
    useEffect(() => {
      if (!autoGrow || !textareaRef.current) return;

      const textarea = textareaRef.current;
      textarea.style.height = "auto";

      let newHeight = textarea.scrollHeight;
      if (minHeight) newHeight = Math.max(newHeight, minHeight);
      if (maxHeight) newHeight = Math.min(newHeight, maxHeight);

      textarea.style.height = `${newHeight}px`;
    }, [value, autoGrow, minHeight, maxHeight]);

    const pushToTextarea = useCallback((newValue: string) => {
      if (!textareaRef.current) return;
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(textareaRef.current, newValue);
        const event = new Event("input", { bubbles: true });
        textareaRef.current.dispatchEvent(event);
      }
    }, []);

    const handleTranscriptionComplete = useCallback(
      (result: TranscriptionResult) => {
        if (result.success && result.text) {
          const base = preRecordingValueRef.current;
          const newValue =
            appendTranscript && base ? `${base}\n${result.text}` : result.text;
          pushToTextarea(newValue);
          onTranscriptionComplete?.(result.text);
        }
      },
      [appendTranscript, onTranscriptionComplete, pushToTextarea],
    );

    // Handle transcription error
    const handleTranscriptionError = useCallback(
      (error: string, errorCode?: string) => {
        console.error("Transcription error:", error, errorCode);

        // Store error for troubleshooting modal
        setLastError({ message: error, code: errorCode || "UNKNOWN_ERROR" });

        // Show persistent toast with "Get Help" button
        toast.error("Voice input failed", {
          description: error,
          duration: 10000, // 10 seconds
          action: {
            label: "Get Help",
            onClick: () => setShowTroubleshooting(true),
          },
        });

        onTranscriptionError?.(error);
      },
      [onTranscriptionError],
    );

    // Recording and transcription hook (streaming: real-time text while speaking)
    const {
      isRecording,
      isTranscribing,
      audioLevel,
      liveTranscript,
      startRecording,
      stopRecording,
    } = useRecordAndTranscribe({
      onTranscriptionComplete: handleTranscriptionComplete,
      onError: handleTranscriptionError,
      autoTranscribe: true,
      streaming: true,
    });

    // Stream liveTranscript into the textarea as chunks arrive
    useEffect(() => {
      if (!isRecording && !isTranscribing) return;
      if (!liveTranscript) return;
      const base = preRecordingValueRef.current;
      const newValue =
        appendTranscript && base
          ? `${base}\n${liveTranscript}`
          : liveTranscript;
      pushToTextarea(newValue);
    }, [
      liveTranscript,
      isRecording,
      isTranscribing,
      appendTranscript,
      pushToTextarea,
    ]);

    // Handle close request - check if recording or transcribing and show warning if needed
    const handleCloseRequest = useCallback(() => {
      if (protectTranscription && (isRecording || isTranscribing)) {
        // Show warning modal
        closeRequestedRef.current = true;
        setShowTranscriptionWarning(true);
      } else {
        // Safe to close immediately
        onRequestClose?.();
      }
    }, [isRecording, isTranscribing, protectTranscription, onRequestClose]);

    // Attach custom methods as expando properties on the real DOM element so
    // consumers get a genuine HTMLTextAreaElement (focus/blur/select all work)
    // while still being able to call requestClose() and isTranscribing().
    useEffect(() => {
      const el = textareaRef.current;
      if (!el) return;
      (el as VoiceTextareaElement).requestClose = handleCloseRequest;
      (el as VoiceTextareaElement).isTranscribing = () => isTranscribing;
    }, [handleCloseRequest, isTranscribing]);

    // Auto-close modal when recording and transcription complete
    useEffect(() => {
      if (
        !isRecording &&
        !isTranscribing &&
        closeRequestedRef.current &&
        showTranscriptionWarning
      ) {
        // Recording and transcription completed - allow close now
        closeRequestedRef.current = false;
      }
    }, [isRecording, isTranscribing, showTranscriptionWarning]);

    // Handle copy
    const handleCopy = async () => {
      const textareaValue = textareaRef?.current?.value || String(value || "");
      if (textareaValue) {
        await navigator.clipboard.writeText(textareaValue);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 450);
      }
    };

    const handleVoiceClick = useCallback(async () => {
      if (isRecording) {
        stopRecording();
      } else if (!isTranscribing) {
        preRecordingValueRef.current = textareaRef.current?.value || "";
        await startRecording();
      }
    }, [isRecording, isTranscribing, startRecording, stopRecording]);

    const showControls =
      (isFocused || isHovered || isRecording || isTranscribing) && !disabled;
    const isVoiceDisabled =
      !isAudioAvailable || disabled || (isTranscribing && !isRecording);

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
            className,
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
            showControls ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          {isAudioAvailable && (
            <button
              type="button"
              onClick={handleVoiceClick}
              disabled={isVoiceDisabled}
              className={cn(
                "relative p-1.5 rounded-full transition-all duration-200",
                isRecording
                  ? "bg-primary/10 dark:bg-primary/15 hover:bg-primary/20 dark:hover:bg-primary/25 cursor-pointer"
                  : isTranscribing && !isRecording
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "hover:bg-muted cursor-pointer",
                isVoiceDisabled && "opacity-50 cursor-not-allowed",
              )}
              aria-label={isRecording ? "Stop recording" : "Start voice input"}
            >
              {isRecording && (
                <span
                  className="absolute inset-0 rounded-full bg-primary/20 animate-ping"
                  style={{ animationDuration: "1.5s" }}
                />
              )}
              {isRecording && (
                <span
                  className="absolute inset-0 rounded-full bg-primary/15 transition-transform duration-75"
                  style={{ transform: `scale(${1 + audioLevel / 200})` }}
                />
              )}
              {isTranscribing && !isRecording ? (
                <Loader2 className="h-4 w-4 animate-spin relative" />
              ) : (
                <Mic
                  className={cn(
                    "h-4 w-4 relative",
                    isRecording
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
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

        {isRecording && (
          <div className="absolute left-2 bottom-2 right-12 flex items-center gap-1.5 px-2 py-1 bg-primary/10 dark:bg-primary/15 rounded-md">
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-2 h-2 bg-primary rounded-full flex-shrink-0"
            />
            <span className="text-xs text-primary font-medium truncate">
              {liveTranscript ? liveTranscript.slice(-60) : "Listening..."}
            </span>
          </div>
        )}

        {/* Transcribing Indicator (finalizing after recording stops) */}
        {isTranscribing && !isRecording && (
          <div className="absolute left-2 bottom-2 flex items-center gap-1.5 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md">
            <Loader2 className="w-3 h-3 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Finalizing...
            </span>
          </div>
        )}

        {/* Troubleshooting Modal */}
        <VoiceTroubleshootingModal
          isOpen={showTroubleshooting}
          onClose={() => setShowTroubleshooting(false)}
          error={lastError?.message}
          errorCode={lastError?.code}
        />

        {/* Voice Input Protection Modal - Built-in protection for recording and transcription */}
        <AlertDialog
          open={showTranscriptionWarning}
          onOpenChange={setShowTranscriptionWarning}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                {isRecording || isTranscribing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    <AlertDialogTitle>
                      {isRecording
                        ? "Recording in Progress"
                        : "Transcription in Progress"}
                    </AlertDialogTitle>
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5 text-green-500" />
                    <AlertDialogTitle>Voice Input Complete</AlertDialogTitle>
                  </>
                )}
              </div>
              <AlertDialogDescription>
                {isRecording ? (
                  <>
                    Your voice is currently being recorded. If you close now,
                    the recording will be stopped and lost.
                  </>
                ) : isTranscribing ? (
                  <>
                    Your voice recording is currently being transcribed. If you
                    close now, the transcription will be lost.
                  </>
                ) : (
                  <>
                    Your voice input has been processed successfully! You can
                    now safely close this panel.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {isRecording || isTranscribing ? (
                <>
                  <AlertDialogCancel
                    onClick={() => {
                      setShowTranscriptionWarning(false);
                      closeRequestedRef.current = false;
                    }}
                  >
                    Cancel & Wait
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setShowTranscriptionWarning(false);
                      closeRequestedRef.current = false;
                      onRequestClose?.();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isRecording ? "Stop Recording" : "End Transcription"}
                  </AlertDialogAction>
                </>
              ) : (
                <AlertDialogAction
                  onClick={() => {
                    setShowTranscriptionWarning(false);
                    closeRequestedRef.current = false;
                    onRequestClose?.();
                  }}
                >
                  Close
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  },
);

VoiceTextarea.displayName = "VoiceTextarea";
