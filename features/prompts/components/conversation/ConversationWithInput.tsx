"use client";

import React, { ReactNode } from "react";
import { RemoveScroll } from "react-remove-scroll";
import { ConversationDisplay, ConversationMessage } from "./ConversationDisplay";
import { PromptRunnerInput } from "../PromptRunnerInput";
import { PromptVariable, PromptMessage } from "@/features/prompts/types/core";
import type { Resource } from "../resource-display";

export interface ConversationWithInputProps {
    /** The messages to display */
    messages: ConversationMessage[];
    
    /** Whether the assistant is currently streaming a response */
    isStreaming?: boolean;
    
    /** Custom empty state content */
    emptyState?: ReactNode;
    
    /** Additional className for the container */
    className?: string;
    
    /** Variable defaults for the input */
    variableDefaults?: PromptVariable[];
    
    /** Callback when variable value changes */
    onVariableValueChange?: (variableName: string, value: string) => void;
    
    /** Currently expanded variable */
    expandedVariable?: string | null;
    
    /** Callback when expanded variable changes */
    onExpandedVariableChange?: (variableName: string | null) => void;
    
    /** Chat input value */
    chatInput?: string;
    
    /** Callback when chat input changes */
    onChatInputChange?: (value: string) => void;
    
    /** Callback when send message is triggered */
    onSendMessage?: () => void;
    
    /** Whether variables should be shown */
    showVariables?: boolean;
    
    /** Template messages for the prompt */
    templateMessages?: PromptMessage[];
    
    /** Resources attached to the input */
    resources?: Resource[];
    
    /** Callback when resources change */
    onResourcesChange?: (resources: Resource[]) => void;
    
    /** Enable paste images functionality */
    enablePasteImages?: boolean;
    
    /** Whether to hide the input (e.g., for auto-run one-shot mode) */
    hideInput?: boolean;
    
    /** Enable auto-scrolling during streaming */
    enableAutoScroll?: boolean;
    
    /** Prevent body scroll when this component is active (default: false) */
    lockBodyScroll?: boolean;
}

/**
 * ConversationWithInput - Complete conversation display with fixed input at bottom
 * 
 * Combines ConversationDisplay with PromptRunnerInput in a layered layout:
 * - Back layer: Scrollable messages area
 * - Front layer: Fixed input at bottom (with backdrop)
 * 
 * This is the full pattern used in PromptRunner and can be reused anywhere
 * you need a complete conversation interface with input.
 * 
 * For just the messages display without input, use ConversationDisplay instead.
 */
export function ConversationWithInput({
    messages,
    isStreaming = false,
    emptyState,
    className = "",
    variableDefaults = [],
    onVariableValueChange,
    expandedVariable = null,
    onExpandedVariableChange,
    chatInput = "",
    onChatInputChange,
    onSendMessage,
    showVariables = false,
    templateMessages = [],
    resources = [],
    onResourcesChange,
    enablePasteImages = true,
    hideInput = false,
    enableAutoScroll = true,
    lockBodyScroll = false,
}: ConversationWithInputProps) {
    const content = (
        <div className={`h-full w-full overflow-hidden relative ${className}`}>
            {/* Back Layer: Messages Area - Scrollable */}
            <ConversationDisplay
                messages={messages}
                isStreaming={isStreaming}
                emptyState={emptyState}
                bottomPadding="240px"
                enableAutoScroll={enableAutoScroll}
            />
            
            {/* Front Layer: Input Area - Fixed at bottom */}
            {!hideInput && (
                <div className="absolute bottom-0 left-0 right-0 z-10 bg-textured pt-2 pb-4 px-2 pointer-events-none">
                    <div className="pointer-events-auto max-w-[800px] mx-auto rounded-xl">
                        <PromptRunnerInput
                            variableDefaults={variableDefaults}
                            onVariableValueChange={onVariableValueChange}
                            expandedVariable={expandedVariable}
                            onExpandedVariableChange={onExpandedVariableChange}
                            chatInput={chatInput}
                            onChatInputChange={onChatInputChange}
                            onSendMessage={onSendMessage}
                            isTestingPrompt={isStreaming}
                            showVariables={showVariables}
                            messages={templateMessages}
                            resources={resources}
                            onResourcesChange={onResourcesChange}
                            enablePasteImages={enablePasteImages}
                        />
                    </div>
                </div>
            )}
        </div>
    );
    
    // Optionally wrap with RemoveScroll to prevent body scrolling
    if (lockBodyScroll) {
        return (
            <RemoveScroll enabled={true} allowPinchZoom>
                {content}
            </RemoveScroll>
        );
    }
    
    return content;
}

