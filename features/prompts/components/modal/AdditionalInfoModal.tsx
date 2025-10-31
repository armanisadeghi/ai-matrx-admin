"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight } from "lucide-react";

interface AdditionalInfoModalProps {
    isOpen: boolean;
    onContinue: (additionalInfo?: string) => void;
    onCancel: () => void;
    promptName: string;
}

/**
 * AdditionalInfoModal - Quick optional additional instructions before AI runs
 * Auto-proceeds in 3 seconds if no interaction
 */
export function AdditionalInfoModal({
    isOpen,
    onContinue,
    onCancel,
    promptName
}: AdditionalInfoModalProps) {
    const [additionalInfo, setAdditionalInfo] = useState('');
    const [countdown, setCountdown] = useState(3);
    const [hasInteracted, setHasInteracted] = useState(false);

    const handleContinue = useCallback(() => {
        onContinue(additionalInfo.trim() || undefined);
        setAdditionalInfo('');
        setCountdown(3);
        setHasInteracted(false);
    }, [additionalInfo, onContinue]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setCountdown(3);
            setHasInteracted(false);
        }
    }, [isOpen]);

    // Auto-proceed countdown (only if no interaction)
    useEffect(() => {
        if (!isOpen || hasInteracted) return;

        if (countdown === 0) {
            handleContinue();
            return;
        }

        const timer = setTimeout(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [isOpen, countdown, hasInteracted, handleContinue]);

    // Stop countdown on user interaction
    const handleInteraction = () => {
        if (!hasInteracted) {
            setHasInteracted(true);
        }
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Ctrl+Enter = new line (let it pass through naturally)
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleInteraction();
            return; // Allow default behavior (new line)
        }
        
        // Enter = submit
        if (e.key === 'Enter') {
            e.preventDefault();
            handleContinue();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="max-w-[500px] p-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        {!hasInteracted ? (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Proceeding in <span className="font-semibold text-gray-900 dark:text-gray-100">{countdown}s</span>
                            </p>
                        ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Enter</kbd> to continue
                            </p>
                        )}
                        <button
                            onClick={handleContinue}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                            Continue now
                            <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>

                    <Textarea
                        value={additionalInfo}
                        onChange={(e) => {
                            handleInteraction();
                            setAdditionalInfo(e.target.value);
                        }}
                        onClick={handleInteraction}
                        onKeyDown={handleKeyDown}
                        placeholder="Add additional instructions (optional)..."
                        className="min-h-[100px] resize-none text-sm"
                        autoFocus
                    />

                    <p className="text-xs text-gray-500 dark:text-gray-600">
                        {!hasInteracted ? (
                            <>Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Enter</kbd> or wait to continue</>
                        ) : (
                            <><kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+Enter</kbd> for new line</>
                        )}
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}

