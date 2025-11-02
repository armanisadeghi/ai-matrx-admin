import React, { RefObject } from "react";
import { PromptMessage, PromptModelConfig, PromptVariable } from "@/features/prompts/types/core";
import { ModelConfiguration } from "./configuration/ModelConfiguration";
import { VariablesManager } from "./configuration/VariablesManager";
import { ToolsManager } from "./configuration/ToolsManager";
import { SystemMessage } from "./configuration/SystemMessage";
import { PromptMessages } from "./PromptMessages";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { VariableCustomComponent } from "@/features/prompts/types/core";


interface PromptBuilderLeftPanelProps {
    // Model
    models: any[];
    model: string;
    onModelChange: (value: string) => void;
    modelConfig: PromptModelConfig;
    onSettingsClick: () => void;

    // Variables - single source of truth
    variableDefaults: PromptVariable[];
    onAddVariable: (name: string, defaultValue: string, customComponent?: VariableCustomComponent) => void;
    onUpdateVariable: (name: string, defaultValue: string, customComponent?: VariableCustomComponent) => void;
    onRemoveVariable: (variableName: string) => void;

    // Tools
    selectedTools: string[];
    availableTools: string[]; // Array of tool names
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
    variableDefaults,
    onAddVariable,
    onUpdateVariable,
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
        <div className="h-full w-full border-r border-gray-200 dark:border-gray-800 bg-textured flex flex-col">
            <div className="flex-1 overflow-y-auto pl-2 pr-1 space-y-3 scrollbar-thin" style={{ scrollbarGutter: "stable" }}>
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
                    variableDefaults={variableDefaults}
                    onAddVariable={onAddVariable}
                    onUpdateVariable={onUpdateVariable}
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
                    variableDefaults={variableDefaults}
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
                    variableDefaults={variableDefaults}
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
