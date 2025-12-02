"use client";

import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PromptRunnerModalProps } from "../../types/modal";
import { PromptRunner } from "./PromptRunner";

/**
 * PromptRunnerModal - Wrapper component for PromptRunner
 * 
 * Uses the new hybrid canvas system:
 * - Canvas automatically renders in global CanvasSideSheet (z-index 10000)
 * - Works seamlessly without any special canvas handling
 * 
 * Note: Modal is not wide enough for inline canvas (max-w-3xl = 768px < 1100px minimum)
 * so canvas will always render in the global side sheet.
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
        // Canvas will use global CanvasSideSheet (modal not wide enough for inline)
    };

    // Standard display needs Dialog wrapper with fixed dimensions
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent 
                className="w-full max-w-3xl h-[95vh] p-0 gap-0 overflow-hidden"
            >
                <PromptRunner {...promptRunnerProps} />
            </DialogContent>
        </Dialog>
    );
}
