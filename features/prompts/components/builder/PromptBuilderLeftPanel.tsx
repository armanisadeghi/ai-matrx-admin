import React, { RefObject, useRef } from "react";
import { PromptMessage, PromptSettings, PromptVariable } from "@/features/prompts/types/core";
import { ModelConfiguration } from "../configuration/ModelConfiguration";
import { VariablesManager } from "../configuration/VariablesManager";
import { ToolsManager } from "../configuration/ToolsManager";
import { SystemMessage } from "../configuration/SystemMessage";
import { PromptMessages } from "./PromptMessages";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { VariableCustomComponent } from "@/features/prompts/types/core";


interface PromptBuilderLeftPanelProps {
    // Model
    models: any[];
    model: string;
    onModelChange: (value: string) => void;
    modelConfig: PromptSettings;
    onSettingsClick: () => void;

    // Variables - single source of truth
    variableDefaults: PromptVariable[];
    onAddVariable: (name: string, defaultValue: string, customComponent?: VariableCustomComponent, required?: boolean, helpText?: string) => void;
    onUpdateVariable: (oldName: string, newName: string, defaultValue: string, customComponent?: VariableCustomComponent, required?: boolean, helpText?: string) => void;
    onRemoveVariable: (variableName: string) => void;

    // Tools
    selectedTools: string[];
    availableTools: string[]; // Array of tool names
    isAddingTool: boolean;
    onIsAddingToolChange: (value: boolean) => void;
    onAddTool: (tool: string) => void;
    onRemoveTool: (tool: string) => void;
    modelSupportsTools: boolean;

    // Preferences
    showSettingsOnMainPage: boolean;

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
    showSettingsOnMainPage,
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
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    return (
        <div className="h-full w-full bg-textured flex flex-col overflow-x-hidden">
            <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden pl-2 pr-1 space-y-3 scrollbar-thin" 
                style={{ 
                    scrollbarGutter: "stable",
                }}
            >
                {/* Model Configuration - Always visible, but details conditionally shown */}
                <ModelConfiguration
                    models={models}
                    model={model}
                    onModelChange={onModelChange}
                    modelConfig={modelConfig}
                    onSettingsClick={onSettingsClick}
                    showSettingsDetails={showSettingsOnMainPage}
                />
                {/* Variables */}
                <VariablesManager
                    variableDefaults={variableDefaults}
                    onAddVariable={onAddVariable}
                    onUpdateVariable={onUpdateVariable}
                    onRemoveVariable={onRemoveVariable}
                    messages={messages}
                    systemMessage={developerMessage}
                />
                {/* Tools - Conditionally shown with settings */}
                {showSettingsOnMainPage && (
                    <ToolsManager
                        selectedTools={selectedTools}
                        availableTools={availableTools}
                        isAddingTool={isAddingTool}
                        onIsAddingToolChange={onIsAddingToolChange}
                        onAddTool={onAddTool}
                        onRemoveTool={onRemoveTool}
                        modelSupportsTools={modelSupportsTools}
                    />
                )}
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
                    scrollContainerRef={scrollContainerRef}
                    allMessages={messages}
                    modelConfig={modelConfig}
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
                    scrollContainerRef={scrollContainerRef}
                    systemMessage={developerMessage}
                    modelConfig={modelConfig}
                />{" "}
            </div>

            {/* Fixed Add Message Button at Bottom */}
            <div className="p-4 pt-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onAddMessage}
                    className="w-full text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-border"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add message
                </Button>
            </div>
        </div>
    );
}
