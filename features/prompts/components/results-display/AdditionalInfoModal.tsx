"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight } from "lucide-react";

interface AdditionalInfoModalProps {
    isOpen: boolean;
    onContinue: (additionalInfo?: string) => void;
    onCancel: () => void;
    customMessage?: string; // Optional custom message to display
    countdownSeconds?: number; // Optional override for countdown timer
}

/**
 * AdditionalInfoModal - Quick optional additional instructions before AI runs
 * Auto-proceeds if no interaction
 */
export function AdditionalInfoModal({
    isOpen,
    onContinue,
    onCancel,
    customMessage,
    countdownSeconds = 3
}: AdditionalInfoModalProps) {
    const [additionalInfo, setAdditionalInfo] = useState('');
    const [countdown, setCountdown] = useState(countdownSeconds);
    const [hasInteracted, setHasInteracted] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleContinue = useCallback(() => {
        onContinue(additionalInfo.trim() || undefined);
        setAdditionalInfo('');
        setCountdown(countdownSeconds);
        setHasInteracted(false);
    }, [additionalInfo, onContinue, countdownSeconds]);

    // Reset state and focus textarea when modal opens
    useEffect(() => {
        if (isOpen) {
            setCountdown(countdownSeconds);
            setHasInteracted(false);
            // Ensure focus after modal animation
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);
        }
    }, [isOpen, countdownSeconds]);

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
            <DialogContent className="max-w-[500px] p-4">
                <div className="space-y-2.5">
                    {customMessage && (
                        <p className="text-sm text-foreground pr-6">
                            {customMessage}
                        </p>
                    )}
                    
                    <div className="text-xs text-muted-foreground pr-6">
                        {!hasInteracted ? (
                            <>Auto-continuing in <span className="font-semibold text-foreground">{countdown}s</span> • <kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> to submit</>
                        ) : (
                            <><kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> to submit • <kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+Enter</kbd> for new line</>
                        )}
                    </div>

                    <Textarea
                        ref={textareaRef}
                        value={additionalInfo}
                        onChange={(e) => {
                            handleInteraction();
                            setAdditionalInfo(e.target.value);
                        }}
                        onClick={handleInteraction}
                        onKeyDown={handleKeyDown}
                        placeholder="Add additional instructions (optional)..."
                        className="min-h-[120px] resize-none text-sm"
                    />

                    <div className="flex justify-end">
                        <button
                            onClick={handleContinue}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                            Continue now <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

