import React, { RefObject } from "react";
import { PromptMessage } from "@/components/prompt-builder/hooks/usePrompts";
import { ModelConfiguration } from "./configuration/ModelConfiguration";
import { VariablesManager } from "./configuration/VariablesManager";
import { ToolsManager } from "./configuration/ToolsManager";
import { SystemMessage } from "./configuration/SystemMessage";
import { PromptMessages } from "./PromptMessages";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";

interface ModelConfig {
    output_format?: string;
    tool_choice?: string;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    top_k?: number;
    store?: boolean;
    stream?: boolean;
    parallel_tool_calls?: boolean;
    tools?: string[]; // Array of selected tool names
    image_urls?: boolean;
    file_urls?: boolean;
    internal_web_search?: boolean;
    youtube_videos?: boolean;
    reasoning_effort?: string;
    verbosity?: string;
    reasoning_summary?: string;
}

interface PromptBuilderLeftPanelProps {
    // Model
    models: any[];
    model: string;
    onModelChange: (value: string) => void;
    modelConfig: ModelConfig;
    onSettingsClick: () => void;

    // Variables
    variables: string[];
    newVariableName: string;
    onNewVariableNameChange: (value: string) => void;
    isAddingVariable: boolean;
    onIsAddingVariableChange: (value: boolean) => void;
    onAddVariable: () => void;
    onRemoveVariable: (variable: string) => void;

    // Tools
    selectedTools: string[];
    availableTools: string[];
    isAddingTool: boolean;
    onIsAddingToolChange: (value: boolean) => void;
    onAddTool: (tool: string) => void;
    onRemoveTool: (tool: string) => void;
    modelSupportsTools: boolean;

    // System Message
    developerMessage: string;
    onDeveloperMessageChange: (value: string) => void;
    onDeveloperMessageClear: () => void;
    systemMessageVariablePopoverOpen: boolean;
    onSystemMessageVariablePopoverOpenChange: (open: boolean) => void;
    onInsertVariableIntoSystemMessage: (variable: string) => void;
    isEditingSystemMessage: boolean;
    onIsEditingSystemMessageChange: (isEditing: boolean) => void;

    // Messages
    messages: PromptMessage[];
    editingMessageIndex: number | null;
    onEditingMessageIndexChange: (index: number | null) => void;
    variablePopoverOpen: number | null;
    onVariablePopoverOpenChange: (index: number | null) => void;
    onMessageRoleChange: (index: number, role: string) => void;
    onMessageContentChange: (index: number, content: string) => void;
    onClearMessage: (index: number) => void;
    onDeleteMessage: (index: number) => void;
    onInsertVariable: (messageIndex: number, variable: string) => void;
    onAddMessage: () => void;
    textareaRefs: RefObject<Record<number, HTMLTextAreaElement | null>>;
    cursorPositions: Record<number, number>;
    onCursorPositionChange: (positions: Record<number, number>) => void;
    onOpenFullScreenEditor?: (messageIndex: number) => void;
}

export function PromptBuilderLeftPanel({
    models,
    model,
    onModelChange,
    modelConfig,
    onSettingsClick,
    variables,
    newVariableName,
    onNewVariableNameChange,
    isAddingVariable,
    onIsAddingVariableChange,
    onAddVariable,
    onRemoveVariable,
    selectedTools,
    availableTools,
    isAddingTool,
    onIsAddingToolChange,
    onAddTool,
    onRemoveTool,
    modelSupportsTools,
    developerMessage,
    onDeveloperMessageChange,
    onDeveloperMessageClear,
    systemMessageVariablePopoverOpen,
    onSystemMessageVariablePopoverOpenChange,
    onInsertVariableIntoSystemMessage,
    isEditingSystemMessage,
    onIsEditingSystemMessageChange,
    messages,
    editingMessageIndex,
    onEditingMessageIndexChange,
    variablePopoverOpen,
    onVariablePopoverOpenChange,
    onMessageRoleChange,
    onMessageContentChange,
    onClearMessage,
    onDeleteMessage,
    onInsertVariable,
    onAddMessage,
    textareaRefs,
    cursorPositions,
    onCursorPositionChange,
    onOpenFullScreenEditor,
}: PromptBuilderLeftPanelProps) {
    return (
        <div className="w-1/2 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
            <div className="flex-1 overflow-y-auto pl-2 pr-1 space-y-3" style={{ scrollbarGutter: "stable" }}>
                {/* Model Configuration */}
                <ModelConfiguration
                    models={models}
                    model={model}
                    onModelChange={onModelChange}
                    modelConfig={modelConfig}
                    onSettingsClick={onSettingsClick}
                />
                {/* Variables */}
                <VariablesManager
                    variables={variables}
                    newVariableName={newVariableName}
                    onNewVariableNameChange={onNewVariableNameChange}
                    isAddingVariable={isAddingVariable}
                    onIsAddingVariableChange={onIsAddingVariableChange}
                    onAddVariable={onAddVariable}
                    onRemoveVariable={onRemoveVariable}
                />
                {/* Tools */}
                <ToolsManager
                    selectedTools={selectedTools}
                    availableTools={availableTools}
                    isAddingTool={isAddingTool}
                    onIsAddingToolChange={onIsAddingToolChange}
                    onAddTool={onAddTool}
                    onRemoveTool={onRemoveTool}
                    modelSupportsTools={modelSupportsTools}
                />
                {/* System Message */}
                <SystemMessage
                    developerMessage={developerMessage}
                    onDeveloperMessageChange={onDeveloperMessageChange}
                    onDeveloperMessageClear={onDeveloperMessageClear}
                    variables={variables}
                    variablePopoverOpen={systemMessageVariablePopoverOpen}
                    onVariablePopoverOpenChange={onSystemMessageVariablePopoverOpenChange}
                    onInsertVariable={onInsertVariableIntoSystemMessage}
                    textareaRefs={textareaRefs}
                    cursorPositions={cursorPositions}
                    onCursorPositionChange={onCursorPositionChange}
                    isEditing={isEditingSystemMessage}
                    onIsEditingChange={onIsEditingSystemMessageChange}
                    onOpenFullScreenEditor={onOpenFullScreenEditor ? () => onOpenFullScreenEditor(-1) : undefined}
                />
                {/* Prompt Messages */}
                <PromptMessages
                    messages={messages}
                    editingMessageIndex={editingMessageIndex}
                    onEditingMessageIndexChange={onEditingMessageIndexChange}
                    variablePopoverOpen={variablePopoverOpen}
                    onVariablePopoverOpenChange={onVariablePopoverOpenChange}
                    onMessageRoleChange={onMessageRoleChange}
                    onMessageContentChange={onMessageContentChange}
                    onClearMessage={onClearMessage}
                    onDeleteMessage={onDeleteMessage}
                    onInsertVariable={onInsertVariable}
                    onAddMessage={onAddMessage}
                    textareaRefs={textareaRefs}
                    cursorPositions={cursorPositions}
                    onCursorPositionChange={onCursorPositionChange}
                    variables={variables}
                    onOpenFullScreenEditor={onOpenFullScreenEditor}
                />{" "}
            </div>

            {/* Fixed Add Message Button at Bottom */}
            <div className="p-4 pt-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onAddMessage}
                    className="w-full text-gray-400 hover:text-gray-300 border border-dashed border-gray-600 hover:border-gray-500"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add message
                </Button>
            </div>
        </div>
    );
}
