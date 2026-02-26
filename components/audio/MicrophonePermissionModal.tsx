'use client';

import React from 'react';
import { Mic, MicOff, Shield } from 'lucide-react';

interface MicrophonePermissionModalProps {
    isOpen: boolean;
    onAccept: () => void;
    onDismiss: () => void;
    isDenied?: boolean;
}

/**
 * Modal shown before requesting microphone permission.
 * Two modes:
 *  - Normal (prompt): Explain we're about to ask, let user accept/dismiss.
 *  - Denied: Explain how to re-enable in browser settings.
 */
export function MicrophonePermissionModal({
    isOpen,
    onAccept,
    onDismiss,
    isDenied = false,
}: MicrophonePermissionModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mic-modal-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onDismiss}
            />

            {/* Panel */}
            <div className="relative z-10 w-full max-w-sm rounded-2xl bg-background border border-border shadow-2xl overflow-hidden">
                {/* Header gradient bar */}
                <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />

                <div className="p-6 flex flex-col items-center gap-4">
                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                        isDenied
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : 'bg-violet-100 dark:bg-violet-900/30'
                    }`}>
                        {isDenied
                            ? <MicOff size={32} className="text-red-500 dark:text-red-400" />
                            : <Mic size={32} className="text-violet-500 dark:text-violet-400" />
                        }
                    </div>

                    {/* Title */}
                    <h2 id="mic-modal-title" className="text-lg font-semibold text-center text-foreground">
                        {isDenied ? 'Microphone Access Blocked' : 'Enable Microphone Access'}
                    </h2>

                    {/* Body */}
                    {isDenied ? (
                        <div className="text-center space-y-2">
                            <p className="text-sm text-muted-foreground">
                                Your browser has blocked microphone access. To use voice features, please:
                            </p>
                            <ol className="text-sm text-muted-foreground text-left list-decimal list-inside space-y-1">
                                <li>Click the <span className="font-medium text-foreground">lock icon</span> in your browser&apos;s address bar</li>
                                <li>Find <span className="font-medium text-foreground">Microphone</span> and set it to <span className="font-medium text-foreground">Allow</span></li>
                                <li>Reload the page</li>
                            </ol>
                        </div>
                    ) : (
                        <div className="text-center space-y-2">
                            <p className="text-sm text-muted-foreground">
                                AI Matrx would like to use your microphone for voice input. Your browser will ask you to confirm.
                            </p>
                            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-left">
                                <Shield size={16} className="text-violet-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-muted-foreground">
                                    Audio is processed locally for voice detection and is never stored without your knowledge.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 w-full mt-1">
                        <button
                            onClick={onDismiss}
                            className="flex-1 py-2 px-4 rounded-xl text-sm font-medium border border-border bg-background text-foreground hover:bg-accent transition-colors"
                        >
                            {isDenied ? 'Got it' : 'Not now'}
                        </button>
                        {!isDenied && (
                            <button
                                onClick={onAccept}
                                className="flex-1 py-2 px-4 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors"
                            >
                                Allow microphone
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MicrophonePermissionModal;
