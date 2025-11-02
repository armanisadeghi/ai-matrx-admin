import React, { useState } from "react";
import { PromptInput } from "./PromptInput";
import { PromptVariable } from "@/features/prompts/types/core";
import { VariableCustomComponent, VariableComponentType } from "@/features/prompts/types/core";
import type { Resource } from "./resource-display";

// Extended variable type with optional custom component
export interface ExtendedPromptVariable extends PromptVariable {
    customComponent?: VariableCustomComponent;
}

interface PromptRunnerInputProps {
    variableDefaults: ExtendedPromptVariable[];
    onVariableValueChange: (variableName: string, value: string) => void;
    expandedVariable: string | null;
    onExpandedVariableChange: (variable: string | null) => void;
    chatInput: string;
    onChatInputChange: (value: string) => void;
    onSendMessage: () => void;
    isTestingPrompt: boolean;
    showVariables: boolean; // Controls whether variables are visible
    messages: Array<{ role: string; content: string }>;
    
    // Resource management
    resources?: Resource[];
    onResourcesChange?: (resources: Resource[]) => void;
    enablePasteImages?: boolean;
}

/**
 * PromptRunnerInput - Wrapper component for running prompts in the modal
 * This is a convenience wrapper around the unified PromptInput component
 * configured for the runner/modal context with blue button and no extra features
 */
export function PromptRunnerInput({
    variableDefaults,
    onVariableValueChange,
    expandedVariable,
    onExpandedVariableChange,
    chatInput,
    onChatInputChange,
    onSendMessage,
    isTestingPrompt,
    showVariables,
    messages,
    resources,
    onResourcesChange,
    enablePasteImages,
}: PromptRunnerInputProps) {
    const [submitOnEnter, setSubmitOnEnter] = useState(true);

    // Dynamic placeholder based on showVariables
    const placeholder = showVariables ? "Add optional message..." : "Type your message...";

    return (
        <PromptInput
            variableDefaults={variableDefaults}
            onVariableValueChange={onVariableValueChange}
            expandedVariable={expandedVariable}
            onExpandedVariableChange={onExpandedVariableChange}
            chatInput={chatInput}
            onChatInputChange={onChatInputChange}
            onSendMessage={onSendMessage}
            isTestingPrompt={isTestingPrompt}
            submitOnEnter={submitOnEnter}
            onSubmitOnEnterChange={setSubmitOnEnter}
            messages={messages}
            showVariables={showVariables}
            showAutoClear={false}
            showAttachments={false}
            placeholder={placeholder}
            sendButtonVariant="blue"
            showShiftEnterHint={false}
            resources={resources}
            onResourcesChange={onResourcesChange}
            enablePasteImages={enablePasteImages}
        />
    );
}
