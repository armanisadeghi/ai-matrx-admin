"use client";

import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PromptRunnerModalProps } from "../../types/modal";
import { PromptRunner } from "./PromptRunner";

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
}: PromptRunnerModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent 
                className="w-full max-w-3xl h-[95vh] p-0 gap-0 overflow-hidden"
            >
                <PromptRunner
                    promptId={promptId}
                    promptData={promptData}
                    executionConfig={executionConfig}
                    variables={variables}
                    initialMessage={initialMessage}
                    onExecutionComplete={onExecutionComplete}
                    title={title}
                    runId={runId}
                    onClose={onClose}
                    isActive={isOpen}
                />
            </DialogContent>
        </Dialog>
    );
}
