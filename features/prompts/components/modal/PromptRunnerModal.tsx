"use client";

import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PromptRunnerModalProps } from "../../types/modal";
import { PromptRunner } from "./PromptRunner";

/**
 * PromptRunnerModal - A modal wrapper for the PromptRunner component
 * 
 * This is a thin wrapper that displays the PromptRunner in a Dialog/Modal.
 * For direct embedding in sheets or other containers, use PromptRunner directly.
 * 
 * Supports multiple execution modes:
 * - auto-run: Automatically executes with pre-filled variables, allows conversation
 * - auto-run-one-shot: Automatically executes, no follow-up conversation
 * - manual-with-hidden-variables: User adds instructions, variables hidden
 * - manual-with-visible-variables: User can edit variables
 * - manual: Standard prompt runner (default)
 */
export function PromptRunnerModal({
    isOpen,
    onClose,
    promptId,
    promptData,
    executionConfig,
    mode = 'manual',
    variables,
    initialMessage,
    onExecutionComplete,
    title,
    runId,
}: PromptRunnerModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent 
                className="max-w-[95vw] w-full h-[95vh] p-0 gap-0 overflow-hidden"
            >
                <PromptRunner
                    promptId={promptId}
                    promptData={promptData}
                    executionConfig={executionConfig}
                    mode={mode}
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
