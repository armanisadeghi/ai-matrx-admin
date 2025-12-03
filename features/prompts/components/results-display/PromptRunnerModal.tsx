"use client";

import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PromptRunner } from "./PromptRunner";

interface PromptRunnerModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Callback when modal closes */
    onClose: () => void;
    /** Required: The run ID - instance must exist in Redux */
    runId: string;
    /** Optional title */
    title?: string;
    /** Callback when execution completes */
    onExecutionComplete?: (result: { runId: string; response: string; metadata: any }) => void;
}

/**
 * PromptRunnerModal - Wrapper component for PromptRunner
 * 
 * IMPORTANT: Caller must initialize the run via startPromptInstance or loadRun
 * BEFORE opening this modal. The runId must exist in Redux.
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
    runId,
    title,
    onExecutionComplete,
}: PromptRunnerModalProps) {
    // Standard display needs Dialog wrapper with fixed dimensions
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent 
                className="w-full max-w-3xl h-[95vh] p-0 gap-0 overflow-hidden"
            >
                <PromptRunner
                    runId={runId}
                    title={title}
                    onClose={onClose}
                    onExecutionComplete={onExecutionComplete}
                />
            </DialogContent>
        </Dialog>
    );
}
