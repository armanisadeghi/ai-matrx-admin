import React from "react";
import { PromptInput } from "./PromptInput";
import { PromptVariable } from "./PromptBuilder";
import type { Resource } from "./resource-display";

interface PromptTestInputProps {
    variableDefaults: PromptVariable[];
    onVariableValueChange: (variableName: string, value: string) => void;
    expandedVariable: string | null;
    onExpandedVariableChange: (variable: string | null) => void;
    chatInput: string;
    onChatInputChange: (value: string) => void;
    onSendMessage: () => void;
    isTestingPrompt: boolean;
    submitOnEnter: boolean;
    onSubmitOnEnterChange: (value: boolean) => void;
    autoClear: boolean;
    onAutoClearChange: (value: boolean) => void;
    messages: Array<{ role: string; content: string }>;
    attachmentCapabilities?: {
        supportsImageUrls: boolean;
        supportsFileUrls: boolean;
        supportsYoutubeVideos: boolean;
    };
    showVariables?: boolean;
    
    // Resource management
    resources?: Resource[];
    onResourcesChange?: (resources: Resource[]) => void;
    enablePasteImages?: boolean;
}

/**
 * PromptTestInput - Wrapper component for testing prompts with full features
 * This is a convenience wrapper around the unified PromptInput component
 * configured for the test/builder context with attachments and auto-clear
 */
export function PromptTestInput(props: PromptTestInputProps) {
    return (
        <PromptInput
            {...props}
            showAutoClear={true}
            showAttachments={true}
            sendButtonVariant="gray"
        />
    );
}
