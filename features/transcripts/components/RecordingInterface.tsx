'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Square, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { RECORDING_LIMITS } from '../constants/recording';
import { useRecordAndTranscribe } from '@/features/audio/hooks';
import { TranscriptionResult } from '@/features/audio/types';

interface RecordingInterfaceProps {
    onRecordingComplete: (audioBlob: Blob, duration: number) => void;
    onError: (error: string, code: string) => void;
    maxDuration?: number;
    maxSizeBytes?: number;
}

export function RecordingInterface({
    onRecordingComplete,
    onError,
    maxDuration = RECORDING_LIMITS.MAX_DURATION_SECONDS,
    maxSizeBytes = RECORDING_LIMITS.MAX_FILE_SIZE_BYTES,
}: RecordingInterfaceProps) {
    const [duration, setDuration] = useState(0);
    const [estimatedSize, setEstimatedSize] = useState(0);
    const [showWarning, setShowWarning] = useState(false);
    const [hasCompleted, setHasCompleted] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const startTimeRef = useRef<number>(0);

    // Use the proven recording hook from the existing system
    const {
        isRecording,
        isTranscribing,
        audioLevel,
        startRecording: startRec,
        stopRecording: stopRec,
        recordedBlob,
    } = useRecordAndTranscribe({
        onTranscriptionComplete: () => {
            // We don't need transcription here, we'll do it after saving
        },
        onError: (error: string, errorCode?: string) => {
            onError(error, errorCode || 'UNKNOWN');
        },
        autoTranscribe: false, // We'll transcribe later after saving to storage
    });

    // Format time MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Format file size
    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Calculate estimated size based on duration
    const calculateEstimatedSize = useCallback((durationSeconds: number) => {
        return durationSeconds * RECORDING_LIMITS.ESTIMATED_BYTES_PER_SECOND;
    }, []);

    // Start recording with duration tracking
    const startRecording = useCallback(async () => {
        setDuration(0);
        setEstimatedSize(0);
        setShowWarning(false);
        setHasCompleted(false);
        
        startTimeRef.current = Date.now();
        
        // Start the actual recording using the proven hook
        await startRec();

        // Start duration timer
        timerRef.current = setInterval(() => {
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            setDuration(elapsed);
            setEstimatedSize(calculateEstimatedSize(elapsed));

            // Show warning at 80% of limits
            if (elapsed >= RECORDING_LIMITS.WARN_DURATION_SECONDS) {
                setShowWarning(true);
            }

            // Auto-stop at max duration
            if (elapsed >= maxDuration) {
                stopRecording();
            }
        }, 100);
    }, [startRec, maxDuration, calculateEstimatedSize]);

    // Stop recording
    const stopRecording = useCallback(() => {
        stopRec();
        
        // Clean up timer
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = undefined;
        }
    }, [stopRec]);

    // Handle when recording completes and we have the blob
    useEffect(() => {
        if (recordedBlob && !isRecording && !hasCompleted) {
            setHasCompleted(true);
            const finalDuration = duration;
            
            // Call the parent callback with the blob and duration
            onRecordingComplete(recordedBlob, finalDuration);
        }
    }, [recordedBlob, isRecording, hasCompleted, duration, onRecordingComplete]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const durationProgress = (duration / maxDuration) * 100;
    const sizeProgress = (estimatedSize / maxSizeBytes) * 100;

    return (
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
            {!isRecording && !recordedBlob && (
                <div className="text-center space-y-4 max-w-md">
                    <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <Mic className="h-10 w-10 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Record Audio</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            Click the button below to start recording. Maximum duration: {Math.floor(maxDuration / 60)} minutes.
                        </p>
                    </div>
                    <Button onClick={startRecording} size="lg" className="min-w-[140px]">
                        <Mic className="h-4 w-4 mr-2" />
                        Start Recording
                    </Button>
                </div>
            )}

            {(isRecording || recordedBlob) && (
                <div className="w-full max-w-md space-y-6">
                    {/* Recording Indicator */}
                    <div className="flex flex-col items-center space-y-4">
                        <motion.div
                            className={cn(
                                "h-32 w-32 rounded-full flex items-center justify-center relative",
                                isRecording 
                                    ? "bg-red-100 dark:bg-red-900/30" 
                                    : "bg-green-100 dark:bg-green-900/30"
                            )}
                            animate={isRecording ? { scale: [1, 1.05, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                            {isRecording ? (
                                <>
                                    <Mic 
                                        className="h-12 w-12 text-red-600 dark:text-red-400" 
                                        style={{
                                            filter: `drop-shadow(0 0 ${Math.min(audioLevel / 10, 8)}px currentColor)`,
                                        }}
                                    />
                                    <motion.div
                                        className="absolute inset-0 rounded-full border-2 border-red-500"
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                    />
                                </>
                            ) : (
                                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                            )}
                        </motion.div>

                        <div className="text-center">
                            <div className="text-3xl font-mono font-bold">
                                {formatTime(duration)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {isRecording ? 'Recording...' : 'Recording Complete'}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bars */}
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Duration</span>
                                <span>{formatTime(duration)} / {formatTime(maxDuration)}</span>
                            </div>
                            <Progress 
                                value={durationProgress} 
                                className={cn(
                                    "h-2",
                                    durationProgress > 80 && "bg-red-100 dark:bg-red-900/20"
                                )}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Estimated Size</span>
                                <span>{formatSize(estimatedSize)} / {formatSize(maxSizeBytes)}</span>
                            </div>
                            <Progress 
                                value={sizeProgress} 
                                className={cn(
                                    "h-2",
                                    sizeProgress > 80 && "bg-red-100 dark:bg-red-900/20"
                                )}
                            />
                        </div>
                    </div>

                    {/* Warning */}
                    {showWarning && isRecording && (
                        <Alert className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            <AlertDescription className="text-orange-800 dark:text-orange-300 text-xs">
                                Approaching maximum duration. Recording will stop automatically at {Math.floor(maxDuration / 60)} minutes.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Controls */}
                    {isRecording && (
                        <div className="flex justify-center">
                            <Button
                                onClick={stopRecording}
                                size="lg"
                                variant="destructive"
                                className="min-w-[140px]"
                            >
                                <Square className="h-4 w-4 mr-2" />
                                Stop Recording
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
