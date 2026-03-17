"use client";

import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
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
 *
 * Mobile: renders as a bottom Drawer (max-h-[92dvh]) to support iOS safe areas.
 * Desktop: renders as a centered Dialog (max-w-3xl, h-[90dvh]).
 */
export function PromptRunnerModal({
    isOpen,
    onClose,
    runId,
    title,
    onExecutionComplete,
}: PromptRunnerModalProps) {
    const isMobile = useIsMobile();

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onClose}>
                <DrawerContent className="max-h-[92dvh] flex flex-col p-0">
                    <DrawerTitle className="sr-only">{title ?? "Run Prompt"}</DrawerTitle>
                    <div className="flex-1 overflow-y-auto overscroll-contain pb-safe">
                        <PromptRunner
                            runId={runId}
                            title={title}
                            onClose={onClose}
                            onExecutionComplete={onExecutionComplete}
                        />
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-full max-w-3xl h-[90dvh] p-0 gap-0 overflow-hidden flex flex-col">
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
