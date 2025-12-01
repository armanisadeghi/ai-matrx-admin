"use client";

import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PromptRunnerModalProps } from "../../types/modal";
import { PromptRunner } from "./PromptRunner";

/**
 * PromptRunnerModal - Wrapper component for PromptRunner
 * 
 * Conditionally applies Dialog wrapper based on displayVariant:
 * - 'standard': Wraps in Dialog with fixed dimensions (modal-style)
 * - 'compact': Renders directly without wrapper (free-floating draggable)
 * 
 * This allows each display variant to control its own container structure.
 */
export function PromptRunnerModal({
    isOpen,
    onClose,
    promptId,
    promptData,
    executionConfig,
    variables,
    initialMessage,
    onExecutionComplete,
    title,
    runId,
    customMessage,
}: PromptRunnerModalProps) {
    // Shared PromptRunner props
    const promptRunnerProps = {
        promptId,
        promptData,
        executionConfig,
        variables,
        initialMessage,
        onExecutionComplete,
        title,
        runId,
        onClose,
        isActive: isOpen,
        customMessage,
    };

    // Standard display needs Dialog wrapper with fixed dimensions
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent 
                className="w-full max-w-3xl h-[95vh] p-2 gap-0 overflow-hidden"
            >
                <PromptRunner {...promptRunnerProps} />
            </DialogContent>
        </Dialog>
    );
}
